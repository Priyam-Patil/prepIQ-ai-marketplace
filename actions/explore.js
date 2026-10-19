"use server";

import { currentUser } from "@clerk/nextjs/server";
import { db } from "@/lib/prisma";

export const getInterviewers = async () => {
  try {
    const user = await currentUser();

    const interviewers = await db.user.findMany({
      where: {
        role: "INTERVIEWER",
        ...(user && {
          clerkUserId: { not: user.id },
        }),
      },
      select: {
        id: true,
        name: true,
        imageUrl: true,
        title: true,
        company: true,
        yearsExp: true,
        bio: true,
        categories: true,
        creditRate: true,
        availabilities: {
          where: {
            status: "AVAILABLE",
            startTime: { gt: new Date() },
          },
          select: {
            startTime: true,
            endTime: true,
          },
          orderBy: {
            startTime: "asc",
          },
          take: 1,
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return interviewers;
  } catch (err) {
    console.error("getInterviewers error:", err);
    return [];
  }
};
