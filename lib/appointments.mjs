import { getSafeRecordingUrl } from "./recording-url.mjs";

export async function getAppointmentsForUser(db, clerkUserId, now = new Date()) {
  const user = await db.user.findUnique({
    where: { clerkUserId },
    select: {
      id: true,
      role: true,
      currentPlan: true,
    },
  });

  if (!user || !["INTERVIEWEE", "INTERVIEWER"].includes(user.role)) {
    return {
      role: user?.role ?? null,
      currentPlan: user?.currentPlan ?? "free",
      appointments: [],
    };
  }

  const participantWhere = user.role === "INTERVIEWEE"
      ? { intervieweeId: user.id }
      : { interviewerId: user.id };
  const recordingSelect = user.role === "INTERVIEWEE" ? { recordingUrl: true } : {};
  const selection = {
    select: {
      id: true,
      startTime: true,
      endTime: true,
      status: true,
      creditsCharged: true,
      streamCallId: true,
      ...recordingSelect,
      category: true,
      interviewee: {
        select: {
          name: true,
          imageUrl: true,
        },
      },
      interviewer: {
        select: {
          name: true,
          imageUrl: true,
          title: true,
          company: true,
        },
      },
      feedback: {
        select: {
          summary: true,
          technical: true,
          communication: true,
          problemSolving: true,
          recommendation: true,
          strengths: true,
          improvements: true,
          overallRating: true,
          sessionRating: true,
          sessionComment: true,
        },
      },
      sessionFeedback: { select: { id: true, rating: true, comment: true } },
    },
  };
  const [upcoming, past] = await Promise.all([
    db.booking.findMany({
      ...selection,
      where: { ...participantWhere, status: "SCHEDULED", endTime: { gte: now } },
      orderBy: { startTime: "asc" },
    }),
    db.booking.findMany({
      ...selection,
      where: {
        ...participantWhere,
        OR: [
          { status: { in: ["COMPLETED", "CANCELLED"] } },
          { status: "SCHEDULED", endTime: { lt: now } },
        ],
      },
      orderBy: { startTime: "desc" },
    }),
  ]);
  const appointments = [...upcoming, ...past];

  return {
    role: user.role,
    currentPlan: user.currentPlan ?? "free",
    appointments: appointments.map((appointment) => ({
      ...appointment,
      recordingUrl: user.role === "INTERVIEWEE"
        ? getSafeRecordingUrl(appointment.recordingUrl)
        : null,
    })),
  };
}
