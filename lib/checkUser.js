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
    // Let infrastructure and Prisma failures reach HeaderRole's sanitized
    // diagnostic handler. A database outage must not look like a missing user.
    throw error;
  }
}
