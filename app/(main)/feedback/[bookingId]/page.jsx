import { connection } from "next/server";
import { getSessionFeedbackPage } from "@/actions/sessionFeedback";
import SessionFeedbackForm from "./SessionFeedbackForm";

export const instant = false;

export default async function SessionFeedbackPage({ params }) {
  await connection();
  const { bookingId } = await params;
  const { booking, eligible } = await getSessionFeedbackPage(bookingId);

  return (
    <main className="min-h-screen w-full bg-[#090909] px-5 py-12 text-white sm:px-8">
      <section className="mx-auto max-w-xl rounded-2xl border border-white/10 bg-white/[0.03] p-6 sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-400">PrepIQ · Session feedback</p>
        <h1 className="mt-3 text-2xl font-semibold">How was your interview?</h1>
        <p className="mt-2 text-sm text-gray-400">Your feedback helps improve future sessions with {booking.interviewer.name || "your interviewer"}.</p>
        {booking.sessionFeedback ? (
          <p className="mt-6 rounded-xl border border-emerald-400/20 bg-emerald-400/5 p-4 text-sm text-emerald-200" role="status">Feedback Submitted · {booking.sessionFeedback.rating}/5</p>
        ) : eligible ? (
          <SessionFeedbackForm bookingId={booking.id} />
        ) : (
          <p className="mt-6 rounded-xl border border-white/10 p-4 text-sm text-gray-400">Feedback is available after the scheduled end time. Cancelled interviews are not eligible.</p>
        )}
      </section>
    </main>
  );
}
