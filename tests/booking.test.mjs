import test from "node:test";
import assert from "node:assert/strict";
import { StreamClient } from "@stream-io/node-sdk";
import { getOpenSlotsForDay, isValidBookingInterval, SESSION_DURATION_MS } from "../lib/booking-rules.mjs";
import { persistBookingTransaction } from "../lib/booking-transaction.mjs";
import { isBookingParticipant } from "../lib/access-control.mjs";
import { allocatePlanCreditsOnce } from "../lib/credit-allocation.mjs";
import { getCallTokenValiditySeconds, getSessionDisplayState, getVideoJoinAccessError, issueVideoTokenForBooking } from "../lib/session-access.mjs";

const day = "2030-05-12T00:00:00.000Z";
const availability = [{
  startTime: new Date("2030-05-12T09:00:00.000Z"),
  endTime: new Date("2030-05-12T11:15:00.000Z"),
}];
const fixedNow = new Date("2030-05-01T00:00:00.000Z");

test("slot generation uses 45-minute boundaries anchored to availability", () => {
  const slots = getOpenSlotsForDay({
    availability,
    bookings: [],
    dayStart: day,
    dayEnd: "2030-05-13T00:00:00.000Z",
    now: fixedNow,
  });

  assert.deepEqual(slots.map((slot) => slot.startTime), [
    "2030-05-12T09:00:00.000Z",
    "2030-05-12T09:45:00.000Z",
    "2030-05-12T10:30:00.000Z",
  ]);
  assert.ok(slots.every((slot) => new Date(slot.endTime) - new Date(slot.startTime) === SESSION_DURATION_MS));
});

test("slot generation removes every slot that intersects a scheduled booking", () => {
  const slots = getOpenSlotsForDay({
    availability,
    bookings: [{ startTime: "2030-05-12T09:20:00Z", endTime: "2030-05-12T10:05:00Z" }],
    dayStart: day,
    dayEnd: "2030-05-13T00:00:00.000Z",
    now: fixedNow,
  });

  assert.deepEqual(slots.map((slot) => slot.startTime), ["2030-05-12T10:30:00.000Z"]);
});

test("booking interval validation rejects non-grid starts, partial sessions, past slots, and out-of-window slots", () => {
  assert.equal(isValidBookingInterval(new Date("2030-05-12T09:00:00Z"), new Date("2030-05-12T09:45:00Z"), availability, fixedNow), true);
  assert.equal(isValidBookingInterval(new Date("2030-05-12T09:05:00Z"), new Date("2030-05-12T09:50:00Z"), availability, fixedNow), false);
  assert.equal(isValidBookingInterval(new Date("2030-05-12T10:30:00Z"), new Date("2030-05-12T11:14:00Z"), availability, fixedNow), false);
  assert.equal(isValidBookingInterval(new Date("2030-05-12T10:45:00Z"), new Date("2030-05-12T11:30:00Z"), availability, fixedNow), false);
  assert.equal(isValidBookingInterval(new Date("2030-04-12T09:00:00Z"), new Date("2030-04-12T09:45:00Z"), availability, fixedNow), false);
});

function makeTransaction({ conflict = null, debitCount = 1 } = {}) {
  const calls = [];
  const tx = {
    availability: {
      findMany: async () => availability,
    },
    booking: {
      findFirst: async () => conflict,
      create: async (args) => {
        calls.push(["booking.create", args]);
        return { id: args.data.id, startTime: args.data.startTime, endTime: args.data.endTime };
      },
    },
    user: {
      updateMany: async (args) => {
        calls.push(["user.updateMany", args]);
        return { count: debitCount };
      },
    },
    creditTransaction: {
      create: async (args) => calls.push(["creditTransaction.create", args]),
    },
    emailNotification: {
      createMany: async (args) => { calls.push(["emailNotification.createMany", args]); return { count: args.data.length }; },
    },
  };
  return { tx, calls };
}

const transactionInput = {
  intervieweeId: "candidate-local-id",
  interviewerId: "interviewer-local-id",
  start: new Date("2030-05-12T09:00:00Z"),
  end: new Date("2030-05-12T09:45:00Z"),
  cost: 2,
  streamCallId: "booking-uuid",
  category: "FRONTEND",
  now: fixedNow,
};

