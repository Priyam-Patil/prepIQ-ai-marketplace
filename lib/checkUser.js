import { db } from "@/lib/prisma";
import { allocatePlanCreditsOnce } from "@/lib/credit-allocation.mjs";
import { PLAN_CREDITS } from "@/lib/billing-plans.mjs";

function shouldAllocateCredits(dbUser, currentPlan) {
  if (dbUser.currentPlan !== currentPlan) {
    return true;
  }

  if (!dbUser.creditsLastAllocatedAt) {
    return true;
  }

  const now = new Date();
  const last = new Date(dbUser.creditsLastAllocatedAt);

  return (
    now.getFullYear() > last.getFullYear() ||
    (now.getFullYear() === last.getFullYear() &&
      now.getMonth() > last.getMonth())
  );
}

export async function checkUser(clerkUser) {
  try {
    if (!clerkUser?.id) {
      return null;
    }

    const email =
      clerkUser.emailAddresses?.[0]?.emailAddress;

    if (!email) {
      console.error(
        "checkUser: Clerk user has no email address."
      );
      return null;
    }

    const existingUser = await db.user.findUnique({
      where: {
        clerkUserId: clerkUser.id,
      },
    });

    if (existingUser && existingUser.imageUrl !== (clerkUser.imageUrl || null)) {
      await db.user.update({
        where: { id: existingUser.id },
        data: { imageUrl: clerkUser.imageUrl || null },
      });
      existingUser.imageUrl = clerkUser.imageUrl || null;
    }

    // Interviewers use their own credit flow.
    if (existingUser?.role === "INTERVIEWER") {
      return existingUser;
    }

    if (!existingUser) {
      const name =
        [clerkUser.firstName, clerkUser.lastName]
          .filter(Boolean)
          .join(" ") || null;

      try {
        return await db.user.create({
          data: {
            clerkUserId: clerkUser.id,
            name,
            imageUrl: clerkUser.imageUrl,
            email,
            credits: PLAN_CREDITS.free,
            currentPlan: "free",
            creditsLastAllocatedAt: new Date(),
          },
        });
      } catch (createError) {
        if (createError?.code !== "P2002") throw createError;
        return db.user.findUnique({ where: { clerkUserId: clerkUser.id } });
      }
    }

    // Free credits may roll over, but paid-plan credits are only granted by
    // the verified Clerk billing webhook.
    if (
      existingUser.currentPlan === "free" &&
      shouldAllocateCredits(existingUser, "free")
    ) {
      const { user } = await allocatePlanCreditsOnce(
        db,
        existingUser,
        "free",
        PLAN_CREDITS.free,
        new Date(),
      );
      return user;
    }

    return existingUser;
  } catch (error) {
    // Let infrastructure and Prisma failures reach HeaderRole's sanitized
    // diagnostic handler. A database outage must not look like a missing user.
    throw error;
  }
}
