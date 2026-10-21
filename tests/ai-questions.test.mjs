import test from "node:test";
import assert from "node:assert/strict";
import { QUESTION_CATEGORIES, QUESTION_MODEL, parseInterviewQuestions } from "../lib/ai-questions.mjs";

test("Gemini parser accepts six valid questions and strips JSON fences", () => {
  const questions = Array.from({ length: 6 }, (_, index) => ({
    question: `Question ${index + 1}?`,
    answer: `Answer ${index + 1}.`,
  }));
  assert.deepEqual(parseInterviewQuestions(`\`\`\`json\n${JSON.stringify(questions)}\n\`\`\``), questions);
});

test("Gemini parser rejects malformed, incomplete, or empty responses", () => {
  assert.throws(() => parseInterviewQuestions("not json"), /invalid-response/);
  assert.throws(() => parseInterviewQuestions(JSON.stringify([{ question: "Only one", answer: "No" }])), /unexpected-format/);
  const malformed = Array.from({ length: 6 }, () => ({ question: " ", answer: "answer" }));
  assert.throws(() => parseInterviewQuestions(JSON.stringify(malformed)), /unexpected-format/);
});

test("the supported category list matches all eight marketplace categories", () => {
  assert.deepEqual(Object.keys(QUESTION_CATEGORIES).sort(), [
    "BACKEND", "BEHAVIORAL", "DEVOPS", "DSA", "FRONTEND", "FULLSTACK", "MOBILE", "SYSTEM_DESIGN",
  ]);
});

test("question generation uses Gemini's API model identifier", () => {
  assert.equal(QUESTION_MODEL, "gemini-3.5-flash-lite");
});
