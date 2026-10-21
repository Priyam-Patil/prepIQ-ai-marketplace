import { timingSafeEqual } from "node:crypto";
import { processEmailNotifications } from "@/lib/email-service";

function authorized(request) {
  const secret = process.env.EMAIL_CRON_SECRET;
  const authorization = request.headers.get("authorization") || "";
  const supplied = authorization.startsWith("Bearer ") ? authorization.slice(7) : "";
  if (!secret || !supplied) return false;
  const expectedBuffer = Buffer.from(secret);
  const suppliedBuffer = Buffer.from(supplied);
  return expectedBuffer.length === suppliedBuffer.length && timingSafeEqual(expectedBuffer, suppliedBuffer);
}

export async function POST(request) {
  if (!authorized(request)) return Response.json({ error: "Unauthorized." }, { status: 401 });
  try {
    const result = await processEmailNotifications();
    return Response.json(result, { status: 200 });
  } catch (error) {
    console.error("Email notification job failed.", { name: error?.name || "Error", code: error?.code });
    return Response.json({ error: "Email notification processing failed." }, { status: 503 });
  }
}

export async function GET(request) {
  return POST(request);
}
