import test from "node:test";
import assert from "node:assert/strict";
import { getSafeStreamErrorDetails } from "../lib/stream-error.mjs";

test("Stream error diagnostics preserve useful details while redacting credentials and URLs", () => {
  const details = getSafeStreamErrorDetails(Object.assign(
    new Error("Request failed with token=private-token; authorization: Bearer private-bearer https://stream.example/path?key=private-key"),
    { code: 401 }
  ));

  assert.equal(details.name, "Error");
  assert.equal(details.code, 401);
  assert.match(details.message, /Request failed/);
  assert.doesNotMatch(details.message, /private-token|private-bearer|private-key|https:/);
});

test("Stream error diagnostics handle missing errors without exposing arbitrary data", () => {
  assert.deepEqual(getSafeStreamErrorDetails(null), { name: "Error" });
});
