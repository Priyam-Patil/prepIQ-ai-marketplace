import Link from "next/link";
import CallUI from "./CallUI";
import AIQuestions from "./AIQuestions";
import ChatRoom from "./ChatRoom";

export default function CallRoom({ booking, viewer, apiKey }) {
  const date = new Intl.DateTimeFormat("en", {
    dateStyle: "full",
    timeStyle: "short",
  }).format(booking.startTime);
  const peer = viewer.id === booking.interviewee.id ? booking.interviewer : booking.interviewee;

  return (
    <main className="min-h-screen bg-[#090909] px-5 pb-20 pt-12 text-white sm:px-8 lg:px-12">
      <div className="mx-auto max-w-6xl">
        <Link href="/appointments" className="text-sm text-amber-400 hover:text-amber-300">← Back to appointments</Link>
        <p className="mb-3 mt-8 text-sm font-semibold uppercase tracking-[0.25em] text-amber-400">Interview session</p>
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{peer.name || "Practice interview"}</h1>
        {peer.title && <p className="mt-2 text-sm text-gray-400">{[peer.title, peer.company].filter(Boolean).join(" · ")}</p>}
        <p className="mt-4 text-sm text-gray-300">{date} <span className="text-gray-500">·</span> {booking.status.toLowerCase()}</p>

        <div className="mt-8 grid gap-5 lg:grid-cols-[minmax(0,1fr)_19rem]">
          <CallUI
            bookingId={booking.id}
            streamCallId={booking.streamCallId}
            apiKey={apiKey}
            user={viewer}
            status={booking.status}
          />
          <AIQuestions categories={peer.categories || []} />
        </div>
        <div className="mt-5"><ChatRoom bookingId={booking.id} apiKey={apiKey} user={viewer} peerName={peer.name} /></div>
        {booking.recordingUrl && <a className="mt-5 inline-flex text-sm font-medium text-amber-400 hover:text-amber-300" href={booking.recordingUrl} target="_blank" rel="noreferrer">Open session recording</a>}
      </div>
    </main>
  );
}
