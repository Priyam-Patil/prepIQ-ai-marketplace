
"use server";

import { auth, currentUser } from "@clerk/nextjs/server";
import { request } from "@arcjet/next";
import { db } from "@/lib/prisma";
import { getStreamServerClient } from "@/lib/stream";
import {
  getOpenSlotsForDay,
  isValidBookingInterval,
  SESSION_DURATION_MS,
} from "@/lib/booking-rules.mjs";
import { persistBookingTransaction } from "@/lib/booking-transaction.mjs";
import { processEmailNotifications } from "@/lib/email-service";
import { buildBookingNotifications } from "@/lib/email-notifications.mjs";
import {
  bookingRateLimiter,
  checkRateLimit,
} from "@/lib/arcjet";

// Authenticate the user and ensure they are an interviewee.
async function getInterviewee() {
  const clerkUser = await currentUser();

  if (!clerkUser?.id) {
    return { error: "Sign in to book a session." };
  }

  const user = await db.user.findUnique({
    where: { clerkUserId: clerkUser.id },
    select: {
      id: true,
      role: true,
      credits: true,
    },
  });

  if (!user || user.role !== "INTERVIEWEE") {
    return { error: "Only interviewees can book sessions." };
  }

  return {
    user,
    clerkUserId: clerkUser.id,
  };
}

export async function getInterviewerProfile(interviewerId) {
  const { user, error } = await getInterviewee();

  if (error) return { error };
  if (typeof interviewerId !== "string" || !interviewerId.trim() || interviewerId.length > 64) {
    return { error: "This interviewer is unavailable." };
  }

  const interviewer = await db.user.findFirst({
    where: {
      id: interviewerId,
      role: "INTERVIEWER",
      NOT: { id: user.id },
    },
    select: {
      id: true,
      name: true,
      imageUrl: true,
      email: true,
      title: true,
      company: true,
      bio: true,
      yearsExp: true,
      categories: true,
      creditRate: true,
      availabilities: {
        where: {
          status: "AVAILABLE",
          endTime: { gt: new Date() },
        },
        select: {
          startTime: true,
          endTime: true,
        },
        orderBy: {
          startTime: "asc",
        },
      },
    },
  });

  return { interviewer: interviewer ?? null };
}

export async function getOpenSlots(
  interviewerId,
  dayStartValue,
  dayEndValue
) {
  const { user, error } = await getInterviewee();

  if (error) return { error };
  if (typeof interviewerId !== "string" || !interviewerId.trim() || interviewerId.length > 64) {
    return { error: "This interviewer is unavailable." };
  }

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

  const interviewer = await db.user.findFirst({
    where: {
      id: interviewerId,
      role: "INTERVIEWER",
      NOT: { id: user.id },
    },
    select: { id: true },
  });

  if (!interviewer) {
    return { error: "This interviewer is unavailable." };
  }

  const now = new Date();

  const [availability, bookings] = await Promise.all([
    db.availability.findMany({
      where: {
        interviewerId,
        status: "AVAILABLE",
        startTime: { lt: dayEnd },
        endTime: { gt: dayStart },
      },
      select: {
        startTime: true,
        endTime: true,
      },
      orderBy: {
        startTime: "asc",
      },
    }),

    db.booking.findMany({
      where: {
        interviewerId,
        status: "SCHEDULED",
        startTime: { lt: dayEnd },
        endTime: { gt: dayStart },
      },
      select: {
        startTime: true,
        endTime: true,
      },
    }),
  ]);

  return {
    slots: getOpenSlotsForDay({
      availability,
      bookings,
      dayStart,
      dayEnd,
      now,
    }),
  };
}

