
import { auth } from "@clerk/nextjs/server";
import { connection } from "next/server";
import { db } from "@/lib/prisma";
import PricingSection from "@/components/PricingSection";

export default async function PricingSectionWithRole() {
  await connection();

  let role = null;
  let currentPlan = "free";

  try {
    const { userId } = await auth();

    if (userId) {
      const user = await db.user.findUnique({
        where: { clerkUserId: userId },
        select: {
          role: true,
          currentPlan: true,
        },
      });

      role = user?.role ?? null;
      currentPlan = user?.currentPlan ?? "free";
    }
  } catch (error) {
    console.error(
      "PricingSectionWithRole error:",
      error instanceof Error ? error.message : error
    );
  }

  return (
    <PricingSection
      role={role}
      currentPlan={currentPlan}
    />
  );
}
