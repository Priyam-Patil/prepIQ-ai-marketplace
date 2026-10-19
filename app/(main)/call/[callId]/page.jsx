import { currentUser } from "@clerk/nextjs/server";
import { connection } from "next/server";
import { notFound, redirect } from "next/navigation";
import { db } from "@/lib/prisma";
import { isBookingParticipant } from "@/lib/access-control.mjs";
import CallRoom from "./_components/CallRoom";

export const instant = false;

export default async function CallPage({ params }) {
  await connection();
  const clerkUser = await currentUser();
  if (!clerkUser) redirect("/sign-in");

  const { callId } = await params;
  const booking = await db.booking.findUnique({
    where: { id: callId },
    select: {
      id: true,
      startTime: true,
      endTime: true,
      status: true,
      streamCallId: true,
      recordingUrl: true,
      interviewee: { select: { id: true, clerkUserId: true, name: true, imageUrl: true } },
      interviewer: { select: { id: true, clerkUserId: true, name: true, imageUrl: true, title: true, company: true, categories: true } },
    },
  });

  if (
    !isBookingParticipant(booking, clerkUser.id)
  ) {
    notFound();
  }

  if (booking.status === "CANCELLED" || !booking.streamCallId) notFound();
  const viewer = booking.interviewee.clerkUserId === clerkUser.id ? booking.interviewee : booking.interviewer;

  return <CallRoom booking={booking} viewer={viewer} apiKey={process.env.NEXT_PUBLIC_STREAM_API_KEY || null} />;
}
