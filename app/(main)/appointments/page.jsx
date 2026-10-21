
import Image from "next/image";
import Link from "next/link";
import { connection } from "next/server";
import {
  CalendarDays,
  Clock3,
  Video,
  MessageSquareText,
  Sparkles,
  Star,
  ArrowUpRight,
  CheckCircle2,
  CircleX,
  Wallet,
  Compass,
} from "lucide-react";

import { getMyAppointments } from "@/actions/appointments";
import { getAppointmentCardActions } from "@/lib/recording-url.mjs";
import FeedbackModal from "./FeedbackModal";
import RecordingRefresh from "./RecordingRefresh";
import FeedbackEligibility from "./FeedbackEligibility";

// // Cache Components: use connection() in the page instead.
export const instant = false;

function formatDate(date) {
  return new Intl.DateTimeFormat("en-IN", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(date));
}

function formatTime(date) {
  return new Intl.DateTimeFormat("en-IN", {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(date));
}

function getDuration(start, end) {
  const minutes = Math.round(
    (new Date(end).getTime() - new Date(start).getTime()) / 60000
  );

  return `${Math.max(0, minutes)} min`;
}

function getStatusStyle(status) {
  switch (status) {
    case "COMPLETED":
      return "border-emerald-400/20 bg-emerald-400/10 text-emerald-300";
    case "CANCELLED":
      return "border-red-400/20 bg-red-400/10 text-red-300";
    default:
      return "border-blue-400/20 bg-blue-400/10 text-blue-300";
  }
}

function getRatingStyle(rating) {
  switch (rating) {
    case "EXCELLENT":
      return "border-emerald-400/20 bg-emerald-400/10 text-emerald-300";
    case "GOOD":
      return "border-blue-400/20 bg-blue-400/10 text-blue-300";
    case "AVERAGE":
      return "border-amber-400/20 bg-amber-400/10 text-amber-300";
    case "POOR":
      return "border-red-400/20 bg-red-400/10 text-red-300";
    default:
      return "border-white/10 bg-white/5 text-gray-400";
  }
}

function PersonAvatar({ name, imageUrl }) {
  const initials =
    name
      ?.trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0])
      .join("")
      .toUpperCase() || "?";

  return (
    <div className="relative flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-full border border-white/10 bg-amber-400/10 text-sm font-bold text-amber-300">
      {imageUrl ? (
        <Image
          src={imageUrl}
          alt={name || "User"}
          fill
          sizes="48px"
          unoptimized
          className="object-cover"
        />
      ) : (
        initials
      )}
    </div>
  );
}

