import { getSafeErrorDetails } from "./safe-error.mjs";

export function getSafeStreamErrorDetails(error, { includeMessage = true } = {}) {
  if (error == null) return { name: "Error" };
  const details = getSafeErrorDetails(error);
  if (!includeMessage) {
    delete details.message;
    delete details.cause;
    delete details.causeTruncated;
  }
  return details;
}
