import { db } from "@/lib/prisma";
import { allocatePlanCreditsOnce } from "@/lib/credit-allocation.mjs";

const PLAN_CREDITS = {
  pro: 15,
  starter: 5,
  free: 1,
};

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

export async function checkUser(clerkUser, hasPlan = null) {
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

    // Interviewers use their own credit flow.
    if (existingUser?.role === "INTERVIEWER") {
      return existingUser;
    }

    let currentPlan = "free";

    if (typeof hasPlan === "function") {
      if (hasPlan({ plan: "pro" })) {
        currentPlan = "pro";
      } else if (hasPlan({ plan: "starter" })) {
        currentPlan = "starter";
      }
    }

    const planCredits = PLAN_CREDITS[currentPlan];

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
            credits: planCredits,
            currentPlan,
            creditsLastAllocatedAt: new Date(),
          },
        });
      } catch (createError) {
        if (createError?.code !== "P2002") throw createError;
        return db.user.findUnique({ where: { clerkUserId: clerkUser.id } });
      }
    }

    if (shouldAllocateCredits(existingUser, currentPlan)) {
      const { user } = await allocatePlanCreditsOnce(
        db,
        existingUser,
        currentPlan,
        planCredits,
        new Date(),
      );
      return user;
    }

    return existingUser;
  } catch (error) {
    console.error(
      "checkUser error:",
      error instanceof Error ? error.message : error
    );

    return null;
  }
}
