import { BILLING_PLANS, PLAN_CREDITS } from "./billing-plans.mjs";

function getKnownActiveItem(items) {
  if (!Array.isArray(items)) return null;
  return items.find((item) => {
    const planId = item?.plan_id || item?.plan?.id;
    return item?.status === "active" && BILLING_PLANS[planId];
  }) || null;
}

export async function applyPaidPlanAttempt(db, paymentAttempt) {
  if (paymentAttempt?.status !== "paid") return { applied: false, reason: "not_paid" };

  const clerkUserId = paymentAttempt.payer?.user_id;
  const item = getKnownActiveItem(paymentAttempt.subscription_items);
  const planId = item?.plan_id || item?.plan?.id;
  const plan = BILLING_PLANS[planId];
  const paymentAttemptId = paymentAttempt.id;

  if (
    !clerkUserId ||
    !plan ||
    !item?.id ||
    !paymentAttemptId ||
    typeof item.period_start !== "number"
  ) {
    return { applied: false, reason: "unsupported_payload" };
  }

  // These plans are advertised and sold monthly. An annual item requires an
  // explicit annual credit policy before it can safely grant credits.
  if (item.plan_period !== "month") {
    return { applied: false, reason: "unsupported_billing_period" };
  }

  return db.$transaction(async (tx) => {
    const user = await tx.user.findUnique({
      where: { clerkUserId },
      select: { id: true, currentPlan: true },
    });
    if (!user) throw new Error("Billing event references an unknown user.");

    const isRecurring = paymentAttempt.charge_type === "recurring";
    const priorCredits = PLAN_CREDITS[user.currentPlan] ?? PLAN_CREDITS.free;
    const credits = isRecurring
      ? plan.credits
      : user.currentPlan === "free"
        ? plan.credits
        : Math.max(0, plan.credits - priorCredits);

    const inserted = await tx.billingCreditGrant.createMany({
      data: [{
        userId: user.id,
        paymentAttemptId,
        subscriptionItemId: item.id,
        plan: plan.slug,
        credits,
        periodStart: String(item.period_start),
      }],
      skipDuplicates: true,
    });

    if (inserted.count === 0) return { applied: false, reason: "duplicate" };

    await tx.user.update({
      where: { id: user.id },
      data: {
        currentPlan: plan.slug,
        ...(credits > 0 ? { credits: { increment: credits } } : {}),
        creditsLastAllocatedAt: new Date(),
      },
    });

    return { applied: true, plan: plan.slug, credits };
  });
}

export async function applyEndedPlanItem(db, item) {
  const clerkUserId = item?.payer?.user_id;
  const planId = item?.plan_id || item?.plan?.id;
  const plan = BILLING_PLANS[planId];
  if (!clerkUserId || !plan) return { applied: false, reason: "unsupported_payload" };

  const result = await db.user.updateMany({
    where: { clerkUserId, currentPlan: plan.slug },
    data: { currentPlan: "free" },
  });
  return { applied: result.count > 0, plan: "free" };
}

export async function processBillingEvent(db, event) {
  if (event?.type === "paymentAttempt.updated") {
    return applyPaidPlanAttempt(db, event.data);
  }
  if (event?.type === "subscriptionItem.ended") {
    return applyEndedPlanItem(db, event.data);
  }
  return { applied: false, reason: "ignored" };
}
