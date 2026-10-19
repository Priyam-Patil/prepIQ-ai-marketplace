import test from "node:test";
import assert from "node:assert/strict";
import { getOpenSlotsForDay, isValidBookingInterval, SESSION_DURATION_MS } from "../lib/booking-rules.mjs";
import { persistBookingTransaction } from "../lib/booking-transaction.mjs";
import { isBookingParticipant } from "../lib/access-control.mjs";
import { allocatePlanCreditsOnce } from "../lib/credit-allocation.mjs";

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
  now: fixedNow,
};

test("booking transaction debits, creates booking, and writes one deduction ledger row", async () => {
  const { tx, calls } = makeTransaction();
  const booking = await persistBookingTransaction(tx, transactionInput);

  assert.equal(booking.id, "booking-uuid");
  assert.deepEqual(calls.map(([name]) => name), ["user.updateMany", "booking.create", "creditTransaction.create"]);
  assert.equal(calls[0][1].data.credits.decrement, 2);
  assert.equal(calls[2][1].data.amount, -2);
  assert.equal(calls[2][1].data.type, "BOOKING_DEDUCTION");
});

test("booking conflict prevents credit debit and record creation", async () => {
  const { tx, calls } = makeTransaction({ conflict: { id: "existing-booking" } });
  await assert.rejects(persistBookingTransaction(tx, transactionInput), /just booked/);
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
