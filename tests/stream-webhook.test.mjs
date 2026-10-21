import test from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { gzipSync } from "node:zlib";
import { StreamClient } from "@stream-io/node-sdk";
import { createStreamWebhookHandler, parseFeedback } from "../lib/stream-webhook.mjs";

const apiKey = "webhook-test-key";
const secret = "webhook-test-secret";
const stream = new StreamClient(apiKey, secret);
const bookingBase = {
  id: "booking-1",
  streamCallId: "stream-call-1",
  status: "SCHEDULED",
  interviewerId: "interviewer-1",
  intervieweeId: "candidate-1",
  creditsCharged: 2,
  category: "FRONTEND",
  interviewer: { id: "interviewer-1", name: "Interviewer", categories: ["FRONTEND"] },
  interviewee: { id: "candidate-1", name: "Candidate" },
  feedback: null,
};

function createDb({ booking = bookingBase, failUpdate = false } = {}) {
  const state = {
    booking,
    recordingWrites: [],
    feedbackWrites: [],
    earnings: [],
    userUpdates: [],
    lookupIds: [],
    recordingEvents: [],
    emailJobs: [],
    bookingQueries: [],
  };
  const db = {
    emailNotification: {
      createMany: async ({ data }) => {
        for (const item of data) if (!state.emailJobs.some((job) => job.key === item.key)) state.emailJobs.push(item);
        return { count: data.length };
      },
    },
    booking: {
      findUnique: async (args) => {
        const { where } = args;
        state.bookingQueries.push(args);
        state.lookupIds.push(where.streamCallId);
        return where.streamCallId === state.booking?.streamCallId ? state.booking : null;
      },
    },
    $transaction: async (callback) => callback({
      feedback: {
        upsert: async (args) => {
          state.feedbackWrites.push(args);
          const saved = { id: "feedback-1", ...args.create };
          state.booking = { ...state.booking, feedback: saved };
          return saved;
        },
      },
      emailNotification: {
        createMany: async ({ data, skipDuplicates }) => {
          for (const item of data) {
            if (!state.emailJobs.some((job) => job.key === item.key)) state.emailJobs.push(item);
          }
          return { count: data.length };
        },
      },
      streamRecording: {
        upsert: async ({ where, create, update }) => {
          const existing = state.recordingEvents.find((item) => item.streamEgressId === where.streamEgressId);
          if (existing) Object.assign(existing, update);
          else state.recordingEvents.push(create);
        },
        findFirst: async () => state.recordingEvents
          .slice()
          .sort((left, right) => new Date(right.readyAt) - new Date(left.readyAt))[0] || null,
      },
      booking: {
        updateMany: async ({ where, data }) => {
          if (failUpdate) throw new Error("database unavailable");
          if (where.recordingUrl) {
            if (where.recordingUrl.not && state.booking.recordingUrl === where.recordingUrl.not) return { count: 0 };
            state.recordingWrites.push({ where, data });
            state.booking = { ...state.booking, ...data };
            return { count: 1 };
          }
          if (state.booking.status !== where.status) return { count: 0 };
          state.booking = { ...state.booking, ...data };
          return { count: 1 };
        },
      },
      user: {
        update: async (args) => state.userUpdates.push(args),
      },
      creditTransaction: {
        create: async (args) => state.earnings.push(args),
      },
    }),
    feedback: {
      upsert: async (args) => {
        state.feedbackWrites.push(args);
        state.booking = { ...state.booking, feedback: { id: "feedback-1" } };
      },
    },
  };
  return { db, state };
}

function makeRequest(event, { compressed = false, rawText, signatureOverride, includeSignature = true } = {}) {
  const signedText = rawText ?? JSON.stringify(event);
  const signedBuffer = Buffer.from(signedText);
  const body = compressed ? gzipSync(signedBuffer) : signedBuffer;
  const signature = signatureOverride ?? createHmac("sha256", secret).update(signedBuffer).digest("hex");
  const headers = includeSignature ? { "x-signature": signature } : {};
  return new Request("https://prepiq.test/api/webhooks/stream", {
    method: "POST",
    headers,
    body,
  });
}

