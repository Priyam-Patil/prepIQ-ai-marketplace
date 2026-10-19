import { NextResponse } from "next/server";
import { db } from "@/lib/prisma";
import { getStreamServerClient } from "@/lib/stream";

export async function POST(request) {
  const stream = getStreamServerClient();
  const signature = request.headers.get("x-signature");
  if (!stream || !signature) {
    return NextResponse.json({ error: "Webhook verification is not configured." }, { status: 401 });
  }

  const body = await request.text();
  if (!stream.verifyWebhook(body, signature)) {
    return NextResponse.json({ error: "Invalid webhook signature." }, { status: 401 });
  }

  let event;
  try {
    event = JSON.parse(body);
  } catch {
    return NextResponse.json({ error: "Invalid webhook payload." }, { status: 400 });
  }

  const streamCallId = typeof event.call_cid === "string"
    ? event.call_cid.slice(event.call_cid.indexOf(":") + 1)
    : null;
  if (!streamCallId) return NextResponse.json({ received: true });

  if (event.type === "call.recording_ready") {
    const recordingUrl = event.call_recording?.url;
    if (typeof recordingUrl === "string" && recordingUrl.startsWith("https://")) {
      await db.booking.updateMany({ where: { streamCallId }, data: { recordingUrl } });
    }
  }

  if (event.type === "call.session_ended") {
    await db.$transaction(async (tx) => {
      const booking = await tx.booking.findUnique({
        where: { streamCallId },
        select: { id: true, interviewerId: true, creditsCharged: true, status: true },
      });
      if (!booking || booking.status !== "SCHEDULED") return;

      const updated = await tx.booking.updateMany({
        where: { id: booking.id, status: "SCHEDULED" },
        data: { status: "COMPLETED" },
      });
      if (!updated.count) return;

      await tx.user.update({
        where: { id: booking.interviewerId },
        data: { creditBalance: { increment: booking.creditsCharged } },
      });
      await tx.creditTransaction.create({
        data: {
          userId: booking.interviewerId,
          amount: booking.creditsCharged,
          type: "BOOKING_EARNING",
          bookingId: booking.id,
        },
      });
    });
  }

  return NextResponse.json({ received: true });
}
