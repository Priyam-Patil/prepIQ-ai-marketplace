
import arcjet, { detectBot, shield } from "@arcjet/next";
import {
  clerkMiddleware,
  createRouteMatcher,
} from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const isProtectedRoute = createRouteMatcher([
  "/appointments(.*)",
  "/explore(.*)",
  "/dashboard(.*)",
  "/onboarding(.*)",
  "/interviewers(.*)",
  "/call(.*)",
  "/ai-chat(.*)",
  "/payout(.*)",
]);

const isSignedServiceRoute = createRouteMatcher([
  "/api/webhooks/stream(.*)",
  "/api/webhooks/clerk(.*)",
  "/api/cron/email-notifications(.*)",
]);

const aj = arcjet({
  key: process.env.ARCJET_KEY,
  rules: [
    shield({ mode: "LIVE" }),
    detectBot({
      mode: "LIVE",
      allow: [
        "CATEGORY:SEARCH_ENGINE",
        "CATEGORY:PREVIEW",
      ],
    }),
  ],
});

export default clerkMiddleware(async (auth, req) => {
  const pathname = req.nextUrl.pathname;

  // The signed webhook/cron handlers verify their own request credentials.
  // Keep Clerk middleware active for browser routes.
  if (
    pathname !== "/" &&
    !isSignedServiceRoute(req)
  ) {
    const decision = await aj.protect(req);

    if (decision.isDenied()) {
      return NextResponse.json(
        { error: "Forbidden" },
        { status: 403 }
      );
    }
  }

  // Preserve authentication for protected routes.
  if (isProtectedRoute(req)) {
    const { userId } = await auth();

    if (!userId) {
      return auth().then(({ redirectToSignIn }) =>
        redirectToSignIn()
      );
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
