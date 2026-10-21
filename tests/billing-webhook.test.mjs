import assert from "node:assert/strict";
import test from "node:test";
import { BILLING_PLAN_IDS } from "../lib/billing-plans.mjs";
import { processBillingEvent } from "../lib/billing-webhook.mjs";

function createDb() {
  const user = { id: "user-db-1", clerkUserId: "user-clerk-1", currentPlan: "free", credits: 2 };
  const grants = new Set();
  const grantRows = [];
  const tx = {
    user: {
      findUnique: async () => ({ id: user.id, currentPlan: user.currentPlan }),
      update: async ({ data }) => {
        user.currentPlan = data.currentPlan;
        if (data.credits?.increment) user.credits += data.credits.increment;
        return user;
      },
    },
    billingCreditGrant: {
      createMany: async ({ data }) => {
        const key = `${data[0].paymentAttemptId}:${data[0].subscriptionItemId}`;
        if (grants.has(key)) return { count: 0 };
        grants.add(key);
        grantRows.push(data[0]);
        return { count: 1 };
      },
    },
  };
  return {
    user,
    grantRows,
    $transaction: (callback) => callback(tx),
    userDelegate: {
      updateMany: async ({ where, data }) => {
        if (user.clerkUserId !== where.clerkUserId || user.currentPlan !== where.currentPlan) return { count: 0 };
        user.currentPlan = data.currentPlan;
        return { count: 1 };
      },
    },
  };
}

function paidAttempt({ id, plan, chargeType = "checkout", periodStart = 1_800_000_000_000, status = "paid" }) {
  return {
    type: "paymentAttempt.updated",
    data: {
      id,
      status,
      charge_type: chargeType,
      payer: { user_id: "user-clerk-1" },
      subscription_items: [{
        id: `item-${id}`,
        status: "active",
        plan_id: plan,
        plan_period: "month",
        period_start: periodStart,
      }],
    },
  };
}

test("paid checkout grants Starter credits once and retries do not double-credit", async () => {
  const db = createDb();
  const event = paidAttempt({ id: "pay-starter", plan: BILLING_PLAN_IDS.starter });

  assert.deepEqual(await processBillingEvent(db, event), { applied: true, plan: "starter", credits: 5 });
  assert.deepEqual(await processBillingEvent(db, event), { applied: false, reason: "duplicate" });
  assert.equal(db.user.credits, 7);
  assert.equal(db.grantRows.length, 1);
});

test("Pro upgrade grants only the difference and preserves the existing balance", async () => {
  const db = createDb();
  await processBillingEvent(db, paidAttempt({ id: "pay-starter", plan: BILLING_PLAN_IDS.starter }));

  const upgrade = await processBillingEvent(db, paidAttempt({ id: "pay-pro", plan: BILLING_PLAN_IDS.pro }));
  assert.deepEqual(upgrade, { applied: true, plan: "pro", credits: 10 });
  assert.equal(db.user.credits, 17);
});

test("renewals grant the full monthly allowance while failures grant nothing", async () => {
  const db = createDb();
  await processBillingEvent(db, paidAttempt({ id: "pay-starter", plan: BILLING_PLAN_IDS.starter }));

  const failed = await processBillingEvent(db, paidAttempt({
    id: "pay-failed", plan: BILLING_PLAN_IDS.pro, status: "failed",
  }));
  assert.deepEqual(failed, { applied: false, reason: "not_paid" });

  const renewal = await processBillingEvent(db, paidAttempt({
    id: "pay-renewal", plan: BILLING_PLAN_IDS.starter, chargeType: "recurring", periodStart: 1_802_678_400_000,
  }));
  assert.deepEqual(renewal, { applied: true, plan: "starter", credits: 5 });
  assert.equal(db.user.credits, 12);
});

test("upcoming downgrades and unsupported billing periods do not grant or change plans", async () => {
  const db = createDb();
  await processBillingEvent(db, paidAttempt({ id: "pay-starter", plan: BILLING_PLAN_IDS.starter }));
  await processBillingEvent(db, paidAttempt({ id: "pay-pro", plan: BILLING_PLAN_IDS.pro }));
  const before = { plan: db.user.currentPlan, credits: db.user.credits };

  const upcoming = paidAttempt({ id: "pay-upcoming", plan: BILLING_PLAN_IDS.starter });
  upcoming.data.subscription_items[0].status = "upcoming";
  assert.deepEqual(await processBillingEvent(db, upcoming), { applied: false, reason: "unsupported_payload" });

  const annual = paidAttempt({ id: "pay-annual", plan: BILLING_PLAN_IDS.pro });
  annual.data.subscription_items[0].plan_period = "annual";
  assert.deepEqual(await processBillingEvent(db, annual), { applied: false, reason: "unsupported_billing_period" });
  assert.equal(db.user.currentPlan, before.plan);
  assert.equal(db.user.credits, before.credits);
});

test("ending the current paid plan changes plan to free without removing rollover credits", async () => {
  const db = createDb();
  await processBillingEvent(db, paidAttempt({ id: "pay-starter", plan: BILLING_PLAN_IDS.starter }));
  const before = db.user.credits;
  db.user.updateMany = db.userDelegate.updateMany;

  const result = await processBillingEvent(db, {
    type: "subscriptionItem.ended",
    data: { payer: { user_id: "user-clerk-1" }, plan_id: BILLING_PLAN_IDS.starter },
  });
  assert.deepEqual(result, { applied: true, plan: "free" });
  assert.equal(db.user.currentPlan, "free");
  assert.equal(db.user.credits, before);
});
