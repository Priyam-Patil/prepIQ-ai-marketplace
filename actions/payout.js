"use server";

import { auth, currentUser } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/prisma";

export async function approvePayout(input) {
  const { userId } = await auth();
  if (!userId) return { success: false, error: "Sign in to review this payout." };
  const payoutId = input?.payoutId;
  if (typeof payoutId !== "string" || !payoutId.trim() || payoutId.length > 64) {
    return { success: false, error: "Payout request not found." };
  }

  const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  if (!adminEmail) return { success: false, error: "Payout review is not configured." };

  try {
    const admin = await db.user.findUnique({
      where: { clerkUserId: userId },
      select: { email: true },
    });
    if (!admin?.email || admin.email.trim().toLowerCase() !== adminEmail) {
      return { success: false, error: "Payout request not found." };
    }

    const now = new Date();
    const result = await db.payout.updateMany({
      where: { id: payoutId, status: "PROCESSING" },
      data: { status: "PROCESSED", processedAt: now, processedBy: userId },
    });
    if (result.count !== 1) {
      const existing = await db.payout.findUnique({ where: { id: payoutId }, select: { status: true } });
      return existing?.status === "PROCESSED"
        ? { success: true, alreadyProcessed: true }
        : { success: false, error: "Payout request not found or no longer pending." };
    }

    revalidatePath(`/payout/${payoutId}`);
    revalidatePath("/dashboard");
    return { success: true };
  } catch (error) {
    console.error("Payout approval failed.", { name: error?.name || "Error", code: error?.code });
    return { success: false, error: "Payout approval failed. Please try again." };
  }
}

export async function getPayoutPageData(payoutId) {
  const clerkUser = await currentUser();
  if (!clerkUser?.id) return { error: "Sign in to view payout information." };
  if (payoutId != null && (typeof payoutId !== "string" || payoutId.length > 64)) {
    return { error: "Payout request not found." };
  }

  const user = await db.user.findUnique({
    where: { clerkUserId: clerkUser.id },
    select: { id: true, role: true, creditBalance: true },
  });
  if (!user || user.role !== "INTERVIEWER") return { error: "Payouts are available to interviewers." };

  if (!payoutId || payoutId === "new" || payoutId === user.id) {
    const payouts = await db.payout.findMany({
      where: { interviewerId: user.id },
      select: {
        id: true,
        credits: true,
        platformFee: true,
        netAmount: true,
        paymentMethod: true,
        status: true,
        adminNote: true,
        createdAt: true,
        processedAt: true,
      },
      orderBy: { createdAt: "desc" },
    });
    return { balance: user.creditBalance, payouts };
  }

  const payout = await db.payout.findFirst({
    where: { id: payoutId, interviewerId: user.id },
    select: {
      id: true,
      credits: true,
      platformFee: true,
      netAmount: true,
      paymentMethod: true,
      status: true,
      adminNote: true,
      createdAt: true,
      processedAt: true,
    },
  });
  return payout ? { payout } : { error: "Payout request not found." };
}
