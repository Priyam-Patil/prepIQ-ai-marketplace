import { verifyWebhook } from "@clerk/nextjs/webhooks";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/prisma";
import { processBillingEvent } from "@/lib/billing-webhook.mjs";

export async function POST(request) {
  if (!process.env.CLERK_WEBHOOK_SIGNING_SECRET) {
    return Response.json({ error: "Clerk webhook verification is not configured." }, { status: 503 });
  }

  let event;
  try {
    event = await verifyWebhook(request);
  } catch {
    return Response.json({ error: "Invalid webhook signature or payload." }, { status: 400 });
  }

  try {
    const result = await processBillingEvent(db, event);
    if (["unsupported_payload", "unsupported_billing_period"].includes(result.reason)) {
      console.error("Clerk billing event requires review.", {
        type: event?.type,
        reason: result.reason,
      });
      return Response.json({ error: "Billing event could not be safely applied." }, { status: 503 });
    }
    if (event.type === "paymentAttempt.updated" || event.type === "subscriptionItem.ended") {
      revalidatePath("/");
      revalidatePath("/appointments");
      revalidatePath("/dashboard");
    }
    return Response.json({ received: true });
  } catch (error) {
    console.error("Clerk billing webhook processing failed.", {
      type: event?.type,
      name: error?.name || "Error",
      code: error?.code,
    });
    return Response.json({ error: "Billing webhook processing failed." }, { status: 500 });
  }
}
