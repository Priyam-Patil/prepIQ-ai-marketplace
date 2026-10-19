export async function allocatePlanCreditsOnce(db, existingUser, currentPlan, planCredits, allocatedAt = new Date()) {
  const update = await db.user.updateMany({
    where: {
      id: existingUser.id,
      currentPlan: existingUser.currentPlan,
      creditsLastAllocatedAt: existingUser.creditsLastAllocatedAt,
    },
    data: {
      credits: { increment: planCredits },
      currentPlan,
      creditsLastAllocatedAt: allocatedAt,
    },
  });

  const user = await db.user.findUnique({ where: { id: existingUser.id } });
  return { user, allocated: update.count === 1 };
}
