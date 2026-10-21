import test from "node:test";
import assert from "node:assert/strict";
import { getAppointmentsForUser } from "../lib/appointments.mjs";

function makeDb({ role = "INTERVIEWEE", failBookingQuery = false } = {}) {
  const bookingQueries = [];
  const appointment = {
    id: "booking-1",
    status: "SCHEDULED",
    recordingUrl: "https://recordings.example.test/booking-1.mp4",
    category: "FRONTEND",
    interviewee: { name: "Candidate", imageUrl: null },
    interviewer: { name: "Interviewer", imageUrl: null, title: "Engineer", company: "Example" },
    feedback: null,
  };
  return {
    bookingQueries,
    db: {
      user: {
        async findUnique(args) {
          assert.deepEqual(args.where, { clerkUserId: "clerk-user-1" });
          return { id: "db-user-1", role, currentPlan: "free" };
        },
      },
      booking: {
        async findMany(args) {
          bookingQueries.push(args);
          if (failBookingQuery) throw Object.assign(new Error("database unavailable"), { code: "DB_DOWN" });
          return args.where.status === "SCHEDULED" ? [appointment] : [];
        },
      },
    },
  };
}

test("appointments query is scoped to the authenticated interviewee and returns their data", async () => {
  const { db, bookingQueries } = makeDb();
  const result = await getAppointmentsForUser(db, "clerk-user-1");

  assert.equal(result.role, "INTERVIEWEE");
  assert.equal(result.appointments[0].id, "booking-1");
  assert.equal(result.appointments[0].recordingUrl, "https://recordings.example.test/booking-1.mp4");
  assert.equal(bookingQueries[0].where.intervieweeId, "db-user-1");
});

test("interviewer appointments are scoped to the authenticated interviewer", async () => {
  const { db, bookingQueries } = makeDb({ role: "INTERVIEWER" });
  const result = await getAppointmentsForUser(db, "clerk-user-1");
  assert.equal(bookingQueries[0].where.interviewerId, "db-user-1");
  assert.equal(result.appointments[0].recordingUrl, null);
  assert.equal("recordingUrl" in bookingQueries[0].select, false);
});

test("appointment lists order upcoming first ascending and past descending in database queries", async () => {
  const { db, bookingQueries } = makeDb();
  const now = new Date("2030-01-01T00:00:00Z");
  await getAppointmentsForUser(db, "clerk-user-1", now);
  assert.deepEqual(bookingQueries[0].orderBy, { startTime: "asc" });
  assert.deepEqual(bookingQueries[1].orderBy, { startTime: "desc" });
  assert.deepEqual(bookingQueries[0].where.endTime, { gte: now });
  assert.deepEqual(bookingQueries[1].where.OR[1], { status: "SCHEDULED", endTime: { lt: now } });
});

test("database query failures propagate and cannot be mistaken for empty appointments", async () => {
  const { db } = makeDb({ failBookingQuery: true });
  await assert.rejects(getAppointmentsForUser(db, "clerk-user-1"), (error) => error.code === "DB_DOWN");
});
