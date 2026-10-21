import test from "node:test";
import assert from "node:assert/strict";
import { getFeedbackRatingDisplay } from "../lib/feedback-presentation.mjs";

test("qualitative overall rating stays qualitative and session rating stays numeric", () => {
  assert.deepEqual(
    getFeedbackRatingDisplay({ overallRating: "EXCELLENT", sessionRating: 4 }),
    { overallRating: "excellent", sessionRating: 4 }
  );
});

test("missing or malformed session ratings do not create a star score", () => {
  assert.deepEqual(
    getFeedbackRatingDisplay({ overallRating: "EXCELLENT", sessionRating: null }),
    { overallRating: "excellent", sessionRating: null }
  );
  assert.equal(
    getFeedbackRatingDisplay({ overallRating: "GOOD", sessionRating: "5" }).sessionRating,
    null
  );
});