function recordingEvent(url = "https://cdn.example.test/recordings/session.mp4") {
  return {
    type: "call.recording_ready",
    call_cid: "default:stream-call-1",
    egress_id: "egress-1",
    created_at: "2030-01-01T00:00:00.000Z",
    call_recording: { url },
  };
}

function handlerFor(db, options = {}) {
  return createStreamWebhookHandler({ db, stream, ...options });
}

test("valid signed and gzip-compressed recording-ready event stores the recording and invalidates pages", async () => {
  const { db, state } = createDb();
  const invalidated = [];
  const handler = handlerFor(db, { onRecordingSaved: async (id) => invalidated.push(id) });
  const response = await handler(makeRequest(recordingEvent(), { compressed: true }));

  assert.equal(response.status, 200);
  assert.equal(state.lookupIds[0], "stream-call-1");
  assert.equal(state.bookingQueries[0].include.category, undefined);
  assert.equal(state.booking.category, "FRONTEND");
  assert.equal(state.recordingWrites.length, 1);
  assert.equal(state.recordingWrites[0].data.recordingUrl, "https://cdn.example.test/recordings/session.mp4");
  assert.deepEqual(invalidated, ["booking-1"]);
});

test("missing or invalid webhook signatures are rejected", async () => {
  const { db } = createDb();
  const handler = handlerFor(db);
  assert.equal((await handler(makeRequest(recordingEvent(), { includeSignature: false }))).status, 401);
  assert.equal((await handler(makeRequest(recordingEvent(), { signatureOverride: "invalid" }))).status, 401);
});

test("malformed signed JSON is rejected with 400", async () => {
  const { db } = createDb();
  const response = await handlerFor(db)(makeRequest(null, { rawText: "{invalid json" }));
  assert.equal(response.status, 400);
});

test("unknown event types are acknowledged without database access", async () => {
  const { db, state } = createDb();
  const response = await handlerFor(db)(makeRequest({ type: "call.updated", call_cid: "default:stream-call-1" }));
  assert.equal(response.status, 200);
  assert.equal(state.lookupIds.length, 0);
});

test("malformed call CIDs return 400 and unknown calls are acknowledged", async () => {
  const { db, state } = createDb();
  const handler = handlerFor(db);
  assert.equal((await handler(makeRequest({ ...recordingEvent(), call_cid: "bad-cid" }))).status, 400);
  assert.equal((await handler(makeRequest({ ...recordingEvent(), call_cid: "default:missing-call" }))).status, 200);
  assert.equal(state.recordingWrites.length, 0);
});

test("missing and malformed recording URLs are ignored without persisting a link", async () => {
  const { db, state } = createDb();
  const handler = handlerFor(db);
  assert.equal((await handler(makeRequest({ ...recordingEvent(), call_recording: {} }))).status, 400);
  assert.equal((await handler(makeRequest(recordingEvent("javascript:alert(1)")))).status, 400);
  assert.equal((await handler(makeRequest(recordingEvent("https://user:pass@cdn.example.test/file")))).status, 400);
  assert.equal(state.recordingWrites.length, 0);
});

test("duplicate recording-ready deliveries are idempotent", async () => {
  const { db, state } = createDb();
  const handler = handlerFor(db);
  await handler(makeRequest(recordingEvent()));
  await handler(makeRequest(recordingEvent()));
  assert.equal(state.recordingWrites.length, 1);
  assert.equal(state.recordingEvents.length, 1);
  assert.equal(state.booking.recordingUrl, "https://cdn.example.test/recordings/session.mp4");
});

