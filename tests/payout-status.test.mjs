import assert from "node:assert/strict";
import test from "node:test";
import { getPayoutApprovalTransition, getPayoutStatusLabel, isPayoutApproved } from "../lib/payout-status.mjs";

test("payout approval is an internal state, distinct from a verified transfer", () => {
  assert.equal(getPayoutApprovalTransition("PROCESSING"), "APPROVED");
  assert.equal(getPayoutApprovalTransition("APPROVED"), null);
  assert.equal(getPayoutApprovalTransition("PROCESSED"), null);
  assert.equal(isPayoutApproved("APPROVED"), true);
  assert.equal(isPayoutApproved("PROCESSED"), true);
  assert.equal(getPayoutStatusLabel("APPROVED"), "Approved · transfer unverified");
  assert.equal(getPayoutStatusLabel("PROCESSED"), "Legacy approved · transfer unverified");
});
