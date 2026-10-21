export function getPayoutStatusLabel(status) {
  if (status === "PROCESSING") return "Pending review";
  if (status === "APPROVED") return "Approved · transfer unverified";
  if (status === "PROCESSED") return "Legacy approved · transfer unverified";
  return "Unknown";
}

export function isPayoutApproved(status) {
  return status === "APPROVED" || status === "PROCESSED";
}

export function getPayoutApprovalTransition(status) {
  return status === "PROCESSING" ? "APPROVED" : null;
}
