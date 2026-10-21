import test from "node:test";
import assert from "node:assert/strict";
import { getAppointmentCardActions, getSafeRecordingUrl } from "../lib/recording-url.mjs";

test("appointment actions keep Join Call immediately before an available recording", () => {
  const actions = getAppointmentCardActions({
    id: "booking-1",
    status: "SCHEDULED",
    streamCallId: "stream-call-1",
    recordingUrl: "https://cdn.example.test/session.mp4",
  });

  assert.deepEqual(actions.map(({ type, label }) => [type, label]), [
    ["call", "Join Call"],
    ["recording", "Recording"],
  ]);
  assert.equal(actions[0].href, "/call/booking-1");
  assert.equal(actions[1].href, "https://cdn.example.test/session.mp4");
});

test("appointment actions omit absent, malformed, and cancelled recordings", () => {
  const appointment = { id: "booking-1", status: "COMPLETED", streamCallId: "stream-call-1" };
  assert.deepEqual(getAppointmentCardActions(appointment).map((item) => item.type), ["call"]);
  assert.deepEqual(getAppointmentCardActions({ ...appointment, recordingUrl: "javascript:alert(1)" }).map((item) => item.type), ["call"]);
  assert.deepEqual(getAppointmentCardActions({ ...appointment, status: "CANCELLED", recordingUrl: "https://cdn.example.test/session.mp4" }), []);
  assert.equal(getSafeRecordingUrl("https://user:secret@cdn.example.test/session.mp4"), null);
});

test("completed appointments preserve the session link and show the recording after it", () => {
  const actions = getAppointmentCardActions({
    id: "booking-2",
    status: "COMPLETED",
    streamCallId: "stream-call-2",
    recordingUrl: "https://cdn.example.test/session-2.mp4",
  });
  assert.equal(actions[0].label, "Open session");
  assert.equal(actions[0].href, "/call/booking-2");
  assert.equal(actions[1].type, "recording");
});
