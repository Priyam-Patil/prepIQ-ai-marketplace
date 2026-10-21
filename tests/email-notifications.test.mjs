import test from "node:test";
import assert from "node:assert/strict";
import {
  escapeEmailHtml,
  buildResendMessage,
  buildBookingNotifications,
  isValidEmail,
  reminderMatchesBooking,
  reminderSchedule,
  shouldQueueReminder,
  retryAt,
  runEmailOutbox,
} from "../lib/email-notifications.mjs";

test("booking reminder is scheduled one hour before the stored start time", () => {
  const start = new Date("2027-01-01T15:00:00.000Z");
  assert.equal(reminderSchedule(start).toISOString(), "2027-01-01T14:00:00.000Z");
  assert.equal(reminderSchedule("invalid"), null);
  assert.equal(shouldQueueReminder(start, new Date("2027-01-01T13:00:00.000Z")), true);
  assert.equal(shouldQueueReminder(start, new Date("2027-01-01T14:30:00.000Z")), false);
});

test("cancelled and rescheduled bookings invalidate old reminders", () => {
  const payload = { startTime: "2027-01-01T15:00:00.000Z" };
  assert.equal(reminderMatchesBooking({ status: "CANCELLED", startTime: new Date(payload.startTime) }, payload), false);
  assert.equal(reminderMatchesBooking({ status: "SCHEDULED", startTime: new Date("2027-01-01T16:00:00.000Z") }, payload), false);
  assert.equal(reminderMatchesBooking({ status: "SCHEDULED", startTime: new Date(payload.startTime) }, payload), true);
  assert.equal(reminderMatchesBooking({ status: "SCHEDULED", startTime: new Date(payload.startTime) }, payload, new Date("2027-01-01T15:00:00.000Z")), false);
});

test("notification retries use bounded backoff and email recipients are validated", () => {
  const now = new Date("2027-01-01T00:00:00Z");
  assert.equal(retryAt(1, now).getTime() - now.getTime(), 30_000);
  assert.equal(retryAt(99, now).getTime() - now.getTime(), 3_600_000);
  assert.equal(isValidEmail("candidate@example.com"), true);
  assert.equal(isValidEmail("not an email"), false);
  assert.equal(escapeEmailHtml("<img onerror='x'>"), "&lt;img onerror=&#39;x&#39;&gt;");
});

test("outbox claim prevents duplicate concurrent sends and provider failure is retryable", async () => {
  const row = { id: "n1" };
  let claimed = false;
  let deliveryCount = 0;
  let failed = false;
  const deps = {
    rows: [row],
    claim: async () => { if (claimed) return false; claimed = true; return true; },
    applicable: async () => true,
    deliver: async () => { deliveryCount += 1; throw new Error("provider unavailable"); },
    markSent: async () => assert.fail("failed delivery must not be marked sent"),
    markFailed: async () => { failed = true; },
    markSkipped: async () => assert.fail("applicable email must not be skipped"),
  };
  const first = await runEmailOutbox(deps);
  const duplicate = await runEmailOutbox(deps);
  assert.deepEqual(first, { processed: 1, sent: 0, failed: 1, skipped: 0 });
  assert.deepEqual(duplicate, { processed: 0, sent: 0, failed: 0, skipped: 0 });
  assert.equal(deliveryCount, 1);
  assert.equal(failed, true);
});

test("invalid or missing recipients do not pass email validation", () => {
  assert.equal(isValidEmail(undefined), false);
  assert.equal(isValidEmail(""), false);
});

test("booking confirmation is addressed to the queued participant and carries stored appointment details", () => {
  const message = buildResendMessage({
    key: "booking:b1:confirmation:interviewee",
    kind: "BOOKING_CONFIRMATION",
    recipient: "candidate@example.com",
    payload: { greeting: "Candidate", interviewerName: "Interviewer", dateTime: "Jan 1, 2027 3:00 PM", timeZone: "UTC", category: "FRONTEND", url: "https://prepiq.example/appointments" },
  }, "PrepIQ <notifications@example.com>");
  assert.deepEqual(message.to, ["candidate@example.com"]);
  assert.equal(message.from, "PrepIQ <notifications@example.com>");
  assert.match(message.html, /FRONTEND/);
  assert.match(message.text, /UTC/);
});

test("booking creates deduplicated confirmations for both participants and reminders only when there is an hour", () => {
  const now = new Date("2027-01-01T12:00:00.000Z");
  const participants = {
    interviewee: { name: "Candidate", email: "candidate@example.com" },
    interviewer: { name: "Coach", email: "coach@example.com" },
  };
  const notifications = buildBookingNotifications({
    bookingId: "booking-7",
    startTime: new Date("2027-01-01T15:00:00.000Z"),
    ...participants,
    category: "FRONTEND",
    appUrl: "https://prepiq.example",
    now,
  });
  assert.deepEqual(notifications.map((item) => item.recipient), [
    "candidate@example.com", "coach@example.com", "candidate@example.com", "coach@example.com",
  ]);
  assert.equal(notifications[0].payload.recipientRole, "INTERVIEWEE");
  assert.equal(notifications[1].payload.recipientRole, "INTERVIEWER");
  assert.equal(notifications[2].scheduledFor.toISOString(), "2027-01-01T14:00:00.000Z");
  assert.equal(new Set(notifications.map((item) => item.key)).size, notifications.length);
  const nearStart = buildBookingNotifications({
    bookingId: "booking-8", startTime: new Date("2027-01-01T12:30:00.000Z"),
    ...participants, category: "BACKEND", appUrl: "https://prepiq.example", now,
  });
  assert.equal(nearStart.length, 2);
});
