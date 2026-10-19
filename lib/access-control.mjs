export function isBookingParticipant(booking, clerkUserId) {
  return Boolean(
    booking &&
    clerkUserId &&
    (booking.interviewee?.clerkUserId === clerkUserId || booking.interviewer?.clerkUserId === clerkUserId)
  );
}
