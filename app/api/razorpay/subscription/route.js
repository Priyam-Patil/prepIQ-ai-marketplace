
import { auth } from "@clerk/nextjs/server";
import Razorpay from "razorpay";
import { db } from "@/lib/prisma";



const PLAN_CONFIG = {
  starter: {
    envKey: "RAZORPAY_STARTER_PLAN_ID",
  },
  pro: {
    envKey: "RAZORPAY_PRO_PLAN_ID",
  },
};

export async function POST(request) {
  try {
    // 1. Require a signed-in Clerk user.
    const { userId } = await auth();

    if (!userId) {
      return Response.json(
        { error: "Please sign in first." },
        { status: 401 }
      );
    }

    // 2. Accept only known plan slugs from the client.
    let body;

    try {
      body = await request.json();
    } catch {
      return Response.json(
        { error: "Invalid request body." },
        { status: 400 }
      );
    }

    const planSlug = body?.planSlug;

    if (
      typeof planSlug !== "string" ||
      !Object.hasOwn(PLAN_CONFIG, planSlug)
    ) {
      return Response.json(
        { error: "Invalid subscription plan." },
        { status: 400 }
      );
    }

    // 3. Check the existing database user and role.
    const user = await db.user.findUnique({
      where: { clerkUserId: userId },
      select: {
        id: true,
        role: true,
      },
    });

    if (!user) {
      return Response.json(
        { error: "User profile not found. Please complete onboarding." },
        { status: 404 }
      );
    }

    if (user.role === "INTERVIEWER") {
      return Response.json(
        { error: "Subscriptions are available to interviewees only." },
        { status: 403 }
      );
    }

    // 4. Read the plan ID only from server-side environment variables.
    const config = PLAN_CONFIG[planSlug];
    const planId = process.env[config.envKey];
    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    if (!planId || !keyId || !keySecret) {
      console.error("Razorpay subscription configuration is incomplete.");

      return Response.json(
        { error: "Subscription service is not configured." },
        { status: 503 }
      );
    }

    // 5. Create the subscription through Razorpay's server SDK.
    const razorpay = new Razorpay({
      key_id: keyId,
      key_secret: keySecret,
    });

    const subscription = await razorpay.subscriptions.create({
      plan_id: planId,
      total_count: 12,
      quantity: 1,
      customer_notify: true,
      notes: {
        appUserId: user.id,
        planSlug,
      },
    });

    // This creates a subscription only. It does NOT grant credits.
    return Response.json({
      subscriptionId: subscription.id,
      razorpayKeyId: keyId,
      planSlug,
    });
  } catch (error) {
    console.error("Razorpay subscription creation failed:", {
      name: error?.name || "Error",
      statusCode: error?.statusCode,
    });

    return Response.json(
      { error: "Could not create subscription. Please try again." },
      { status: 500 }
    );
  }
}
