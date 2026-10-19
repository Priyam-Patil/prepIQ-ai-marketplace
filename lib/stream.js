import "server-only";

import { StreamClient } from "@stream-io/node-sdk";

let cachedClient;

export function getStreamServerClient() {
  const apiKey = process.env.NEXT_PUBLIC_STREAM_API_KEY;
  const secret = process.env.STREAM_SECRET_KEY;
  if (!apiKey || !secret) return null;

  cachedClient ??= new StreamClient(apiKey, secret);
  return cachedClient;
}
