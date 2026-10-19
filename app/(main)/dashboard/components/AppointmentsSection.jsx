import Link from "next/link";

function formatDate(date) {
  return new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

export default function AppointmentsSection({ appointments }) {
  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-400">Sessions</p>
          <h2 className="mt-2 text-xl font-semibold">Appointments</h2>
        </div>
        <Link className="text-sm text-amber-400 hover:text-amber-300" href="/appointments">All appointments →</Link>
      </div>
      {appointments.length ? (
        <ul className="mt-5 divide-y divide-white/10">
          {appointments.slice(0, 6).map((appointment) => (
            <li key={appointment.id} className="flex flex-col justify-between gap-3 py-4 sm:flex-row sm:items-center">
              <div>
                <p className="font-medium">{appointment.interviewee.name || "Interviewee"}</p>
                <p className="mt-1 text-sm text-gray-400">{formatDate(appointment.startTime)} · {appointment.status.toLowerCase()}</p>
              </div>
              {appointment.streamCallId ? (
                <Link href={`/call/${appointment.id}`} className="rounded-lg border border-amber-400/30 px-3 py-2 text-center text-sm text-amber-300 hover:bg-amber-400/10">{appointment.status === "SCHEDULED" ? "Open session" : "Open chat"}</Link>
              ) : <span className="text-xs text-gray-500">{appointment.recordingUrl ? <a href={appointment.recordingUrl} target="_blank" rel="noreferrer" className="text-amber-300">View recording</a> : "No recording"}</span>}
            </li>
          ))}
        </ul>
      ) : <p className="mt-5 text-sm text-gray-400">No interview sessions booked yet.</p>}
    </section>
  );
}
