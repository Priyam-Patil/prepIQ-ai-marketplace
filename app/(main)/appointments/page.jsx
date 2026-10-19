import Link from "next/link";
import { CalendarClock, Video } from "lucide-react";
import { getMyAppointments } from "@/actions/appointments";
import { connection } from "next/server";

export const instant = false;

function formatDate(date) {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export default async function AppointmentsPage() {
  await connection();
  const { role, appointments } = await getMyAppointments();
  const isInterviewee = role === "INTERVIEWEE";

  return (
    <main className="min-h-screen bg-[#090909] px-5 pb-20 pt-12 text-white sm:px-8 lg:px-12">
      <div className="mx-auto max-w-5xl">
        <p className="mb-3 text-sm font-semibold uppercase tracking-[0.25em] text-amber-400">
          Your sessions
        </p>
        <h1 className="text-3xl font-bold tracking-tight sm:text-5xl">My Appointments</h1>
        <p className="mt-4 max-w-2xl text-sm leading-7 text-gray-400 sm:text-base">
          Review your booked interview sessions, meeting times, and available feedback.
        </p>

        {appointments.length === 0 ? (
          <section className="mt-10 rounded-2xl border border-white/10 bg-white/[0.03] p-8 text-center">
            <CalendarClock className="mx-auto size-8 text-amber-400" aria-hidden="true" />
            <h2 className="mt-4 text-lg font-semibold">No appointments yet</h2>
            <p className="mt-2 text-sm text-gray-400">
              {isInterviewee ? "Explore interviewers to book a practice session." : "Your scheduled sessions will appear here."}
            </p>
            {isInterviewee && <Link className="mt-6 inline-flex rounded-lg bg-amber-400 px-5 py-3 text-sm font-semibold text-black hover:bg-amber-300" href="/explore">Explore interviewers</Link>}
          </section>
        ) : (
          <ul className="mt-10 grid gap-4">
            {appointments.map((appointment) => (
              <li key={appointment.id} className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 sm:p-6">
                <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
                  <div>
                    <div className="flex flex-wrap items-center gap-3">
                      <h2 className="text-lg font-semibold">
                        {isInterviewee ? appointment.interviewer.name || "Interviewer" : appointment.interviewee.name || "Interviewee"}
                      </h2>
                      <span className="rounded-full border border-white/10 px-3 py-1 text-xs text-gray-300">{appointment.status.toLowerCase()}</span>
                    </div>
                    {isInterviewee && <p className="mt-1 text-sm text-gray-400">{[appointment.interviewer.title, appointment.interviewer.company].filter(Boolean).join(" · ")}</p>}
                    <p className="mt-4 text-sm text-gray-300">
                      {formatDate(appointment.startTime)} – {formatDate(appointment.endTime)}
                    </p>
                    {isInterviewee && appointment.feedback && <p className="mt-3 line-clamp-2 text-sm text-gray-400">Feedback: {appointment.feedback.summary}</p>}
                  </div>
                  <div className="flex flex-wrap gap-3">
                    {appointment.streamCallId && <Link href={`/call/${appointment.id}`} className="inline-flex items-center gap-2 rounded-lg bg-amber-400 px-4 py-2.5 text-sm font-semibold text-black hover:bg-amber-300"><Video size={16} aria-hidden="true" />{appointment.status === "SCHEDULED" ? "Open session" : "Open chat"}</Link>}
                    {appointment.status === "SCHEDULED" && !appointment.streamCallId && <span className="rounded-lg border border-white/10 px-4 py-2.5 text-sm text-gray-500">Call not ready</span>}
                    {appointment.recordingUrl && <a href={appointment.recordingUrl} target="_blank" rel="noreferrer" className="rounded-lg border border-white/15 px-4 py-2.5 text-sm text-gray-200 hover:border-amber-400/50">View recording</a>}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
