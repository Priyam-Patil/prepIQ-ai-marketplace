import test from "node:test";
import assert from "node:assert/strict";
import { getCallPageData } from "../lib/call-page-data.mjs";

const booking = {
  id: "booking-1",
  status: "SCHEDULED",
  streamCallId: "stream-call-1",
  startTime: new Date("2030-05-12T09:00:00Z"),
  endTime: new Date("2030-05-12T09:45:00Z"),
  recordingUrl: "https://recordings.example.test/booking-1.mp4",
  interviewee: {
    id: "db-interviewee",
    clerkUserId: "clerk-interviewee",
    name: "Candidate",
    imageUrl: null,
  },
  interviewer: {
    id: "db-interviewer",
    clerkUserId: "clerk-interviewer",
    name: "Interviewer",
    imageUrl: null,
    title: "Engineer",
    company: "Example",
    categories: ["BACKEND"],
  },
};

function dbFor(record = booking, error = null) {
  return {
    booking: {
      async findUnique(args) {
        assert.deepEqual(args.where, { id: "booking-1" });
        if (error) throw error;
        return record;
      },
    },
  };
}

test("authenticated booking participant receives the correct Stream call and participant identity", async () => {
  const result = await getCallPageData({
    db: dbFor(),
    bookingId: "booking-1",
    getUserId: async () => "clerk-interviewee",
  });

  assert.equal(result.kind, "success");
  assert.equal(result.booking.streamCallId, "stream-call-1");
  assert.equal(result.viewer.id, "db-interviewee");
  assert.equal(result.viewer.clerkUserId, "clerk-interviewee");
  assert.equal(typeof result.serverNow, "string");
});

test("interviewer page data omits the interviewee-only recording URL", async () => {
  const result = await getCallPageData({
    db: dbFor(),
    bookingId: booking.id,
    getUserId: async () => "clerk-interviewer",
  });
  assert.equal(result.kind, "success");
  assert.equal(result.booking.recordingUrl, null);
});

test("unauthenticated visitor is distinguished from an authentication provider failure", async () => {
  const unauthenticated = await getCallPageData({
    db: dbFor(),
    bookingId: "booking-1",
    getUserId: async () => null,
  });
  assert.deepEqual(unauthenticated, { kind: "unauthenticated" });

  const providerError = Object.assign(new Error("Clerk unavailable"), { code: "CLERK_DOWN" });
  const failed = await getCallPageData({
    db: dbFor(),
    bookingId: "booking-1",
    getUserId: async () => { throw providerError; },
  });
  assert.equal(failed.kind, "error");
  assert.equal(failed.stage, "authentication");
  assert.equal(failed.error, providerError);
});

test("nonparticipants and missing or cancelled bookings retain not-found behavior", async () => {
  for (const record of [null, { ...booking, status: "CANCELLED" }, { ...booking, streamCallId: null }]) {
    const result = await getCallPageData({
      db: dbFor(record),
      bookingId: "booking-1",
      getUserId: async () => "clerk-interviewee",
    });
    assert.equal(result.kind, "not_found");
  }

  const outsider = await getCallPageData({
    db: dbFor(),
    bookingId: "booking-1",
    getUserId: async () => "clerk-outsider",
  });
  assert.equal(outsider.kind, "not_found");
});

test("database failures produce a retryable error result instead of not-found", async () => {
  const error = Object.assign(new Error("database unavailable"), { code: "DB_DOWN" });
  const result = await getCallPageData({
    db: dbFor(booking, error),
    bookingId: "booking-1",
    getUserId: async () => "clerk-interviewer",
  });
  assert.equal(result.kind, "error");
  assert.equal(result.stage, "database");
  assert.equal(result.error, error);
});
