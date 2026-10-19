import { isValidBookingInterval } from "./booking-rules.mjs";

export async function persistBookingTransaction(tx, {
  intervieweeId,
  interviewerId,
  start,
  end,
  cost,
  streamCallId,
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

  const conflict = await tx.booking.findFirst({
    where: {
      interviewerId,
      status: "SCHEDULED",
      startTime: { lt: end },
      endTime: { gt: start },
    },
    select: { id: true },
  });
  if (conflict) throw new Error("That time was just booked. Choose another slot.");

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
      creditsCharged: cost,
      streamCallId,
    },
    select: { id: true, startTime: true, endTime: true },
  });

  await tx.creditTransaction.create({
    data: { userId: intervieweeId, amount: -cost, type: "BOOKING_DEDUCTION", bookingId: booking.id },
  });

  return booking;
}