test("booking transaction debits, creates booking, and writes one deduction ledger row", async () => {
  const { tx, calls } = makeTransaction();
  const booking = await persistBookingTransaction(tx, transactionInput);

  assert.equal(booking.id, "booking-uuid");
  assert.deepEqual(calls.map(([name]) => name), ["user.updateMany", "booking.create", "creditTransaction.create"]);
  assert.equal(calls[0][1].data.credits.decrement, 2);
  assert.equal(calls[1][1].data.category, "FRONTEND");
  assert.equal(calls[2][1].data.amount, -2);
  assert.equal(calls[2][1].data.type, "BOOKING_DEDUCTION");
});

test("booking confirmations and reminder jobs are committed with booking persistence", async () => {
  const { tx, calls } = makeTransaction();
  const notifications = [
    { key: "booking:b1:confirm:i", kind: "BOOKING_CONFIRMATION", recipient: "candidate@example.com", payload: {}, scheduledFor: fixedNow },
    { key: "booking:b1:reminder:i", kind: "INTERVIEW_REMINDER", recipient: "candidate@example.com", payload: {}, scheduledFor: fixedNow },
  ];
  await persistBookingTransaction(tx, { ...transactionInput, notifications });
  const write = calls.find(([name]) => name === "emailNotification.createMany")[1];
  assert.deepEqual(write.data.map((row) => row.key), notifications.map((row) => row.key));
  assert.ok(write.data.every((row) => row.bookingId === "booking-uuid"));
});

test("booking conflict prevents credit debit and record creation", async () => {
  const { tx, calls } = makeTransaction({ conflict: { id: "existing-booking" } });
  await assert.rejects(persistBookingTransaction(tx, transactionInput), /just booked/);
  assert.deepEqual(calls, []);
});

test("an overlapping booking for the interviewee prevents debit before Stream persistence", async () => {
  const { tx, calls } = makeTransaction();
  tx.booking.findFirst = async ({ where }) => where.intervieweeId
    ? { id: "existing-interviewee-booking" }
    : null;
  await assert.rejects(
    persistBookingTransaction(tx, transactionInput),
    /already have an interview booked during this time/
  );
  assert.deepEqual(calls, []);
});

test("insufficient credits prevent booking and ledger writes", async () => {
  const { tx, calls } = makeTransaction({ debitCount: 0 });
  await assert.rejects(persistBookingTransaction(tx, transactionInput), /credit balance changed/);
  assert.deepEqual(calls.map(([name]) => name), ["user.updateMany"]);
});

test("participant authorization accepts only the two booking members", () => {
  const booking = {
    interviewee: { clerkUserId: "clerk-candidate" },
    interviewer: { clerkUserId: "clerk-interviewer" },
  };
  assert.equal(isBookingParticipant(booking, "clerk-candidate"), true);
  assert.equal(isBookingParticipant(booking, "clerk-interviewer"), true);
  assert.equal(isBookingParticipant(booking, "clerk-other"), false);
  assert.equal(isBookingParticipant(booking, null), false);
});

test("video token policy denies nonparticipants, cancelled, future, and expired sessions", () => {
  const booking = {
    status: "SCHEDULED",
    streamCallId: "stream-call-id",
    startTime: new Date("2030-05-12T09:00:00Z"),
    endTime: new Date("2030-05-12T09:45:00Z"),
    interviewee: { clerkUserId: "clerk-candidate" },
    interviewer: { clerkUserId: "clerk-interviewer" },
  };
  const before = new Date("2030-05-12T08:59:59Z").getTime();
  const during = new Date("2030-05-12T09:20:00Z").getTime();
  const after = new Date("2030-05-12T09:45:00Z").getTime();

  assert.equal(getVideoJoinAccessError(booking, "clerk-outsider", during), "This session is unavailable.");
  assert.equal(getVideoJoinAccessError(booking, "clerk-candidate", before), "Your session has not started yet.");
  assert.equal(getVideoJoinAccessError({ ...booking, status: "CANCELLED" }, "clerk-candidate", during), "This session is not currently scheduled.");
  assert.equal(getVideoJoinAccessError(booking, "clerk-interviewer", after), "This session has ended.");
  assert.equal(getVideoJoinAccessError(booking, "clerk-candidate", during), null);
});

test("video token expiry never extends past the booking end", () => {
  const now = new Date("2030-05-12T09:44:30Z").getTime();
  assert.equal(getCallTokenValiditySeconds("2030-05-12T09:45:00Z", now), 30);
  assert.equal(getCallTokenValiditySeconds("2030-05-12T09:45:00Z", now + 30_000), 0);
});

