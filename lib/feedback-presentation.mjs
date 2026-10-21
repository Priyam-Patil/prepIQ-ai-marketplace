export function getFeedbackRatingDisplay(feedback) {
  const overallRating = feedback?.overallRating
    ?.toLowerCase()
    .replaceAll("_", " ");
  const sessionRating = Number.isInteger(feedback?.sessionRating)
    ? Math.min(5, Math.max(0, feedback.sessionRating))
    : null;

  return { overallRating, sessionRating };
}
