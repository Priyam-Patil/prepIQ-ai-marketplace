import { isBookingParticipant } from "./access-control.mjs";

export function getSessionDisplayState(status, startTime, endTime, now = Date.now()) {
  const nowMs = now instanceof Date ? now.getTime() : Number(now);
  const start = new Date(startTime).getTime();
  const end = new Date(endTime).getTime();
  if (!Number.isFinite(nowMs) || !Number.isFinite(start) || !Number.isFinite(end) || end <= start) {
    return "INVALID";
  }
  if (status !== "SCHEDULED") return "UNAVAILABLE";
  if (nowMs >= end) return "ENDED";
  if (nowMs < start) return "PRESTART";
  return "READY";
}

export function getVideoJoinAccessError(booking, clerkUserId, now = Date.now()) {
  const nowMs = now instanceof Date ? now.getTime() : Number(now);
  if (
    !booking ||
    !booking.streamCallId ||
    !isBookingParticipant(booking, clerkUserId) ||
    !Number.isFinite(nowMs)
  ) {
    return "This session is unavailable.";
  }

  if (booking.status !== "SCHEDULED") {
    return "This session is not currently scheduled.";
  }

  const start = new Date(booking.startTime).getTime();
  const end = new Date(booking.endTime).getTime();
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) {
    return "This session is unavailable.";
  }
  if (nowMs < start) return "Your session has not started yet.";
  if (nowMs >= end) return "This session has ended.";
  return null;
}

export function getCallTokenValiditySeconds(endTime, now = Date.now()) {
  const remaining = Math.floor((new Date(endTime).getTime() - now) / 1000);
  return Number.isFinite(remaining) && remaining > 0
    ? Math.min(3600, remaining)
    : 0;
}

export function issueVideoTokenForBooking(booking, clerkUserId, stream, now = Date.now()) {
  const accessError = getVideoJoinAccessError(booking, clerkUserId, now);
  if (accessError) throw new Error(accessError);
  const userId = booking.interviewee.clerkUserId === clerkUserId
    ? booking.interviewee.id
    : booking.interviewer.id;
  const validitySeconds = getCallTokenValiditySeconds(booking.endTime, now);
  if (!validitySeconds) throw new Error("This session has ended.");
  return stream.generateCallToken({
    user_id: userId,
    call_cids: [`default:${booking.streamCallId}`],
    validity_in_seconds: validitySeconds,
  });
}
