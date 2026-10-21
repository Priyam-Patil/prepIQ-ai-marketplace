
import arcjet, { tokenBucket } from "@arcjet/next";

/**
 * Creates a rate limiter using the token-bucket algorithm.
 */
export function createRateLimiter({
  refillRate,
  interval,
  capacity,
}) {
  return arcjet({
    key: process.env.ARCJET_KEY,
    characteristics: ["userId"],
    rules: [
      tokenBucket({
        mode: "LIVE",
        refillRate,
        interval,
        capacity,
      }),
    ],
  });
}

/**
 * Returns an error message if the request is denied.
 * Returns null when the request is allowed.
 */
export async function checkRateLimit(aj, req, userId) {
  const decision = await aj.protect(req, {
    userId,
    requested: 1,
  });

  if (decision.isDenied()) {
    return decision.reason.isRateLimit()
      ? "Too many booking attempts. Please try again later."
      : "Request blocked.";
  }

  return null;
}

/**
 * Booking protection:
 * 5 initial tokens, replenished at 5 tokens per hour.
 */
export const bookingRateLimiter = createRateLimiter({
  refillRate: 5,
  interval: "1h",
  capacity: 5,
});

export const aiQuestionsRateLimiter = createRateLimiter({
  refillRate: 3,
  interval: "1h",
  capacity: 3,
});

export const aiChatRateLimiter = createRateLimiter({
  refillRate: 20,
  interval: "1h",
  capacity: 10,
});
