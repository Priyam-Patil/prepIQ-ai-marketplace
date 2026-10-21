
"use server";

import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/prisma";
import { getDashboardAppointments } from "@/lib/dashboard-appointments.mjs";
async function getInterviewer() {
  const { userId } = await auth();

  if (!userId) return null;

  return db.user.findUnique({
    where: { clerkUserId: userId },
    select: {
      id: true,
      role: true,
      name: true,
      creditBalance: true,
    },
  });
}

export async function getDashboardData() {
  const user = await getInterviewer();

  if (!user || user.role !== "INTERVIEWER") return null;

  const now = new Date();

  const [appointments, availability, earnings, payouts] =
    await Promise.all([
      getDashboardAppointments(db, user.id),

      db.availability.findMany({
        where: {
          interviewerId: user.id,
          status: { not: "BLOCKED" },
          endTime: { gt: now },
        },
        select: {
          id: true,
          startTime: true,
          endTime: true,
          status: true,
        },
        orderBy: { startTime: "asc" },
        take: 20,
      }),

      db.creditTransaction.aggregate({
        where: {
          userId: user.id,
          type: "BOOKING_EARNING",
        },
        _sum: { amount: true },
      }),

      db.payout.findMany({
        where: { interviewerId: user.id },
        select: {
          id: true,
          credits: true,
          platformFee: true,
          netAmount: true,
          status: true,
          createdAt: true,
        },
        orderBy: { createdAt: "desc" },
        take: 10,
      }),
    ]);

  return {
    user: {
      id: user.id,
      name: user.name,
      creditBalance: user.creditBalance,
    },

    appointments,

    availability,
    earnedCredits: earnings._sum.amount ?? 0,
    payouts,
  };
}

export async function createAvailabilityWindow(input) {
  const user = await getInterviewer();

  if (!user || user.role !== "INTERVIEWER") {
    return {
      success: false,
      error: "Only interviewers can manage availability.",
    };
  }

  const startTime = input?.startTime;
  const endTime = input?.endTime;

  if (
    typeof startTime !== "string" ||
    typeof endTime !== "string"
  ) {
    return {
      success: false,
      error: "Choose a valid future time range.",
    };
  }

  const start = new Date(startTime);
  const end = new Date(endTime);

  if (
    !Number.isFinite(start.getTime()) ||
    !Number.isFinite(end.getTime()) ||
    start <= new Date() ||
    end <= start
  ) {
    return {
      success: false,
      error: "Choose a valid future time range.",
    };
  }

  if (end.getTime() - start.getTime() < 45 * 60_000) {
    return {
      success: false,
      error: "Availability must fit at least one 45-minute session.",
    };
  }

  try {
    const result = await db.$transaction(
      async (tx) => {
        const [overlap, booking] = await Promise.all([
          tx.availability.findFirst({
            where: {
              interviewerId: user.id,
              status: { not: "BLOCKED" },
              startTime: { lt: end },
              endTime: { gt: start },
            },
            select: { id: true },
          }),

          tx.booking.findFirst({
            where: {
              interviewerId: user.id,
              status: "SCHEDULED",
              startTime: { lt: end },
              endTime: { gt: start },
            },
            select: { id: true },
          }),
        ]);

        if (overlap || booking) {
          return {
            error:
              "That time overlaps existing availability or a booking.",
          };
        }

        const availability = await tx.availability.create({
          data: {
            interviewerId: user.id,
            startTime: start,
            endTime: end,
          },
          select: {
            id: true,
            startTime: true,
            endTime: true,
            status: true,
          },
        });

        return { availability };
      },
      { isolationLevel: "Serializable" }
    );

    if (result.error) {
      return { success: false, error: result.error };
    }

    return {
      success: true,
      availability: result.availability,
    };
  } catch (error) {
    console.error("Availability creation failed:", error);

    return {
      success: false,
      error:
        "Could not save availability. Refresh and try again.",
    };
  }
}

export async function removeAvailabilityWindow(availabilityId) {
  const user = await getInterviewer();

  if (!user || user.role !== "INTERVIEWER") {
    return {
      success: false,
      error: "Only interviewers can manage availability.",
    };
  }

  if (
    typeof availabilityId !== "string" ||
    !availabilityId.trim() ||
    availabilityId.length > 64
  ) {
    return {
      success: false,
      error: "Availability was not found.",
    };
  }

  try {
    const result = await db.$transaction(
      async (tx) => {
        const window = await tx.availability.findFirst({
          where: {
            id: availabilityId,
            interviewerId: user.id,
            status: { not: "BLOCKED" },
          },
          select: {
            id: true,
            startTime: true,
            endTime: true,
          },
        });

        if (!window) {
          return { error: "Availability was not found." };
        }

        const booking = await tx.booking.findFirst({
          where: {
            interviewerId: user.id,
            status: "SCHEDULED",
            startTime: { lt: window.endTime },
            endTime: { gt: window.startTime },
          },
          select: { id: true },
        });

        if (booking) {
          return {
            error: "This window contains a booking and cannot be removed.",
          };
        }

        await tx.availability.update({
          where: { id: window.id },
          data: { status: "BLOCKED" },
        });

        return { success: true };
      },
      { isolationLevel: "Serializable" }
    );

    if (result.error) {
      return { success: false, error: result.error };
    }

    return { success: true };
  } catch (error) {
    console.error("Availability removal failed:", error);

    return {
      success: false,
      error:
        "Could not update the schedule. Refresh and try again.",
    };
  }
}