function AppointmentCard({
  appointment,
  isInterviewee,
  serverNow,
}) {
  const person = isInterviewee
    ? appointment.interviewer
    : appointment.interviewee;

  const isCompleted = appointment.status === "COMPLETED";
  const isCancelled = appointment.status === "CANCELLED";
  const hasFeedback = Boolean(appointment.feedback);

  const performance = appointment.feedback?.overallRating;

  return (
    <article className="rounded-2xl border border-white/10 bg-gradient-to-br from-[#1c1a12] via-[#111111] to-[#0d0d0d] p-5 shadow-lg shadow-black/20 transition hover:border-amber-400/25 sm:p-6">
      <div className="flex flex-col gap-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <PersonAvatar
              name={person?.name}
              imageUrl={person?.imageUrl}
            />

            <div className="min-w-0">
              <h2 className="truncate font-semibold text-white">
                {person?.name ||
                  (isInterviewee ? "Interviewer" : "Interviewee")}
              </h2>

              {isInterviewee && (
                <p className="mt-1 truncate text-xs text-gray-400">
                  {[
                    appointment.interviewer?.title,
                    appointment.interviewer?.company,
                  ]
                    .filter(Boolean)
                    .join(" · ") || "Interviewer"}
                </p>
              )}
            </div>
          </div>

          <div className="flex shrink-0 flex-col items-end gap-2">
            <span
              className={`rounded-full border px-2.5 py-1 text-xs font-medium ${getStatusStyle(
                appointment.status
              )}`}
            >
              {appointment.status.toLowerCase()}
            </span>

            <span className="rounded-full border border-amber-400/20 bg-amber-400/10 px-2.5 py-1 text-xs text-amber-300">
              -{appointment.creditsCharged} credits
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 border-y border-white/10 py-4 sm:grid-cols-3">
          <div>
            <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-gray-500">
              <CalendarDays size={13} />
              Date
            </p>
            <p className="mt-2 text-sm text-gray-200">
              {formatDate(appointment.startTime)}
              {appointment.category && (
                <span className="ml-2 text-amber-300">
                  · {appointment.category.replaceAll("_", " ")}
                </span>
              )}
            </p>
          </div>

          <div>
            <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-gray-500">
              <Clock3 size={13} />
              Time
            </p>
            <p className="mt-2 text-sm text-gray-200">
              {formatTime(appointment.startTime)} –{" "}
              {formatTime(appointment.endTime)}
            </p>
          </div>

          <div>
            <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-gray-500">
              <Video size={13} />
              Duration
            </p>
            <p className="mt-2 text-sm text-gray-200">
              {getDuration(
                appointment.startTime,
                appointment.endTime
              )}
            </p>
          </div>
        </div>

        {hasFeedback && isCompleted && (
          <section className="rounded-xl border border-white/10 bg-black/20 p-4">
            <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-gray-500">
              <Sparkles size={13} />
              AI feedback
            </div>

            <p className="mt-2 line-clamp-3 text-sm leading-6 text-gray-300">
              {appointment.feedback.summary}
            </p>

            <FeedbackModal feedback={appointment.feedback} />
          </section>
        )}

        {!hasFeedback && isCompleted && (
          <div className="rounded-xl border border-white/10 bg-black/20 p-4">
            <p className="text-sm text-gray-400">
              AI feedback is not available for this session yet.
            </p>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            {getAppointmentCardActions(appointment).map((action) =>
              action.type === "recording" ? (
                <a
                  key={action.type}
                  href={action.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-lg border border-white/15 px-3 py-2 text-sm text-gray-200 transition hover:border-amber-400/50 hover:text-amber-300"
                >
                  <Video size={15} />
                  {action.label}
                  <ArrowUpRight size={13} />
                </a>
              ) : (
                <Link
                  key={action.type}
                  href={action.href}
                  className={action.completed
                    ? "inline-flex items-center gap-2 rounded-lg border border-white/15 px-3 py-2 text-sm text-gray-200 transition hover:border-amber-400/50"
                    : "inline-flex items-center gap-2 rounded-lg bg-amber-400 px-4 py-2.5 text-sm font-semibold text-black transition hover:bg-amber-300"}
                >
                  {action.completed ? <MessageSquareText size={15} /> : <Video size={15} />}
                  {action.label}
                </Link>
              )
            )}
            {isInterviewee && appointment.status !== "CANCELLED" && (
              <FeedbackEligibility
                bookingId={appointment.id}
                endTime={appointment.endTime.toISOString()}
                serverNow={serverNow}
                submitted={Boolean(appointment.sessionFeedback)}
                cancelled={isCancelled}
              />
            )}
          </div>

          {performance && (
            <span
              className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${getRatingStyle(
                performance
              )}`}
            >
              <Star size={12} />
              {performance.toLowerCase().replace("_", " ")} performance
            </span>
          )}

          {isCancelled && (
            <span className="inline-flex items-center gap-1 text-xs text-red-300">
              <CircleX size={13} />
              Cancelled
            </span>
          )}

          {isCompleted && !performance && (
            <span className="inline-flex items-center gap-1 text-xs text-emerald-300">
              <CheckCircle2 size={13} />
              Completed
            </span>
          )}
        </div>
      </div>
    </article>
  );
}

function AppointmentSection({
  title,
  appointments,
  isInterviewee,
  serverNow,
}) {
  if (appointments.length === 0) return null;

  return (
    <section className="mt-10">
      <div className="mb-4 flex items-center gap-4">
        <h2 className="shrink-0 text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">
          {title} ({appointments.length})
        </h2>
        <div className="h-px flex-1 bg-white/10" />
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        {appointments.map((appointment) => (
          <AppointmentCard
            key={appointment.id}
            appointment={appointment}
            isInterviewee={isInterviewee}
            serverNow={serverNow}
          />
        ))}
      </div>
    </section>
  );
}

export default async function AppointmentsPage() {
  await connection();

  const result = await getMyAppointments();

  if (!result.ok) {
    return (
      <main className="min-h-screen bg-[#090909] px-4 pb-20 pt-10 text-white sm:px-8 sm:pt-12 lg:px-12">
        <section
          role="alert"
          className="mx-auto mt-12 max-w-2xl rounded-2xl border border-red-400/20 bg-red-400/5 p-8"
        >
          <h1 className="text-xl font-semibold">Appointments could not be loaded</h1>
          <p className="mt-2 text-sm text-gray-400">
            Your appointments are still safe. Please try loading this page again.
          </p>
          <a
            href="/appointments"
            className="mt-6 inline-flex rounded-lg bg-amber-400 px-4 py-2.5 text-sm font-semibold text-black hover:bg-amber-300"
          >
            Retry
          </a>
        </section>
      </main>
    );
  }

  const { role, currentPlan, appointments, serverNow } = result;

  const isInterviewee = role === "INTERVIEWEE";
  const isPro = currentPlan?.toLowerCase() === "pro";
  // The server action supplies this timestamp to keep render deterministic.
  const now = new Date(serverNow).getTime();

  const upcoming = appointments
    .filter(
      (appointment) =>
        appointment.status === "SCHEDULED" &&
        new Date(appointment.endTime).getTime() >= now
    )
    .sort(
      (a, b) =>
        new Date(a.startTime).getTime() -
        new Date(b.startTime).getTime()
    );

  const past = appointments.filter(
    (appointment) =>
      appointment.status !== "SCHEDULED" ||
      new Date(appointment.endTime).getTime() < now
  );

  return (
    <main className="min-h-screen bg-[#090909] px-4 pb-20 pt-10 text-white sm:px-8 sm:pt-12 lg:px-12">
      <RecordingRefresh />
      <div className="mx-auto max-w-6xl">
        <div className="border-b border-white/10 pb-9">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.25em] text-amber-400">
            — My appointments
          </p>

          <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
            <div>
              <h1 className="font-serif text-4xl tracking-tight sm:text-5xl">
                Your interview{" "}
                <span className="text-amber-400">sessions</span>
              </h1>
              <p className="mt-3 max-w-xl text-sm leading-6 text-gray-400">
                All your upcoming and past mock interviews in one place.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-xs text-gray-300">
                <Wallet size={14} className="text-amber-400" />
                {isPro ? "Pro plan" : "Free plan"}
              </span>

              {isInterviewee && (
                <>
                  <Link
                    href="/ai-chat"
                    className="inline-flex items-center gap-2 rounded-lg border border-amber-400/30 bg-white/[0.03] px-4 py-2.5 text-sm font-semibold text-amber-200 hover:bg-amber-400/10"
                  >
                    <Sparkles size={15} />
                    AI interview prep
                  </Link>
                  <Link
                    href="/explore"
                    className="inline-flex items-center gap-2 rounded-lg bg-amber-400 px-4 py-2.5 text-sm font-semibold text-black hover:bg-amber-300"
                  >
                    <Compass size={15} />
                    Explore
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>

        {role !== "INTERVIEWEE" && role !== "INTERVIEWER" ? (
          <section className="mt-10 rounded-2xl border border-white/10 bg-white/[0.03] p-8 text-center">
            <CalendarDays className="mx-auto size-9 text-amber-400" />
            <h2 className="mt-4 text-lg font-semibold">
              Complete your profile
            </h2>
            <p className="mt-2 text-sm text-gray-400">
              Choose your role to access your appointments.
            </p>
            <Link
              href="/onboarding"
              className="mt-6 inline-flex rounded-lg bg-amber-400 px-5 py-3 text-sm font-semibold text-black hover:bg-amber-300"
            >
              Continue onboarding
            </Link>
          </section>
        ) : appointments.length === 0 ? (
          <section className="mt-10 rounded-2xl border border-white/10 bg-white/[0.03] p-8 text-center">
            <CalendarDays className="mx-auto size-9 text-amber-400" />
            <h2 className="mt-4 text-lg font-semibold">
              No appointments yet
            </h2>
            <p className="mt-2 text-sm text-gray-400">
              {isInterviewee
                ? "Explore interviewers to book your first practice session."
                : "Your scheduled sessions will appear here."}
            </p>
            {isInterviewee && (
              <Link
                href="/explore"
                className="mt-6 inline-flex rounded-lg bg-amber-400 px-5 py-3 text-sm font-semibold text-black hover:bg-amber-300"
              >
                Explore interviewers
              </Link>
            )}
          </section>
        ) : (
          <>
            <AppointmentSection
              title="Upcoming"
              appointments={upcoming}
              isInterviewee={isInterviewee}
              serverNow={serverNow}
            />

            <AppointmentSection
              title="Past"
              appointments={past}
              isInterviewee={isInterviewee}
              serverNow={serverNow}
            />
          </>
        )}

      </div>
    </main>
  );
}
