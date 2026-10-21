import test from "node:test";
import assert from "node:assert/strict";
import { getDashboardAppointments } from "../lib/dashboard-appointments.mjs";

test("interviewer dashboard selects the booking's stored category and participant display name", async () => {
  const storedAppointment = {
    id: "booking-1",
    category: "FRONTEND",
    interviewee: { name: "Candidate" },
  };
  let query;
  const result = await getDashboardAppointments({
    booking: {
      async findMany(args) {
        query = args;
        return [storedAppointment];
      },
    },
  }, "interviewer-db-id");

  assert.deepEqual(query.where, { interviewerId: "interviewer-db-id" });
  assert.equal(query.select.category, true);
  assert.equal(query.select.interviewee.select.name, true);
  assert.deepEqual(result, [storedAppointment]);
});
