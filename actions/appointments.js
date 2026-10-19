"use server";

import { currentUser } from "@clerk/nextjs/server";
import { db } from "@/lib/prisma";

export async function getMyAppointments() {
  const clerkUser = await currentUser();
  if (!clerkUser?.id) return { role: null, appointments: [] };

  const user = await db.user.findUnique({
    where: { clerkUserId: clerkUser.id },
    select: { id: true, role: true },
  });

  if (!user || !["INTERVIEWEE", "INTERVIEWER"].includes(user.role)) {
    return { role: user?.role ?? null, appointments: [] };
  }

  const appointments = await db.booking.findMany({
    where: user.role === "INTERVIEWEE"
      ? { intervieweeId: user.id }
      : { interviewerId: user.id },
    select: {
      id: true,
      startTime: true,
      endTime: true,
      status: true,
      streamCallId: true,
      recordingUrl: true,
      interviewee: { select: { name: true, imageUrl: true } },
      interviewer: { select: { name: true, imageUrl: true, title: true, company: true } },
      feedback: { select: { overallRating: true, summary: true } },
    },
    orderBy: { startTime: "desc" },
  });

  return { role: user.role, appointments };
}