test("recordings from a leave and rejoin are retained and the latest artifact is displayed", async () => {
  const { db, state } = createDb();
  const handler = handlerFor(db);
  await handler(makeRequest(recordingEvent("https://cdn.example.test/recordings/first.mp4")));
  await handler(makeRequest({
    ...recordingEvent("https://cdn.example.test/recordings/rejoined.mp4"),
    egress_id: "egress-2",
    created_at: "2030-01-01T00:10:00.000Z",
  }));
  assert.equal(state.recordingEvents.length, 2);
  assert.equal(state.booking.recordingUrl, "https://cdn.example.test/recordings/rejoined.mp4");
});

test("recording database failures return 500 so Stream can retry", async () => {
  const { db } = createDb({ failUpdate: true });
  const response = await handlerFor(db)(makeRequest(recordingEvent()));
  assert.equal(response.status, 500);
});

test("duplicate session-ended events only credit the interviewer once", async () => {
  const { db, state } = createDb();
  const event = { type: "call.session_ended", call_cid: "default:stream-call-1" };
  const handler = handlerFor(db);
  assert.equal((await handler(makeRequest(event))).status, 200);
  assert.equal((await handler(makeRequest(event))).status, 200);
  assert.equal(state.userUpdates.length, 1);
  assert.equal(state.earnings.length, 1);
  assert.equal(state.earnings[0].data.amount, 2);
});

test("transcription-ready continues to generate and persist actual feedback", async (t) => {
  const { db, state } = createDb({ booking: { ...bookingBase, interviewee: { ...bookingBase.interviewee, email: "candidate@example.com" } } });
  const lines = JSON.stringify({ type: "speech", speaker_id: "candidate-1", text: "Explains a React tradeoff." });
  t.mock.method(globalThis, "fetch", async () => new Response(`${lines}\n`, { status: 200 }));
  const generated = [];
  const feedback = {
    summary: "A measured summary.", technical: "Good technical reasoning.", communication: "Clear.",
    problemSolving: "Structured.", recommendation: "CONSIDER for role fit.",
    strengths: ["Clear reasoning"], improvements: ["More depth"], overallRating: "GOOD",
  };
  const handler = handlerFor(db, {
    generateFeedback: async (input) => (generated.push(input), feedback),
  });
  const event = {
    type: "call.transcription_ready",
    call_cid: "default:stream-call-1",
    call_transcription: { url: "https://cdn.example.test/transcript.jsonl" },
  };
  const response = await handler(makeRequest(event));

  assert.equal(response.status, 200);
  assert.match(generated[0].transcript, /Candidate: Explains a React tradeoff\./);
  assert.equal(state.feedbackWrites.length, 1);
  assert.equal(state.feedbackWrites[0].create.overallRating, "GOOD");
  assert.equal(state.emailJobs[0].recipient, "candidate@example.com");
  assert.equal(state.emailJobs[0].payload.summary, feedback.summary);
  await handler(makeRequest(event));
  assert.equal(state.feedbackWrites.length, 1);
  assert.equal(state.emailJobs.length, 1);
});

test("Gemini failure returns a retryable error and does not create fake feedback", async (t) => {
  const { db, state } = createDb();
  t.mock.method(globalThis, "fetch", async () => new Response(
    `${JSON.stringify({ type: "speech", speaker_id: "candidate-1", text: "Answer" })}\n`,
    { status: 200 },
  ));
  const handler = handlerFor(db, { generateFeedback: async () => { throw new Error("provider failure"); } });
  const event = {
    type: "call.transcription_ready",
    call_cid: "default:stream-call-1",
    call_transcription: { url: "https://cdn.example.test/transcript.jsonl" },
  };
  const response = await handler(makeRequest(event));
  assert.equal(response.status, 500);
  assert.equal(state.feedbackWrites.length, 0);
  assert.equal(state.emailJobs.length, 0);
});

test("feedback response parser rejects malformed provider output", () => {
  assert.throws(() => parseFeedback("not json"));
  assert.throws(() => parseFeedback(JSON.stringify({ recommendation: "HIRE", overallRating: "GOOD" })));
});
