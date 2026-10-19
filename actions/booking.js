"use server";

import { auth, currentUser } from "@clerk/nextjs/server";
import { db } from "@/lib/prisma";
import { getStreamServerClient } from "@/lib/stream";
import { getOpenSlotsForDay, isValidBookingInterval, SESSION_DURATION_MS } from "@/lib/booking-rules.mjs";
import { persistBookingTransaction } from "@/lib/booking-transaction.mjs";

async function getInterviewee() {
  const clerkUser = await currentUser();
  if (!clerkUser?.id) return { error: "Sign in to book a session." };

  const user = await db.user.findUnique({
    where: { clerkUserId: clerkUser.id },
    select: { id: true, role: true, credits: true },
  });

  if (!user || user.role !== "INTERVIEWEE") {
    return { error: "Only interviewees can book sessions." };
  }

  return { user };
}

export async function getInterviewerProfile(interviewerId) {
  const { user, error } = await getInterviewee();
  if (error) return { error };

  const interviewer = await db.user.findFirst({
    where: { id: interviewerId, role: "INTERVIEWER", id: { not: user.id } },
    select: {
      id: true,
      name: true,
      imageUrl: true,
      title: true,
      company: true,
      bio: true,
      yearsExp: true,
      categories: true,
      creditRate: true,
      availabilities: {
        where: { status: "AVAILABLE", endTime: { gt: new Date() } },
        select: { startTime: true, endTime: true },
        orderBy: { startTime: "asc" },
      },
    },
  });

  return { interviewer };
}

export async function getOpenSlots(interviewerId, dayStartValue, dayEndValue) {
  const { user, error } = await getInterviewee();
  if (error) return { error };
  const dayStart = new Date(dayStartValue);
  const dayEnd = new Date(dayEndValue);
  if (
    !Number.isFinite(dayStart.getTime()) ||
    !Number.isFinite(dayEnd.getTime()) ||
    dayEnd <= dayStart ||
    dayEnd.getTime() - dayStart.getTime() > 25 * 60 * 60_000
  ) {
    return { error: "Choose a valid date." };
  }
  const now = new Date();

  const interviewer = await db.user.findFirst({
    where: { id: interviewerId, role: "INTERVIEWER", clerkUserId: { not: user.id } },
    select: { id: true },
  });
  if (!interviewer) return { error: "This interviewer is unavailable." };

  const [availability, bookings] = await Promise.all([
    db.availability.findMany({
      where: {
        interviewerId,
        status: "AVAILABLE",
        startTime: { lt: dayEnd },
        endTime: { gt: dayStart },
      },
      select: { startTime: true, endTime: true },
      orderBy: { startTime: "asc" },
    }),
    db.booking.findMany({
      where: {
        interviewerId,
        status: "SCHEDULED",
        startTime: { lt: dayEnd },
        endTime: { gt: dayStart },
      },
      select: { startTime: true, endTime: true },
    }),
  ]);

  return { slots: getOpenSlotsForDay({ availability, bookings, dayStart, dayEnd, now }) };
}

export async function createBooking({ interviewerId, startTime }) {
  const { user: interviewee, error } = await getInterviewee();
  if (error) return { success: false, error };

  const start = new Date(startTime);
  if (!Number.isFinite(start.getTime())) {
    return { success: false, error: "Choose a valid time slot." };
  }
  const end = new Date(start.getTime() + SESSION_DURATION_MS);
  if (start <= new Date()) return { success: false, error: "That time slot has passed." };

  const interviewer = await db.user.findFirst({
    where: { id: interviewerId, role: "INTERVIEWER", id: { not: interviewee.id } },
    select: { id: true, name: true, imageUrl: true, creditRate: true },
  });
  if (!interviewer) return { success: false, error: "This interviewer is unavailable." };
  const cost = Math.max(1, interviewer.creditRate || 1);
  if (interviewee.credits < cost) {
    return { success: false, error: "You need more credits to book this session." };
  }

  const preflightAvailability = await db.availability.findMany({
    where: {
      interviewerId: interviewer.id,
      status: "AVAILABLE",
      startTime: { lte: start },
      endTime: { gte: end },
    },
    select: { startTime: true, endTime: true },
  });
  if (!isValidBookingInterval(start, end, preflightAvailability)) {
    return { success: false, error: "Choose an available 45-minute slot." };
  }
  const preflightConflict = await db.booking.findFirst({
    where: {
      interviewerId: interviewer.id,
      status: "SCHEDULED",
      startTime: { lt: end },
      endTime: { gt: start },
    },
    select: { id: true },
  });
  if (preflightConflict) {
    return { success: false, error: "That time was just booked. Choose another slot." };
  }

  const stream = getStreamServerClient();
  if (!stream) {
    return { success: false, error: "Video calling is not configured. No credits were charged." };
  }

  const participantRecords = await db.user.findMany({
    where: { id: { in: [interviewee.id, interviewer.id] } },
    select: { id: true, name: true, imageUrl: true },
  });
  const streamCallId = crypto.randomUUID();
  const authState = await auth();
  const proPlan = authState.has({ plan: "pro" });
  let chatChannelReady = false;

  try {
    await stream.upsertUsers(
      participantRecords.map((participant) => ({
        id: participant.id,
        name: participant.name || "PrepIQ member",
        ...(participant.imageUrl ? { image: participant.imageUrl } : {}),
      })),
    );

    await stream.video.call("default", streamCallId).getOrCreate({
      data: {
        created_by_id: interviewee.id,
        members: [{ user_id: interviewee.id }, { user_id: interviewer.id }],
        starts_at: start.toISOString(),
        settings_override: {
          audio: { mic_default_on: false },
          video: { camera_default_on: false },
          recording: { mode: proPlan ? "auto-on" : "disabled" },
        },
      },
    });

    try {
      await stream.chat.channel("messaging", streamCallId).getOrCreate({
        data: {
          created_by_id: interviewee.id,
          members: [{ user_id: interviewee.id }, { user_id: interviewer.id }],
        },
      });
      chatChannelReady = true;
    } catch (chatError) {
      console.error("Stream chat channel setup failed:", chatError);
    }

    const booking = await db.$transaction(
      (tx) => persistBookingTransaction(tx, {
        intervieweeId: interviewee.id,
        interviewerId: interviewer.id,
        start,
        end,
        cost,
        streamCallId,
      }),
      { isolationLevel: "Serializable" },
    );

    return { success: true, booking };
  } catch (bookingError) {
    try {
      await stream.video.call("default", streamCallId).delete();
    } catch (cleanupError) {
      console.error("Stream call cleanup failed:", cleanupError);
    }
    if (chatChannelReady) {
      try {
        await stream.chat.channel("messaging", streamCallId).delete({ hard_delete: true });
      } catch (cleanupError) {
        console.error("Stream chat cleanup failed:", cleanupError);
      }
    }
    console.error("Booking failed:", bookingError);
    return {
      success: false,
      error: bookingError instanceof Error ? bookingError.message : "Unable to book this session.",
    };
  }
}
