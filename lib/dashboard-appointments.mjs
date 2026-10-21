export function getDashboardAppointments(db, interviewerId) {
  return db.booking.findMany({
    where: { interviewerId },
    select: {
      id: true,
      startTime: true,
      endTime: true,
      status: true,
      streamCallId: true,
      category: true,
      interviewee: { select: { name: true } },
    },
    orderBy: { startTime: "desc" },
    take: 20,
  });
}
