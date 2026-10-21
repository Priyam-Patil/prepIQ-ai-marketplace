
import { createHmac, timingSafeEqual } from "node:crypto";
import { db } from "@/lib/prisma";
import { PLAN_CREDITS } from "@/lib/billing-plans.mjs";



function isValidSignature(rawBody, signature, secret) {
  if (
    typeof signature !== "string" ||
    !/^[a-f0-9]{64}$/i.test(signature)
  ) {
    return false;
  }

  const expected = createHmac("sha256", secret)
    .update(rawBody)
    .digest();

  const received = Buffer.from(signature, "hex");

  return (
    received.length === expected.length &&
    timingSafeEqual(received, expected)
  );
}

export async function POST(request) {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;

  if (!secret) {
    console.error("Razorpay webhook secret is not configured.");
    return Response.json(
      { error: "Webhook is not configured." },
      { status: 503 }
    );
  }

  // Verify the exact raw body before parsing JSON.
  const rawBody = await request.text();
  const signature = request.headers.get("x-razorpay-signature");

  if (!isValidSignature(rawBody, signature, secret)) {
    return Response.json(
      { error: "Invalid webhook signature." },
      { status: 400 }
    );
  }

  let event;

  try {
    event = JSON.parse(rawBody);
  } catch {
    return Response.json(
      { error: "Invalid JSON payload." },
      { status: 400 }
    );
  }

  // Only successful recurring subscription charges grant credits.
  if (event.event !== "subscription.charged") {
    return Response.json({ received: true });
  }

  const subscription =
    event.payload?.subscription?.entity;
  const payment = event.payload?.payment?.entity;

  const userId = subscription?.notes?.appUserId;
  const planSlug = subscription?.notes?.planSlug;
  const subscriptionId = subscription?.id;
  const paymentId = payment?.id;

  if (
    !userId ||
    !subscriptionId ||
    !paymentId ||
    !["starter", "pro"].includes(planSlug) ||
    payment?.status !== "captured"
  ) {
    console.error("Unsupported Razorpay subscription charge payload.");
    return Response.json(
      { error: "Unsupported subscription charge payload." },
      { status: 400 }
    );
  }

  const expectedPlanId =
    planSlug === "starter"
      ? process.env.RAZORPAY_STARTER_PLAN_ID
      : process.env.RAZORPAY_PRO_PLAN_ID;

  if (
    !expectedPlanId ||
    subscription.plan_id !== expectedPlanId
  ) {
    console.error("Razorpay subscription plan did not match configuration.");
    return Response.json(
      { error: "Subscription plan mismatch." },
      { status: 400 }
    );
  }

  const credits = PLAN_CREDITS[planSlug];

  try {
    await db.$transaction(async (tx) => {
      const user = await tx.user.findUnique({
        where: { id: userId },
        select: { id: true, role: true },
      });

      if (!user || user.role === "INTERVIEWER") {
        throw new Error("BILLING_USER_NOT_ELIGIBLE");
      }

      const grant = await tx.billingCreditGrant.createMany({
        data: [{
          userId: user.id,
          paymentAttemptId: paymentId,
          subscriptionItemId: subscriptionId,
          periodStart: String(
            subscription.current_start ??
            payment.created_at ??
            event.created_at
          ),
          plan: planSlug,
          credits,
        }],
        skipDuplicates: true,
      });

      // Duplicate webhook deliveries must not grant credits twice.
      if (grant.count === 0) return;

      await tx.user.update({
        where: { id: user.id },
        data: {
          currentPlan: planSlug,
          credits: { increment: credits },
          creditsLastAllocatedAt: new Date(),
        },
      });
    });

    return Response.json({ received: true });
  } catch (error) {
    console.error("Razorpay webhook processing failed:", {
      name: error?.name || "Error",
      code: error?.code,
    });

    return Response.json(
      { error: "Webhook processing failed." },
      { status: 500 }
    );
  }
}
