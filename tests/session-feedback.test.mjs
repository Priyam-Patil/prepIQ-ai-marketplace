import test from "node:test";
import assert from "node:assert/strict";
import { canSubmitSessionFeedback, validateSessionFeedbackInput } from "../lib/feedback-eligibility.mjs";

const booking = {
  status: "SCHEDULED",
  endTime: "2030-01-01T01:00:00.000Z",
  interviewee: { clerkUserId: "candidate-clerk-id" },
  sessionFeedback: null,
};

test("feedback eligibility is false before end time and true exactly at or after end time", () => {
  const end = Date.parse(booking.endTime);
  assert.equal(canSubmitSessionFeedback(booking, "candidate-clerk-id", end - 1), false);
  assert.equal(canSubmitSessionFeedback(booking, "candidate-clerk-id", end), true);
  assert.equal(canSubmitSessionFeedback(booking, "candidate-clerk-id", end + 1), true);
});

test("only the booking interviewee can submit and cancelled or already-rated bookings are rejected", () => {
  const end = Date.parse(booking.endTime);
  assert.equal(canSubmitSessionFeedback(booking, "other-user", end), false);
  assert.equal(canSubmitSessionFeedback({ ...booking, status: "CANCELLED" }, "candidate-clerk-id", end), false);
  assert.equal(canSubmitSessionFeedback({ ...booking, sessionFeedback: { id: "saved" } }, "candidate-clerk-id", end), false);
});

test("session feedback validation accepts valid ratings and rejects invalid data", () => {
  assert.equal(validateSessionFeedbackInput({ rating: 5, comment: "Helpful" }), null);
  assert.match(validateSessionFeedbackInput({ rating: 6 }), /rating/);
  assert.match(validateSessionFeedbackInput({ rating: 3, comment: "x".repeat(2001) }), /2,000/);
});
