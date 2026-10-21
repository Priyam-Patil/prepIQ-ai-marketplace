import { revalidatePath } from "next/cache";
import { db } from "@/lib/prisma";
import { getStreamServerClient } from "@/lib/stream";
import { createStreamWebhookHandler } from "@/lib/stream-webhook.mjs";
import { processEmailNotifications } from "@/lib/email-service";

export async function POST(request) {
  const stream = getStreamServerClient();
  return createStreamWebhookHandler({
    db,
    stream,
    onRecordingSaved: async () => {
      revalidatePath("/appointments");
      revalidatePath("/dashboard");
      revalidatePath("/call/[callId]", "page");
    },
    onInterviewCompleted: async () => {
      revalidatePath("/appointments");
      revalidatePath("/dashboard");
    },
    onFeedbackSaved: async (bookingId) => {
      const notification = await db.emailNotification.findUnique({
        where: { key: `feedback:${bookingId}:ai` },
        select: { key: true },
      });
      if (notification) await processEmailNotifications({ onlyKey: notification.key });
    },
  })(request);
}
