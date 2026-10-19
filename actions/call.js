"use server";

import { currentUser } from "@clerk/nextjs/server";
import { db } from "@/lib/prisma";
import { getStreamServerClient } from "@/lib/stream";
import { isBookingParticipant } from "@/lib/access-control.mjs";

export async function getCallToken(bookingId) {
  const clerkUser = await currentUser();
  if (!clerkUser?.id) throw new Error("Sign in to join this session.");

  const booking = await db.booking.findUnique({
    where: { id: bookingId },
    select: {
      id: true,
      streamCallId: true,
      status: true,
      interviewee: { select: { id: true, clerkUserId: true } },
      interviewer: { select: { id: true, clerkUserId: true } },
    },
  });

  if (
    !booking ||
    !booking.streamCallId ||
    booking.status !== "SCHEDULED" ||
    !isBookingParticipant(booking, clerkUser.id)
  ) {
    throw new Error("This session is unavailable.");
  }

  const userId = booking.interviewee.clerkUserId === clerkUser.id
    ? booking.interviewee.id
    : booking.interviewer.id;
  const stream = getStreamServerClient();
  if (!stream) throw new Error("Video calling is not configured.");

  return {
    token: stream.generateCallToken({
      user_id: userId,
      call_cids: [`default:${booking.streamCallId}`],
      validity_in_seconds: 60 * 60,
    }),
  };
}

export async function getChatToken(bookingId) {
  const clerkUser = await currentUser();
  if (!clerkUser?.id) throw new Error("Sign in to open this conversation.");

  const booking = await db.booking.findUnique({
    where: { id: bookingId },
    select: {
      id: true,
      streamCallId: true,
      status: true,
      interviewee: { select: { id: true, clerkUserId: true } },
      interviewer: { select: { id: true, clerkUserId: true } },
    },
  });

  if (
    !booking ||
    !booking.streamCallId ||
    booking.status === "CANCELLED" ||
    !isBookingParticipant(booking, clerkUser.id)
  ) {
    throw new Error("This conversation is unavailable.");
  }

  const userId = booking.interviewee.clerkUserId === clerkUser.id
    ? booking.interviewee.id
    : booking.interviewer.id;
  const stream = getStreamServerClient();
  if (!stream) throw new Error("Chat is not configured.");

  return { token: stream.generateUserToken({ user_id: userId, validity_in_seconds: 60 * 60 }) };
}
