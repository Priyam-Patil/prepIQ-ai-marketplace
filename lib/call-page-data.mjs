import { isBookingParticipant } from "./access-control.mjs";

export async function getCallPageData({ db, bookingId, getUserId }) {
  let userId;
  try {
    userId = await getUserId();
  } catch (error) {
    return { kind: "error", stage: "authentication", error };
  }

  if (!userId) return { kind: "unauthenticated" };

  let booking;
  try {
    booking = await db.booking.findUnique({
      where: { id: bookingId },
      select: {
        id: true,
        startTime: true,
        endTime: true,
        category: true,
        status: true,
        streamCallId: true,
        recordingUrl: true,
        interviewee: {
          select: {
            id: true,
            clerkUserId: true,
            name: true,
            imageUrl: true,
          },
        },
        interviewer: {
          select: {
            id: true,
            clerkUserId: true,
            name: true,
            imageUrl: true,
            title: true,
            company: true,
            categories: true,
          },
        },
      },
    });
  } catch (error) {
    return { kind: "error", stage: "database", error };
  }

  if (
    !booking ||
    !isBookingParticipant(booking, userId) ||
    booking.status === "CANCELLED" ||
    !booking.streamCallId
  ) {
    return { kind: "not_found" };
  }

  const viewer = booking.interviewee.clerkUserId === userId
    ? booking.interviewee
    : booking.interviewer;
  const viewerBooking = viewer.id === booking.interviewee.id
    ? booking
    : { ...booking, recordingUrl: null };

  return {
    kind: "success",
    booking: viewerBooking,
    viewer,
    serverNow: new Date().toISOString(),
  };
}
