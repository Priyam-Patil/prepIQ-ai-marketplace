export function getSafeRecordingUrl(value) {
  if (typeof value !== "string" || !value.trim()) return null;

  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.username || url.password) return null;
    return url.toString();
  } catch {
    return null;
  }
}

export function getAppointmentCardActions(appointment) {
  if (!appointment || appointment.status === "CANCELLED") return [];

  const actions = [];
  if (appointment.streamCallId) {
    const completed = appointment.status === "COMPLETED";
    actions.push({
      type: "call",
      href: `/call/${appointment.id}`,
      label: completed ? "Open session" : "Join Call",
      completed,
    });
  }

  const recordingUrl = getSafeRecordingUrl(appointment.recordingUrl);
  if (recordingUrl) {
    actions.push({ type: "recording", href: recordingUrl, label: "Recording" });
  }
  return actions;
}