export async function createBooking(input) {
  // 1. Authenticate and authorize.
  const { user: interviewee, clerkUserId, error } =
    await getInterviewee();

  if (error) {
    return { success: false, error };
  }

  const interviewerId = input && typeof input === "object" ? input.interviewerId : null;
  const startTime = input && typeof input === "object" ? input.startTime : null;
  const category = input && typeof input === "object" ? input.category : null;
  if (typeof interviewerId !== "string" || !interviewerId.trim() || interviewerId.length > 64 || typeof startTime !== "string" || typeof category !== "string") {
    return { success: false, error: "Choose a valid interviewer and time slot." };
  }

  // 2. Protect booking attempts with Arcjet.
  if (!process.env.ARCJET_KEY) {
    return {
      success: false,
      error: "Booking protection is not configured.",
    };
  }

  try {
    const req = await request();

    const rateLimitError = await checkRateLimit(
      bookingRateLimiter,
      req,
      clerkUserId
    );

    if (rateLimitError) {
      return {
        success: false,
        error: rateLimitError,
      };
    }
  } catch (rateLimitFailure) {
    console.error("Booking rate-limit check failed.", rateLimitFailure?.name || "Error");

    // Fail closed if rate limiting cannot be verified.
    return {
      success: false,
      error: "Unable to verify your request. Please try again.",
    };
  }

  // 3. Validate the requested time.
  const start = new Date(startTime);

  if (!Number.isFinite(start.getTime())) {
    return {
      success: false,
      error: "Choose a valid time slot.",
    };
  }

  if (start <= new Date()) {
    return {
      success: false,
      error: "That time slot has passed.",
    };
  }

  const end = new Date(
    start.getTime() + SESSION_DURATION_MS
  );

  // 4. Verify the interviewer.
  const interviewer = await db.user.findFirst({
    where: {
      id: interviewerId,
      role: "INTERVIEWER",
      NOT: { id: interviewee.id },
    },
    select: {
      id: true,
      name: true,
      imageUrl: true,
      creditRate: true,
      categories: true,
    },
  });

  if (!interviewer) {
    return {
      success: false,
      error: "This interviewer is unavailable.",
    };
  }

  if (!interviewer.categories.includes(category)) {
    return { success: false, error: "Choose an interview category this interviewer supports." };
  }

  // 5. Check the interviewee's available credits.
  const cost = Math.max(1, interviewer.creditRate || 1);

  if (interviewee.credits < cost) {
    return {
      success: false,
      error: "You need more credits to book this session.",
    };
  }

  // 6. Verify availability for the complete 45-minute session.
  const preflightAvailability = await db.availability.findMany({
    where: {
      interviewerId: interviewer.id,
      status: "AVAILABLE",
      startTime: { lte: start },
      endTime: { gte: end },
    },
    select: {
      startTime: true,
      endTime: true,
    },
  });

  if (!isValidBookingInterval(start, end, preflightAvailability)) {
    return {
      success: false,
      error: "Choose an available 45-minute slot.",
    };
  }

  // 7. Check for an overlapping scheduled booking.
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
    return {
      success: false,
      error: "That time was just booked. Choose another slot.",
    };
  }

  const intervieweeConflict = await db.booking.findFirst({
    where: {
      intervieweeId: interviewee.id,
      status: "SCHEDULED",
      startTime: { lt: end },
      endTime: { gt: start },
    },
    select: { id: true },
  });

  if (intervieweeConflict) {
    return {
      success: false,
      error: "You already have an interview booked during this time.",
    };
  }

  // 8. Ensure Stream is configured.
  const stream = getStreamServerClient();

  if (!stream) {
    return {
      success: false,
      error: "Video calling is not configured. No credits were charged.",
    };
  }

  // 9. Fetch both participants.
  const participants = await db.user.findMany({
    where: {
      id: { in: [interviewee.id, interviewer.id] },
    },
    select: {
      id: true,
      name: true,
      imageUrl: true,
      email: true,
    },
  });

  if (participants.length !== 2) {
    return {
      success: false,
      error: "Unable to verify booking participants.",
    };
  }

  const streamCallId = crypto.randomUUID();
  const authState = await auth();
  const proPlan = authState.has({ plan: "pro" });

  try {
    // 10. Create or update Stream users.
    await stream.upsertUsers(
      participants.map((participant) => ({
        id: participant.id,
        name: participant.name || "PrepIQ member",
        ...(participant.imageUrl
          ? { image: participant.imageUrl }
          : {}),
      }))
    );

    // 11. Create the video call.
    await stream.video.call("default", streamCallId).getOrCreate({
      data: {
        created_by_id: interviewee.id,
        members: [
          { user_id: interviewee.id },
          { user_id: interviewer.id },
        ],
        starts_at: start.toISOString(),
        settings_override: {
          audio: {
            default_device: "speaker",
            mic_default_on: false,
          },
          video: {
            camera_default_on: false,
            target_resolution: {
              width: 1280,
              height: 720,
            },
          },
          recording: {
            mode: proPlan ? "auto-on" : "disabled",
            quality: "1080p",
          },
        },
      },
    });

    // 12. Create the chat channel.
    // Chat failure does not prevent booking.
    try {
      await stream.chat
        .channel("messaging", streamCallId)
        .getOrCreate({
          data: {
            created_by_id: interviewee.id,
            members: [
              { user_id: interviewee.id },
              { user_id: interviewer.id },
            ],
          },
        });

    } catch (chatError) {
      console.error(
        "Stream chat channel setup failed.",
        chatError?.name || "Error"
      );
    }

    // 13. Atomically save the booking and deduct credits.
    // The transaction helper must re-check conflicts and balance
    // inside the transaction, not rely only on preflight checks.
    const intervieweeParticipant = participants.find((person) => person.id === interviewee.id);
    const interviewerParticipant = participants.find((person) => person.id === interviewer.id);
    const notifications = buildBookingNotifications({
      bookingId: streamCallId,
      startTime: start,
      interviewee: intervieweeParticipant,
      interviewer: interviewerParticipant,
      category,
      appUrl: process.env.NEXT_PUBLIC_APP_URL,
    });
    const booking = await db.$transaction(
      (tx) =>
        persistBookingTransaction(tx, {
          intervieweeId: interviewee.id,
          interviewerId: interviewer.id,
          start,
          end,
          cost,
          streamCallId,
          category,
          notifications,
        }),
      {
        isolationLevel: "Serializable",
      }
    );

    for (const notification of notifications.filter(({ kind }) => kind === "BOOKING_CONFIRMATION")) {
      try {
        await processEmailNotifications({ onlyKey: notification.key });
      } catch (emailError) {
        console.error("Booking email queue processing failed.", { name: emailError?.name || "Error", code: emailError?.code });
      }
    }

    return {
      success: true,
      booking,
    };
  } catch (bookingError) {
    // 14. Clean up Stream resources if booking persistence fails.
    try {
      await stream.video
        .call("default", streamCallId)
        .delete();
    } catch (cleanupError) {
      console.error(
        "Stream call cleanup failed.",
        cleanupError?.name || "Error"
      );
    }

    try {
      await stream.chat
        .channel("messaging", streamCallId)
        .delete({ hard_delete: true });
    } catch (cleanupError) {
      console.error(
        "Stream chat cleanup failed.",
        cleanupError?.name || "Error"
      );
    }

    console.error("Booking failed.", bookingError?.name || "Error");

    return {
      success: false,
      error: [
        "Choose an available 45-minute slot.",
        "That time was just booked. Choose another slot.",
        "Your credit balance changed. Refresh and try again.",
      ].includes(bookingError?.message)
        ? bookingError.message
        : "Unable to book this session. Please refresh and try again.",
    };
  }
}
