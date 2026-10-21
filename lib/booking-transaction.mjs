import { isValidBookingInterval } from "./booking-rules.mjs";

export async function persistBookingTransaction(tx, {
  intervieweeId,
  interviewerId,
  start,
  end,
  cost,
  streamCallId,
  category,
  notifications,
  now = new Date(),
}) {
  const availableWindows = await tx.availability.findMany({
    where: {
      interviewerId,
      status: "AVAILABLE",
      startTime: { lte: start },
      endTime: { gte: end },
    },
    select: { startTime: true, endTime: true },
  });
  if (!isValidBookingInterval(start, end, availableWindows, now)) {
    throw new Error("Choose an available 45-minute slot.");
  }

  const interviewerConflict = await tx.booking.findFirst({
    where: {
      interviewerId,
      status: "SCHEDULED",
      startTime: { lt: end },
      endTime: { gt: start },
    },
    select: { id: true },
  });
  if (interviewerConflict) throw new Error("That time was just booked. Choose another slot.");

  const intervieweeConflict = await tx.booking.findFirst({
    where: {
      intervieweeId,
      status: "SCHEDULED",
      startTime: { lt: end },
      endTime: { gt: start },
    },
    select: { id: true },
  });
  if (intervieweeConflict) throw new Error("You already have an interview booked during this time.");

  const debit = await tx.user.updateMany({
    where: { id: intervieweeId, role: "INTERVIEWEE", credits: { gte: cost } },
    data: { credits: { decrement: cost } },
  });
  if (!debit.count) throw new Error("Your credit balance changed. Refresh and try again.");

  const booking = await tx.booking.create({
    data: {
      id: streamCallId,
      intervieweeId,
      interviewerId,
      startTime: start,
      endTime: end,
      category,
      creditsCharged: cost,
      streamCallId,
    },
    select: { id: true, startTime: true, endTime: true },
  });

  await tx.creditTransaction.create({
    data: { userId: intervieweeId, amount: -cost, type: "BOOKING_DEDUCTION", bookingId: booking.id },
  });

  if (notifications?.length) {
    await tx.emailNotification.createMany({
      data: notifications.map((notification) => ({ ...notification, bookingId: booking.id })),
      skipDuplicates: true,
    });
  }

  return booking;
}
