
import { auth } from "@clerk/nextjs/server";
import { connection } from "next/server";
import { redirect, notFound } from "next/navigation";

import { db } from "@/lib/prisma";
import PayoutReviewClient from "./_components/PayoutReviewClient";

export const instant = false;

export default async function PayoutReviewPage({ params }) {
  await connection();
  const { userId } = await auth();

  if (!userId) {
    redirect("/sign-in");
  }

  const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();

  if (!adminEmail) {
    throw new Error("ADMIN_EMAIL is not configured.");
  }

  const admin = await db.user.findUnique({
    where: { clerkUserId: userId },
    select: { email: true },
  });

  if (
    !admin?.email ||
    admin.email.trim().toLowerCase() !== adminEmail
  ) {
    notFound();
  }

  const { id } = await params;

  if (typeof id !== "string" || !id.trim() || id.length > 64) {
    notFound();
  }

  const payout = await db.payout.findUnique({
    where: { id },
    include: {
      interviewer: {
        select: { name: true, email: true },
      },
    },
  });

  if (!payout) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-[#0a0a0b] px-6 py-12 text-stone-100">
      <div className="mx-auto flex w-full max-w-lg flex-col gap-6">
        <div className="text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-amber-400">
            PrepIQ Admin
          </p>

          <h1 className="mt-3 text-3xl font-bold tracking-tight">
            Withdrawal Review
          </h1>

          <p className="mt-2 text-sm text-stone-400">
            Review the payout details before approving.
          </p>
        </div>

        <PayoutReviewClient
          payout={{
            id: payout.id,
            credits: payout.credits,
            netAmount: payout.netAmount,
            platformFee: payout.platformFee,
            paymentMethod: payout.paymentMethod,
            paymentDetail: payout.paymentDetail,
            status: payout.status,
            interviewerName: payout.interviewer.name,
            interviewerEmail: payout.interviewer.email,
          }}
        />
      </div>
    </main>
  );
}
