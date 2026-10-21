import test from "node:test";
import assert from "node:assert/strict";
import { getSafeErrorDetails } from "../lib/safe-error.mjs";

test("safe error details preserve Prisma code, message, and cause", () => {
  const error = Object.assign(new Error("Column does not exist"), {
    code: "P2022",
    meta: { modelName: "Booking", column: "category", database_error: "must not be logged" },
    cause: Object.assign(new Error("relation unavailable"), { code: "08006" }),
  });
  assert.deepEqual(getSafeErrorDetails(error), {
    name: "Error",
    message: "Column does not exist",
    code: "P2022",
    meta: { modelName: "Booking", column: "category" },
    cause: { name: "Error", message: "relation unavailable", code: "08006" },
  });
});

test("safe diagnostics handle non-Error thrown values without serializing arbitrary objects", () => {
  assert.deepEqual(getSafeErrorDetails({ token: "do-not-log", password: "private" }), {
    name: "Error",
    message: "No error message provided.",
  });
});

test("safe diagnostics handle empty provider errors and redact credentials and personal data", () => {
  const error = Object.assign(new Error("Bearer abc123 failed for user@example.com at https://service.test/path"), {
    name: "ClerkAPIResponseError",
    code: "CLERK_DOWN",
    cause: new Error(""),
  });
  const details = getSafeErrorDetails(error);
  assert.equal(details.name, "ClerkAPIResponseError");
  assert.equal(details.code, "CLERK_DOWN");
  assert.equal(details.message.includes("abc123"), false);
  assert.equal(details.message.includes("user@example.com"), false);
  assert.equal(details.message.includes("service.test"), false);
  assert.deepEqual(details.cause, { name: "Error", message: "No error message provided." });
});

test("safe diagnostics bound nested cause depth", () => {
  const error = new Error("outer", { cause: new Error("middle", { cause: new Error("inner", { cause: new Error("deep") }) }) });
  const details = getSafeErrorDetails(error, 1);
  assert.equal(details.cause.message, "middle");
  assert.equal(details.causeTruncated, true);
});
