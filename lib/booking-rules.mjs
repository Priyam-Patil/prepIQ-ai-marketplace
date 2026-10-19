export const SESSION_DURATION_MS = 45 * 60_000;

export function isValidBookingInterval(start, end, availabilityWindows, now = new Date()) {
  const startMs = start instanceof Date ? start.getTime() : new Date(start).getTime();
  const endMs = end instanceof Date ? end.getTime() : new Date(end).getTime();
  const nowMs = now instanceof Date ? now.getTime() : new Date(now).getTime();

  if (
    !Number.isFinite(startMs) ||
    !Number.isFinite(endMs) ||
    !Number.isFinite(nowMs) ||
    startMs <= nowMs ||
    endMs - startMs !== SESSION_DURATION_MS
  ) {
    return false;
  }

  return availabilityWindows.some((window) => {
    const windowStart = new Date(window.startTime).getTime();
    const windowEnd = new Date(window.endTime).getTime();
    return (
      startMs >= windowStart &&
      endMs <= windowEnd &&
      (startMs - windowStart) % SESSION_DURATION_MS === 0
    );
  });
}

export function getOpenSlotsForDay({ availability, bookings, dayStart, dayEnd, now = new Date() }) {
  const dayStartMs = new Date(dayStart).getTime();
  const dayEndMs = new Date(dayEnd).getTime();
  const nowMs = new Date(now).getTime();
  if (!Number.isFinite(dayStartMs) || !Number.isFinite(dayEndMs) || !Number.isFinite(nowMs)) return [];

  const slots = [];
  for (const window of availability) {
    const windowStart = new Date(window.startTime).getTime();
    const windowEnd = new Date(window.endTime).getTime();
    const clippedStart = Math.max(windowStart, dayStartMs);
    const clippedEnd = Math.min(windowEnd, dayEndMs);
    if (clippedEnd - clippedStart < SESSION_DURATION_MS) continue;

    // Keep the grid anchored to the availability start so the server can
    // independently validate that a submitted time is one of these slots.
    const intervalsToSkip = Math.max(0, Math.ceil((clippedStart - windowStart) / SESSION_DURATION_MS));
    let cursor = windowStart + intervalsToSkip * SESSION_DURATION_MS;

    while (cursor + SESSION_DURATION_MS <= clippedEnd) {
      const slotEnd = cursor + SESSION_DURATION_MS;
      const hasConflict = bookings.some((booking) => {
        const bookingStart = new Date(booking.startTime).getTime();
        const bookingEnd = new Date(booking.endTime).getTime();
        return cursor < bookingEnd && slotEnd > bookingStart;
      });

      if (cursor > nowMs && !hasConflict) {
        slots.push({ startTime: new Date(cursor).toISOString(), endTime: new Date(slotEnd).toISOString() });
      }
      cursor += SESSION_DURATION_MS;
    }
  }

  return slots.sort((left, right) => left.startTime.localeCompare(right.startTime));
}