test("pre-interview display state has no countdown while scheduled timing remains available", () => {
  const start = "2030-05-12T09:00:00Z";
  const end = "2030-05-12T09:45:00Z";
  assert.equal(getSessionDisplayState("SCHEDULED", start, end, new Date("2030-05-12T08:00:00Z")), "PRESTART");
  assert.equal(getSessionDisplayState("SCHEDULED", start, end, new Date("2030-05-12T09:00:00Z")), "READY");
  assert.equal(getSessionDisplayState("SCHEDULED", start, end, new Date("2030-05-12T09:45:00Z")), "ENDED");
  assert.equal(getSessionDisplayState("CANCELLED", start, end, new Date("2030-05-12T08:00:00Z")), "UNAVAILABLE");
});

test("video token issuer mints only for a participant during the booking window", () => {
  const booking = {
    id: "booking-id",
    status: "SCHEDULED",
    streamCallId: "call-id",
    startTime: "2030-05-12T09:00:00Z",
    endTime: "2030-05-12T09:45:00Z",
    interviewee: { id: "db-interviewee", clerkUserId: "clerk-interviewee" },
    interviewer: { id: "db-interviewer", clerkUserId: "clerk-interviewer" },
  };
  const now = new Date("2030-05-12T09:20:00Z").getTime();
  const issued = [];
  const stream = { generateCallToken: (payload) => (issued.push(payload), "signed-token") };

  assert.equal(issueVideoTokenForBooking(booking, "clerk-interviewee", stream, now), "signed-token");
  assert.deepEqual(issued, [{ user_id: "db-interviewee", call_cids: ["default:call-id"], validity_in_seconds: 1500 }]);
  for (const [target, time] of [
    ["clerk-outsider", now],
    ["clerk-interviewee", new Date("2030-05-12T08:59:59Z").getTime()],
    ["clerk-interviewee", new Date("2030-05-12T09:45:00Z").getTime()],
  ]) {
    assert.throws(() => issueVideoTokenForBooking(booking, target, stream, time));
  }
  assert.throws(() => issueVideoTokenForBooking({ ...booking, status: "CANCELLED" }, "clerk-interviewee", stream, now));
  assert.equal(issued.length, 1);
  issueVideoTokenForBooking(booking, "clerk-interviewer", stream, now);
  assert.deepEqual(issued[1], {
    user_id: "db-interviewer",
    call_cids: ["default:call-id"],
    validity_in_seconds: 1500,
  });
});

test("installed Stream SDK call tokens use a backdated iat and remain call scoped", () => {
  const stream = new StreamClient("diagnostic-key", "diagnostic-secret");
  const before = Date.now();
  const token = stream.generateCallToken({
    user_id: "diagnostic-database-user",
    call_cids: ["default:diagnostic-call"],
    validity_in_seconds: 45,
  });
  const after = Date.now();
  const claims = JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString("utf8"));

  assert.ok(Number.isInteger(claims.iat));
  assert.ok(claims.iat >= Math.floor((before - 1_000) / 1_000));
  assert.ok(claims.iat <= Math.floor((after - 1_000) / 1_000));
  assert.equal(claims.exp, claims.iat + 45);
  assert.deepEqual(claims.call_cids, ["default:diagnostic-call"]);
  assert.equal(claims.user_id, "diagnostic-database-user");
});

test("concurrent plan allocation attempts add monthly credits only once", async () => {
  const record = {
    id: "local-user-id",
    currentPlan: "free",
    creditsLastAllocatedAt: new Date("2030-04-01T00:00:00Z"),
    credits: 1,
  };
  const db = {
    user: {
      updateMany: async ({ where, data }) => {
        await new Promise((resolve) => setTimeout(resolve, 0));
        if (
          where.id !== record.id ||
          where.currentPlan !== record.currentPlan ||
          where.creditsLastAllocatedAt?.getTime() !== record.creditsLastAllocatedAt?.getTime()
        ) return { count: 0 };
        record.credits += data.credits.increment;
        record.currentPlan = data.currentPlan;
        record.creditsLastAllocatedAt = data.creditsLastAllocatedAt;
        return { count: 1 };
      },
      findUnique: async () => ({ ...record }),
    },
  };
  const snapshot = { ...record };

  const results = await Promise.all([
    allocatePlanCreditsOnce(db, snapshot, "starter", 5, new Date("2030-05-01T00:00:00Z")),
    allocatePlanCreditsOnce(db, snapshot, "starter", 5, new Date("2030-05-01T00:00:00Z")),
  ]);

  assert.equal(results.filter((result) => result.allocated).length, 1);
  assert.equal(record.credits, 6);
});
