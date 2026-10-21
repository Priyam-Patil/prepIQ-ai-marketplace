export function reminderSchedule(startTime) {
  const start = new Date(startTime).getTime();
  return Number.isFinite(start) ? new Date(start - 60 * 60 * 1000) : null;
}

export function shouldQueueReminder(startTime, now = new Date()) {
  const scheduledFor = reminderSchedule(startTime);
  return Boolean(scheduledFor && scheduledFor > new Date(now));
}

export function buildBookingNotifications({ bookingId, startTime, interviewee, interviewer, category, appUrl, now = new Date() }) {
  const start = new Date(startTime);
  if (!Number.isFinite(start.getTime())) return [];
  const reminderAt = reminderSchedule(start);
  const dateTime = Number.isFinite(start.getTime())
    ? new Intl.DateTimeFormat("en-US", { dateStyle: "full", timeStyle: "short", timeZone: "UTC" }).format(start)
    : "Scheduled interview";
  const common = {
    interviewerName: interviewer.name || "Your interviewer",
    intervieweeName: interviewee.name || "Interviewee",
    category,
    details: "45-minute interview",
    dateTime,
    timeZone: "UTC",
    startTime: start.toISOString(),
    joinGuidance: "Open your appointments page and select Join Call when your scheduled session begins.",
    url: `${String(appUrl || "").replace(/\/$/, "")}/appointments`,
  };
  const confirmation = (role, participant) => ({
    key: `booking:${bookingId}:confirmation:${role.toLowerCase()}`,
    kind: "BOOKING_CONFIRMATION",
    recipient: participant.email,
    payload: { ...common, recipientRole: role, greeting: participant.name || "there" },
    scheduledFor: new Date(now),
  });
  const reminder = (role, participant) => ({
    key: `booking:${bookingId}:reminder:${start.getTime()}:${role.toLowerCase()}`,
    kind: "INTERVIEW_REMINDER",
    recipient: participant.email,
    payload: { ...common, greeting: participant.name || "there" },
    scheduledFor: reminderAt,
  });
  return [
    confirmation("INTERVIEWEE", interviewee),
    confirmation("INTERVIEWER", interviewer),
    ...(reminderAt && shouldQueueReminder(start, now) ? [reminder("INTERVIEWEE", interviewee), reminder("INTERVIEWER", interviewer)] : []),
  ];
}

export function retryAt(attempt, now = new Date()) {
  const delay = Math.min(60 * 60 * 1000, 30_000 * 2 ** Math.min(Math.max(attempt - 1, 0), 7));
  return new Date(new Date(now).getTime() + delay);
}

export function isValidEmail(value) {
  return typeof value === "string" && value.length <= 320 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export function escapeEmailHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[character]);
}

export function reminderMatchesBooking(booking, payload, now = new Date()) {
  return Boolean(booking && booking.status === "SCHEDULED" && booking.startTime instanceof Date && booking.startTime.toISOString() === payload?.startTime && new Date(now) < booking.startTime);
}

export async function runEmailOutbox({ rows, claim, applicable, deliver, markSent, markFailed, markSkipped }) {
  let sent = 0;
  let failed = 0;
  let skipped = 0;
  for (const row of rows) {
    if (!(await claim(row))) continue;
    try {
      if (!(await applicable(row))) {
        await markSkipped(row);
        skipped += 1;
        continue;
      }
      await deliver(row);
      await markSent(row);
      sent += 1;
    } catch (error) {
      await markFailed(row, error);
      failed += 1;
    }
  }
  return { processed: sent + failed + skipped, sent, failed, skipped };
}

export function renderNotification(notification) {
  const data = notification.payload;
  const title = notification.kind === "BOOKING_CONFIRMATION"
    ? data.recipientRole === "INTERVIEWER" ? "New interview booked on PrepIQ" : "Your PrepIQ interview is confirmed"
    : notification.kind === "INTERVIEW_REMINDER"
      ? "Your PrepIQ interview starts in one hour"
      : "Your PrepIQ interview feedback is ready";
  const rows = notification.kind === "AI_FEEDBACK"
    ? [["Summary", data.summary], ["Technical skills", data.technical], ["Communication", data.communication], ["Problem-solving", data.problemSolving], ["Recommendation", data.recommendation], ["Overall rating", data.overallRating], ["Strengths", (data.strengths || []).join(" · ")], ["Areas to improve", (data.improvements || []).join(" · ")]]
    : [["Interviewer", data.interviewerName], ["Interviewee", data.intervieweeName], ["Date and time", data.dateTime], ["Timezone", data.timeZone], ["Interview domain", data.category || "Not specified"], ["Session details", data.details || "45-minute interview"], ["Joining the session", data.joinGuidance]];
  const url = typeof data.url === "string" && /^https?:\/\//i.test(data.url) ? data.url : null;
  const htmlRows = rows.filter(([, value]) => value != null && value !== "").map(([label, value]) => `<p style="margin:12px 0"><strong>${escapeEmailHtml(label)}:</strong><br>${escapeEmailHtml(value)}</p>`).join("");
  const html = `<!doctype html><html><body style="margin:0;background:#0b1020;color:#e5e7eb;font:16px Arial,sans-serif;padding:32px"><main style="max-width:620px;margin:auto;background:#111827;border:1px solid #374151;border-radius:16px;padding:28px"><div style="color:#fbbf24;font-size:22px;font-weight:bold">PrepIQ</div><h1 style="font-size:24px">${escapeEmailHtml(title)}</h1>${data.greeting ? `<p>Hello ${escapeEmailHtml(data.greeting)},</p>` : ""}${htmlRows}${url ? `<p style="margin-top:26px"><a href="${escapeEmailHtml(url)}" style="background:#fbbf24;color:#111827;padding:12px 18px;border-radius:8px;text-decoration:none;font-weight:bold">${notification.kind === "AI_FEEDBACK" ? "View your appointments" : "Open PrepIQ"}</a></p>` : ""}</main></body></html>`;
  const text = `${title}\n\n${rows.filter(([, value]) => value != null && value !== "").map(([label, value]) => `${label}: ${value}`).join("\n")}${url ? `\n\nOpen PrepIQ: ${url}` : ""}`;
  return { subject: title, html, text };
}

export function buildResendMessage(notification, from) {
  const rendered = renderNotification(notification);
  return {
    from,
    to: [notification.recipient],
    subject: rendered.subject,
    html: rendered.html,
    text: rendered.text,
  };
}
