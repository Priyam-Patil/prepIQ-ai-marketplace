import { auth } from "@clerk/nextjs/server";
import { connection } from "next/server";
import { notFound, redirect } from "next/navigation";
import { db } from "@/lib/prisma";
import { getCallPageData } from "@/lib/call-page-data.mjs";
import { getSafeRecordingUrl } from "@/lib/recording-url.mjs";
import { getSafeErrorDetails } from "@/lib/safe-error.mjs";
import CallRoom from "./_components/CallRoom";

export const instant = false;

function CallPageRetry({ bookingId }) {
  return (
    <main className="min-h-screen bg-[#090909] px-5 py-16 text-white sm:px-8">
      <section
        role="alert"
        className="mx-auto max-w-2xl rounded-2xl border border-amber-400/20 bg-white/[0.03] p-8"
      >
        <h1 className="text-xl font-semibold">Session could not be loaded</h1>
        <p className="mt-2 text-sm text-gray-400">
          We couldn&apos;t verify the session right now. Please try again.
        </p>
        <a
          href={`/call/${encodeURIComponent(bookingId)}`}
          className="mt-6 inline-flex rounded-lg bg-amber-400 px-4 py-2.5 text-sm font-semibold text-black hover:bg-amber-300"
        >
          Retry
        </a>
      </section>
    </main>
  );
}

export default async function CallPage({ params }) {
  await connection();

  const { callId: bookingId } = await params;
  const result = await getCallPageData({
    db,
    bookingId,
    getUserId: async () => (await auth()).userId,
  });

  if (result.kind === "unauthenticated") {
    redirect("/sign-in");
  }

  if (result.kind === "not_found") {
    notFound();
  }

  if (result.kind === "error") {
    console.error(
      `Call page ${result.stage} lookup failed.`,
      getSafeErrorDetails(result.error)
    );
    return <CallPageRetry bookingId={bookingId} />;
  }

  const { booking, viewer, serverNow } = result;

  return (
    <CallRoom
      booking={booking}
      recordingUrl={viewer.id === booking.interviewee.id
        ? getSafeRecordingUrl(booking.recordingUrl)
        : null}
      viewer={viewer}
      apiKey={process.env.NEXT_PUBLIC_STREAM_API_KEY || null}
      serverNow={serverNow}
    />
  );
}
