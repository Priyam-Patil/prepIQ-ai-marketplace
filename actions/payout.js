"use server";

import { currentUser } from "@clerk/nextjs/server";
import { db } from "@/lib/prisma";

export async function getPayoutPageData(payoutId) {
  const clerkUser = await currentUser();
  if (!clerkUser?.id) return { error: "Sign in to view payout information." };

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
