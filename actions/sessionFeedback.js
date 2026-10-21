"use server";

import { auth } from "@clerk/nextjs/server";
import { notFound, redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/prisma";
import { canSubmitSessionFeedback, validateSessionFeedbackInput } from "@/lib/feedback-eligibility.mjs";

export async function submitSessionFeedback(input) {
  const { userId } = await auth();
  if (!userId) return { success: false, error: "Sign in to give feedback." };
  const validationError = validateSessionFeedbackInput(input);
  if (validationError) return { success: false, error: validationError };
  if (typeof input.bookingId !== "string" || !input.bookingId.trim() || input.bookingId.length > 64) {
    return { success: false, error: "This booking is unavailable." };
  }

  const booking = await db.booking.findUnique({
    where: { id: input.bookingId },
    select: {
      id: true,
      status: true,
      endTime: true,
      interviewee: { select: { id: true, clerkUserId: true } },
      sessionFeedback: { select: { id: true } },
    },
  });
  if (!booking || booking.interviewee.clerkUserId !== userId) {
    return { success: false, error: "This booking is unavailable." };
  }
  if (!canSubmitSessionFeedback(booking, userId)) {
    return {
      success: false,
      error: booking.sessionFeedback
        ? "Feedback has already been submitted."
        : booking.status === "CANCELLED"
          ? "Feedback is not available for a cancelled interview."
          : "Feedback will be available after the scheduled interview ends.",
    };
  }

  try {
    await db.sessionFeedback.create({
      data: {
        bookingId: booking.id,
        intervieweeId: booking.interviewee.id,
        rating: input.rating,
        comment: input.comment?.trim() || null,
      },
    });
    revalidatePath("/appointments");
    revalidatePath(`/feedback/${booking.id}`);
    return { success: true };
  } catch (error) {
    if (error?.code === "P2002") {
      return { success: false, error: "Feedback has already been submitted." };
    }
    console.error("Session feedback save failed.", { name: error?.name || "Error", code: error?.code });
    return { success: false, error: "Feedback could not be saved. Please try again." };
  }
}

export async function getSessionFeedbackPage(bookingId) {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");
  if (typeof bookingId !== "string" || !bookingId.trim() || bookingId.length > 64) notFound();

  const booking = await db.booking.findUnique({
    where: { id: bookingId },
    select: {
      id: true,
      status: true,
      endTime: true,
      sessionFeedback: { select: { id: true, rating: true, comment: true } },
      interviewee: { select: { id: true, clerkUserId: true } },
      interviewer: { select: { name: true } },
    },
  });
  if (!booking || booking.interviewee.clerkUserId !== userId) notFound();
  return { booking, eligible: canSubmitSessionFeedback(booking, userId) };
}
