import "server-only";

import { Resend } from "resend";
import { db } from "@/lib/prisma";
import { buildResendMessage, isValidEmail, reminderMatchesBooking, retryAt, runEmailOutbox } from "@/lib/email-notifications.mjs";

function configuration() {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (!apiKey || !from || !baseUrl) throw new Error("Email delivery is not configured.");
  const parsed = new URL(baseUrl);
  if (parsed.protocol !== "https:" && parsed.hostname !== "localhost") throw new Error("Invalid application URL configuration.");
  if (!/^[^<>]+<[^<>]+>$/.test(from) && !isValidEmail(from)) throw new Error("Invalid sender configuration.");
  return { apiKey, from, baseUrl: parsed.origin };
}

export async function queueNotification(tx, { key, kind, bookingId, recipient, payload, scheduledFor = new Date() }) {
  if (!key || !kind || !isValidEmail(recipient)) return false;
  const result = await tx.emailNotification.createMany({
    data: [{ key, kind, bookingId, recipient, payload, scheduledFor }],
    skipDuplicates: true,
  });
  return result.count === 1;
}

async function isStillApplicable(notification) {
  if (notification.kind !== "INTERVIEW_REMINDER" || !notification.bookingId) return true;
  const booking = await db.booking.findUnique({ where: { id: notification.bookingId }, select: { status: true, startTime: true } });
  return reminderMatchesBooking(booking, notification.payload);
}

async function deliver(notification) {
  const { apiKey, from } = configuration();
  if (!isValidEmail(notification.recipient)) throw new Error("Invalid notification recipient.");
  if (typeof notification.payload?.url !== "string" || !/^https?:\/\//i.test(notification.payload.url)) throw new Error("A valid application link is required for email delivery.");
  const resend = new Resend(apiKey);
  const result = await resend.emails.send(buildResendMessage(notification, from), { idempotencyKey: `prepiq-${notification.key}` });
  if (result.error) throw Object.assign(new Error("Resend rejected the email."), { code: result.error.name });
}

export async function processEmailNotifications({ limit = 30, onlyKey } = {}) {
  const now = new Date();
  const staleProcessingBefore = new Date(now.getTime() - 10 * 60 * 1000);
  const statusFilter = ["PENDING", "FAILED", "PROCESSING"];
  const rows = onlyKey
    ? await db.emailNotification.findMany({ where: { key: onlyKey, status: { in: statusFilter }, scheduledFor: { lte: now }, OR: [{ status: { not: "PROCESSING" } }, { updatedAt: { lt: staleProcessingBefore } }] }, take: 1 })
    : await db.emailNotification.findMany({ where: { status: { in: statusFilter }, scheduledFor: { lte: now }, OR: [{ status: { not: "PROCESSING" } }, { updatedAt: { lt: staleProcessingBefore } }] }, orderBy: { scheduledFor: "asc" }, take: Math.min(Math.max(limit, 1), 100) });
  return runEmailOutbox({
    rows,
    claim: async (row) => {
      const result = await db.emailNotification.updateMany({ where: { id: row.id, status: row.status, attempts: row.attempts, updatedAt: row.updatedAt }, data: { status: "PROCESSING" } });
      return result.count === 1;
    },
    applicable: isStillApplicable,
    deliver,
    markSkipped: (row) => db.emailNotification.update({ where: { id: row.id }, data: { status: "SKIPPED", lastError: null } }),
    markSent: (row) => db.emailNotification.update({ where: { id: row.id }, data: { status: "SENT", sentAt: new Date(), attempts: { increment: 1 }, lastError: null } }),
    markFailed: async (row, error) => {
      const attempts = row.attempts + 1;
      await db.emailNotification.update({ where: { id: row.id }, data: { status: "FAILED", attempts, scheduledFor: retryAt(attempts), lastError: `${String(error?.name || "Error").slice(0, 60)}${error?.code ? `:${String(error.code).slice(0, 60)}` : ""}` } });
      console.error("Email notification delivery failed.", { kind: row.kind, error: error?.name || "Error", code: error?.code });
    },
  });
}

export function getPublicAppUrl() {
  const { baseUrl } = configuration();
  return baseUrl;
}
