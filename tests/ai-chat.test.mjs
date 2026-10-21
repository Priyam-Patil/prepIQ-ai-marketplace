import test from "node:test";
import assert from "node:assert/strict";
import {
  AI_CHAT_CATEGORIES,
  isConversationOwner,
  requestChatReply,
  toGeminiHistory,
  validateChatInput,
} from "../lib/ai-chat.mjs";

test("chat input accepts supported categories and rejects empty or oversized prompts", () => {
  const valid = { message: "How should I explain React state?", category: "FRONTEND", requestId: "request-id-123456" };
  assert.equal(validateChatInput(valid), null);
  assert.equal(validateChatInput({ ...valid, message: " " }), "Enter a message up to 4,000 characters.");
  assert.equal(validateChatInput({ ...valid, message: "x".repeat(4001) }), "Enter a message up to 4,000 characters.");
  assert.equal(validateChatInput({ ...valid, category: "UNSUPPORTED" }), "Choose a valid interview category.");
  assert.equal(AI_CHAT_CATEGORIES.length, 8);
});

test("multi-turn history is translated to Gemini roles and isolated by owner and booking", () => {
  const messages = [{ role: "user", content: "Question" }, { role: "model", content: "Answer" }];
  assert.deepEqual(toGeminiHistory(messages), [
    { role: "user", parts: [{ text: "Question" }] },
    { role: "model", parts: [{ text: "Answer" }] },
  ]);
  assert.equal(isConversationOwner({ userId: "u1", bookingId: "b1" }, "u1", "b1"), true);
  assert.equal(isConversationOwner({ userId: "u1", bookingId: "b1" }, "u2", "b1"), false);
  assert.equal(isConversationOwner({ userId: "u1", bookingId: "b2" }, "u1", "b1"), false);
});

test("Gemini chat helper returns text, rejects empty output, and surfaces provider failure", async () => {
  const model = { startChat: ({ history }) => ({ sendMessage: async (message) => {
    assert.equal(history.length, 2);
    assert.equal(message, "Follow up");
    return { response: { text: () => " A useful answer " } };
  } }) };
  assert.equal(await requestChatReply({ model, history: [{ role: "user" }, { role: "model" }], message: "Follow up" }), "A useful answer");
  await assert.rejects(requestChatReply({ model: { startChat: () => ({ sendMessage: async () => ({ response: { text: () => " " } }) }) }, history: [], message: "x" }), /EMPTY_RESPONSE/);
  await assert.rejects(requestChatReply({ model: { startChat: () => ({ sendMessage: async () => { throw new Error("provider failure"); } }) }, history: [], message: "x" }), /provider failure/);
});

test("Gemini timeout is surfaced as retryable timeout", async () => {
  await assert.rejects(requestChatReply({
    model: { startChat: () => ({ sendMessage: () => new Promise(() => {}) }) },
    history: [], message: "x", timeoutMs: 5,
  }), /AI_TIMEOUT/);
});
