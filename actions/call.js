"use server";

import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/prisma";
import { getStreamServerClient } from "@/lib/stream";
import { isBookingParticipant } from "@/lib/access-control.mjs";
import { issueVideoTokenForBooking } from "@/lib/session-access.mjs";
import { getSafeStreamErrorDetails } from "@/lib/stream-error.mjs";

async function getAuthorizedBooking(bookingId, clerkUserId) {
  if (!bookingId || typeof bookingId !== "string") {
    throw new Error("Invalid session.");
  }

  const booking = await db.booking.findUnique({
    where: { id: bookingId },
    select: {
      id: true,
      streamCallId: true,
      status: true,
      startTime: true,
      endTime: true,
      interviewee: {
        select: { id: true, clerkUserId: true },
      },
      interviewer: {
        select: { id: true, clerkUserId: true },
      },
    },
  });

  if (
    !booking ||
    !booking.streamCallId ||
    !isBookingParticipant(booking, clerkUserId)
  ) {
    throw new Error("This session is unavailable.");
  }

  return booking;
}

function getStreamUserId(booking, clerkUserId) {
  if (booking.interviewee.clerkUserId === clerkUserId) {
    return booking.interviewee.id;
  }

  if (booking.interviewer.clerkUserId === clerkUserId) {
    return booking.interviewer.id;
  }

  throw new Error("You are not allowed to join this session.");
}

export async function getCallToken(bookingId) {
  const { userId } = await auth();

  if (!userId) {
    throw new Error("Sign in to join this session.");
  }

  const booking = await getAuthorizedBooking(bookingId, userId);
  const now = Date.now();
  const stream = getStreamServerClient();

  if (!stream) {
    throw new Error("Video calling is not configured.");
  }

  try {
    return {
      token: issueVideoTokenForBooking(booking, userId, stream, now),
    };
  } catch (error) {
    if ([
      "This session is unavailable.",
      "This session is not currently scheduled.",
      "Your session has not started yet.",
      "This session has ended.",
    ].includes(error?.message)) throw error;
    console.error(
      "Stream video token generation failed.",
      getSafeStreamErrorDetails(error)
    );
    throw new Error("Unable to authorize this video session.");
  }
}

export async function getChatToken(bookingId) {
  const { userId } = await auth();

  if (!userId) {
    throw new Error("Sign in to open this conversation.");
  }

  const booking = await getAuthorizedBooking(bookingId, userId);

  if (booking.status === "CANCELLED") {
    throw new Error("This conversation is unavailable.");
  }

  const stream = getStreamServerClient();

  if (!stream) {
    throw new Error("Chat is not configured.");
  }

  const streamUserId = getStreamUserId(booking, userId);

  try {
    return {
      token: stream.generateUserToken({
        user_id: streamUserId,
        validity_in_seconds: 3600,
      }),
    };
  } catch (error) {
    console.error("Stream chat token generation failed.", error?.name || "Error");
    throw new Error("Unable to authorize this session chat.");
  }
}
