export function canSubmitSessionFeedback(booking, clerkUserId, now = Date.now()) {
  if (!booking || booking.status === "CANCELLED" || booking.sessionFeedback) return false;
  const end = new Date(booking.endTime).getTime();
  const current = now instanceof Date ? now.getTime() : Number(now);
  return Number.isFinite(end) && Number.isFinite(current) && current >= end &&
    booking.interviewee?.clerkUserId === clerkUserId;
}

export function validateSessionFeedbackInput(input) {
  if (!input || typeof input !== "object" || Array.isArray(input) ||
    !Number.isInteger(input.rating) || input.rating < 1 || input.rating > 5) {
    return "Choose a rating from 1 to 5.";
  }
  if (input.comment !== undefined && (typeof input.comment !== "string" || input.comment.length > 2000)) {
    return "Comments must be 2,000 characters or fewer.";
  }
  return null;
}
