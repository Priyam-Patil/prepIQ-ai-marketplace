# PrepIQ AI Interview Marketplace — Technical Guide

This guide describes the repository as it currently exists. It is based on source, schema, package manifest, configuration, and verification results already recorded in this conversation. No source code, dependencies, configuration, or environment files were changed to prepare this guide. Secret values are omitted.

## 1. Current status and purpose

### Purpose

PrepIQ is a two-sided mock-interview marketplace. Interviewees can discover interviewers, choose a time, spend credits on a 45-minute session, and use a Stream video room and booking chat. Interviewers can publish a profile, manage future availability, see sessions, and accumulate credits when a session ends.

The problem it addresses is finding experienced people for realistic, role-specific interview practice and coordinating time and communication.

### Status labels

- **Implemented in source**: code for the behavior exists.
- **Build verified**: the last recorded production build compiled and generated route output. This does not prove provider configuration or live user journeys.
- **Provider API verified**: a previous read-only API request using configured credentials succeeded. It does not prove a complete call, chat, checkout, or webhook flow.
- **Not verified from the current implementation**: source alone cannot prove the external/live behavior.
- **Unavailable/incomplete**: source explicitly reports a missing integration or contains no implementation for the feature.

### Completed and incomplete work

**Implemented in source:** responsive marketing page; local fonts; star and code demos; Clerk sign-in/sign-up; database user creation and role onboarding; role-aware navigation; interviewer directory/profile; availability windows; 45-minute slot listing; credit-checked booking; appointments and interviewer dashboard; Clerk Billing checkout controls; Stream call/chat client and server token actions; signed Stream webhook handling for recordings and session completion; payout history display; Arcjet shield/bot rules; Prisma PostgreSQL schema and migration.

**Explicitly incomplete:** AI question generation returns an unavailable response; the call screen says AI questions are unavailable; no AI feedback generator/provider setup exists; payout submission is disabled because no credit-to-currency rule, fee policy, or payout processor exists. No booking cancellation action or feedback submission action was found. The Feedback model and feedback display do not themselves create feedback.

**Not verified end to end:** Clerk browser sign-in/role journeys; booking with live availability; real Stream call/chat message/recording/webhook delivery; paid Clerk checkout; deployed Arcjet behavior; production deployment. Earlier verification established read-only database connectivity and migration status, plus read-only Clerk and Stream API requests. Those checks did not create/mutate users, bookings, credit balances, calls, chats, payments, or webhooks. In a later read-only check, the database had 2 users, 0 bookings, and 1 availability row; Prisma again reported one applied migration and an up-to-date schema. Stream dashboard settings were not checked.

Last recorded build passed and generated 14 pages. Lint passed with zero errors and 22 warnings from generated Prisma files. A prior production-only dependency audit reported zero production vulnerabilities and nine high-severity findings in the development dependency tree. These are historical results. A focused Node test suite has since been added for slot rules, transaction sequencing, participant checks, and duplicate monthly credit allocation. Those tests use a mocked transaction/client and are unit tests, not live PostgreSQL/provider tests.

### Implemented vs built vs live

1. **Implemented** means the code path exists; for example, getCallToken builds a restricted Stream token.
2. **Builds** means Next.js compiled the app and generated routes. This catches many syntax/import/type problems but not external provider settings or real-user authorization behavior.
3. **Works live** means a real session succeeds with configured credentials, dashboard settings, database, networking, and external services. A successful build or read-only provider request does not prove a video call, checkout, or webhook works.

## 2. Technology stack

| Technology | Why it is used / where | How it interacts; source example |
|---|---|---|
| Next.js 16 App Router | Routing, server rendering, server actions, route handlers, optimized images, bundling. Source is in app/ and next.config.mjs. | app/(main)/explore/page.jsx loads server data; app/api/webhooks/stream/route.js exports POST. |
| React 19 | Component UI and client interaction. | SlotPicker uses state/effects; server pages load data and pass it to browser components. |
| JavaScript and JSX | Main application language and UI markup. | actions/booking.js is server code; components/HeaderClient.jsx is a client component. |
| Tailwind CSS v4 | Responsive utility styles and design tokens. | app/globals.css imports Tailwind, tw-animate-css, and local Shadcn Tailwind CSS. JSX uses sm:/lg: responsive classes. Turbopack CSS handling is configured in next.config.mjs. |
| shadcn/ui pattern | Local UI components in components/ui/, configured by components.json, rather than a compiled component library. | components/ui/button.jsx defines variants with class-variance-authority and a Radix Slot. The shadcn CLI is a dev dependency; wrappers are repo source. |
| Radix UI | Accessible primitives wrapped by local UI files. | components/ui/dialog.jsx composes Radix Dialog primitives; button uses Radix Slot. |
| Clerk | Authentication UI/session and Billing plan state. | proxy.js uses clerkMiddleware; server code calls auth/currentUser; PricingSection uses CheckoutButton and useAuth().has(). |
| Prisma 7 | Typed database queries, relationships, and migrations. | actions/booking.js uses db.$transaction, booking.create, and user.updateMany. Generated client is imported from lib/generated/prisma/client. |
| PostgreSQL / Supabase | Persistent marketplace data. Prisma schema provider is postgresql; earlier Prisma status output showed a Supabase pooler host pattern. | lib/prisma.js makes a pg Pool using DATABASE_URL and gives it to PrismaPg. |
| pg + @prisma/adapter-pg | PostgreSQL driver and adapter used by Prisma 7. | Pool → PrismaPg → PrismaClient in lib/prisma.js. |
| Arcjet | Request screening in the Next proxy. | proxy.js applies shield and detectBot rules; denied requests get 403. There is no rateLimit rule in that file despite landing copy mentioning rate limiting. |
| Stream Video | Video call provisioning, browser call UI, and server token creation. | @stream-io/node-sdk creates calls; @stream-io/video-react-sdk is used by CallUI. |
| Stream Chat | Booking-specific persistent message channel. | Server creates a messaging channel; stream-chat is used by ChatRoom in the browser. |
| motion | Animation primitives and starfield. | components/animate-ui/components/backgrounds/stars.jsx animates star layers with motion.div. |
| Shiki | Syntax highlighting for reusable animated code block. | components/animate-ui/primitives/animate/code-block.jsx dynamically imports shiki and calls codeToHtml. Landing page's own Java demo has a small local highlighter. |
| date-fns | Date formatting and scheduling helpers. | lib/helpers.js formats dates and makes date tabs; SlotPicker formats local display. |
| Sonner | Browser toast messages. | app/layout.js renders Toaster; slot/availability components call toast.success/error. |
| next-themes | Theme context/provider. | components/theme-provider.jsx wraps next-themes; root layout enables system theme. No theme toggle was found in navigation. |
| Lucide React | Icons. | Directory cards and pages use icons such as CalendarDays, Video, and Coins. |
| class-variance-authority, cn, radix-ui, tw-animate-css | Support local variant components, class composition, primitives, and CSS animation. | Used in components/ui/* and app/globals.css. |

package.json also contains @clerk/themes; that alone does not prove a custom Clerk theme is active. @tailwindcss/turbopack, ESLint, Prisma CLI, type packages, and shadcn are tooling. React and React DOM are framework dependencies.

## 3. Folder structure and routes

### Directories

| Path | Purpose |
|---|---|
| app/ | App Router pages, route-group layouts, global layout/styles, and HTTP API handlers. Parenthesized groups do not appear in URLs. |
| components/ | Shared header, pricing, theme, design components, animations, and local UI primitives. |
| actions/ | Server actions for authenticated database and provider operations. |
| lib/ | Prisma/Stream clients, user synchronization, constants, formatting, utilities. |
| prisma/ | PostgreSQL schema and migration SQL. |
| public/ | Static logo, company logos, and imagery. |
| hooks/ | Client hooks including use-is-in-view.jsx, use-controlled-state.jsx, and use-fetch.jsx. |
| app/fonts/ | Local Lora and DM Sans font files, avoiding a build-time Google Fonts fetch. |

### URL routes

| URL | Source | Purpose |
|---|---|---|
| / | app/page.jsx | Public marketing page and pricing. |
| /sign-in, /sign-up | app/(auth)/.../page.jsx | Clerk sign-in/sign-up. |
| /onboarding | app/(main)/onboarding/page.jsx | Choose a role and interviewer profile fields. |
| /explore | app/(main)/explore/page.jsx | Interviewer directory and client-side filters. |
| /interviewers/[id] | app/(main)/interviewers/[id]/page.jsx | Interviewer profile and slot selection. |
| /appointments | app/(main)/appointments/page.jsx | Current user’s booking list. |
| /dashboard | app/(main)/dashboard/page.jsx | Interviewer schedule, sessions, and earnings. |
| /call/[callId] | app/(main)/call/[callId]/page.jsx | Participant-only call/chat room and recording link. |
| /payout/[id] | app/(main)/payout/[id]/page.jsx | Interviewer payout history/details, read-only. |
| /api/webhooks/stream | app/api/webhooks/stream/route.js | Signed Stream recording/session events. |

### Key files

- app/layout.js: Clerk provider, local fonts, theme, header, main wrapper, toaster, footer, Stream Video CSS.
- app/globals.css: Tailwind v4 imports, theme tokens, reset/base styling. Imports app/shadcn-tailwind.css.
- app/page.jsx: landing page composition. Uses components/reusables.jsx, demo-components-backgrounds-stars.tsx, and demo-components-animate-code.tsx.
- components/Header.jsx → HeaderRole.jsx → HeaderClient.jsx: server-side identity sync followed by browser navigation.
- proxy.js: Clerk middleware, Arcjet, and signed-in gate for protected paths.
- actions/booking.js, actions/call.js, actions/dashboard.js: booking, tokens, interviewer dashboard, availability.
- lib/checkUser.js: local user creation/plan credit allocation called from header.
- lib/prisma.js and prisma.config.ts: runtime DB client vs Prisma CLI connection.
- lib/stream.js: server-only Stream client.
- prisma/schema.prisma and prisma/migrations/20261018031945_create_models/migration.sql: data model and initial migration.
- next.config.mjs: image host allowlist, cache/partial prefetch settings, Turbopack CSS loader.
- components.json: local UI generator config; eslint.config.mjs, jsconfig.json, tsconfig.json configure linting, aliases, and types.
- .env and .env.local exist and are ignored by .gitignore. Their values were not read or printed. .env.example is permitted by ignore rules; its presence was not established.
- package.json/package-lock.json: dependencies and scripts. Scripts are dev, build, start, lint, postinstall; no test script.

## 4. Major features and actual workflows

### Landing page and animations

1. app/page.jsx renders a responsive dark page with hero, CTA links, logos, feature cards, role descriptions, pricing, and final CTA.
2. Shared UI includes GoldTitle, GrayTitle, SectionHeading, SectionLabel, BentoCard, Badge, and Button.
3. StarsBackgroundDemo wraps the animated star component. CodeDemo types a Java binary-search example, pauses on hover, scrolls to the active text, and copies the full example using the Clipboard API.
4. lib/data.js has static logos, avatars, tags, plan descriptions, and role copy. The displayed 5,800+ social proof, sample 28 credit balance, sample messages, and sample feedback are illustrative hard-coded UI, not user/database results.
5. Real route features use database/provider code separately. Landing page itself does not generate AI, create accounts, or substantiate displayed marketing statistics.

Errors/limits: PricingSectionWithRole queries DB for role but catches/logs errors and still renders. Remote sample avatars use randomuser.me, allowed in next.config.mjs. Fonts are local.

### Authentication, user, and role

1. /sign-up and /sign-in render Clerk components inside ClerkProvider.
2. proxy.js uses clerkMiddleware and redirects signed-out users from protected prefixes.
3. HeaderRole loads auth/currentUser and calls checkUser(clerkUser, authState.has).
4. checkUser finds local user by unique clerkUserId, creates one if missing, stores email/name/image and starts role at UNASSIGNED. It tests plan pro then starter, assigning 15/5/1 monthly credits for pro/starter/free. On plan change or calendar month change, it adds the plan credits to the existing balance and refreshes currentPlan/creditsLastAllocatedAt. Interviewers skip interviewee-plan allocation.
5. RoleRedirect navigates unassigned users to onboarding, interviewers away from explore/onboarding, and interviewees away from dashboard/onboarding. This is UX navigation, not the only authorization control.
6. completeOnboarding(data) requires Clerk auth, restricts role to INTERVIEWEE or INTERVIEWER, requires a local UNASSIGNED row, and refuses a second assignment. Interviewer fields are checked for title/company limits, years, bio length, allowed unique categories, and nonempty categories, then stored.
7. Client routes interviewer to dashboard and interviewee to explore. Errors display in form.

Limits: plan membership comes from Clerk while credits/profile/role are local. No Clerk webhook route was found; local user creation and plan reconciliation happen when the header calls checkUser. Existing-user monthly/plan-change allocation now uses an atomic compare-and-update so concurrent header requests cannot allocate against the same stale plan timestamp; concurrent account creation re-reads after a unique-key race. A unit test models this behavior but does not test PostgreSQL. Upgrade/proration policy is not specified: changing plans adds the full new tier allotment to the existing balance. Client years validation allows zero but server requires at least one; server validation is authoritative.

### Discovery and profile

1. /explore calls getInterviewers() in actions/explore.js.
2. It queries INTERVIEWER users, profile fields, and their first future AVAILABLE window, ordered by account creation.
3. ExploreGrid filters loaded data in browser by text/category. InterviewerCard shows name, experience, categories, rate, next availability, and profile link.
4. A query error is logged and returns an empty list.
5. /interviewers/[id] calls getInterviewerProfile(id), requiring INTERVIEWEE and selecting profile/future availability. Errors redirect to onboarding; missing profile renders not found.

Limits: filters operate on the loaded directory; no pagination is present in the action. Actual profile rows were not reviewed for this report.

### Availability and slot selection

1. Interviewer submits start/end values in AvailabilitySection.
2. Client converts datetime-local inputs to ISO and calls createAvailabilityWindow.
3. The action requires interviewer role, valid future times, end after start, and at least 45 minutes; it checks overlaps with non-BLOCKED availability and scheduled bookings, then inserts AVAILABLE in a serializable transaction.
4. removeAvailabilityWindow verifies the interviewer owns the window, refuses removal if a scheduled booking overlaps, and marks it BLOCKED in a serializable transaction. It does not delete it.
5. Interviewee SlotPicker offers 14 local dates and calls getOpenSlots for a calendar day. The action clips availability to the day, creates consecutive 45-minute slots, skips past slots and scheduled booking overlaps, and returns ISO timestamps. Client displays local time.

Errors return structured error responses and client toasts. Transaction errors return a generic schedule-changed/retry message.

Limits: the earlier snapshot had no availability/bookings, so real slot selection was not demonstrated. Booking does not change Availability.status to BOOKED; booked times are masked via booking overlap queries. Slot starts are aligned to 45-minute increments from the availability start. createBooking now independently checks that same boundary rule before provisioning Stream and again in the transaction.

### Booking, credits, conflicts

1. Interviewee chooses a slot and clicks Book in SlotPicker.
2. Client calls createBooking({interviewerId,startTime}), disables while pending.
3. Server checks current Clerk user/local INTERVIEWEE role, future timestamp, interviewer role/identity, and credit rate. Cost is Math.max(1, creditRate || 1). Insufficient pre-read credits are rejected.
4. It requires Stream server credentials, generates a UUID, upserts Stream participant users, creates a default video call with both participants, schedule, audio/video defaults off, and recording auto-on for Pro or disabled otherwise. It then tries to create a messaging channel. Chat setup failure is logged but booking can continue.
5. Before provisioning Stream, it confirms the interval is an actual 45-minute boundary anchored to an AVAILABLE window and has no current scheduled conflict. A serializable Prisma transaction repeats the availability/grid and overlap checks, conditionally debits with updateMany and credits >= cost, creates Booking using the UUID as its id and streamCallId, and inserts a negative BOOKING_DEDUCTION.
6. Success returns {success:true,booking}; client toasts and routes to /call/{id}. Failure attempts to delete video and any successfully created chat resource, logs errors, returns {success:false,error}.

Conflict detection uses interval overlap: requested start < existing end and requested end > existing start. The server checks again inside the transaction rather than trusting client slots. Serializable transactions are intended to make concurrent bookings conflict safely; this path was not stress-tested.

Limits: no real booking was created; latest read-only snapshot had one availability row but no bookings, and no authenticated test session was used. Real conflict behavior under concurrent PostgreSQL transactions was not exercised. Stream provisioning is outside the database transaction, so cleanup is compensating behavior and can fail. Chat is best-effort. No cancellation/refund flow was found.

### Appointments and interviewer dashboard

- getMyAppointments() maps Clerk ID to a local User and queries only by the current user’s participant ID. It selects counterparty, timestamps, status, streamCallId, recording, and feedback summary/rating. Unknown/unassigned users get an empty list.
- /appointments displays sessions, status, counterparty, date, optional feedback summary, call/chat link, and recording link.
- getDashboardData() requires INTERVIEWER and reads up to 20 bookings, future non-BLOCKED availability, sum of BOOKING_EARNING transactions, and 10 payouts.
- dashboard page composes EarningsSection, AppointmentsSection, AvailabilitySection. Dashboard mutation is availability only.

Limits: no feedback create/write action and no cancel action were found. Earlier live DB snapshot was empty of bookings and availabilities.

### Pricing and checkout

- lib/data.js defines Free, Starter, Pro display prices/credit amounts and Clerk plan IDs for paid plans.
- PricingSectionWithRole is a server component that resolves local role; PricingSection uses Clerk useAuth and CheckoutButton with monthly period for signed-in non-interviewers.
- UpgradeModal uses the same plan list. CreditButton opens it for interviewees; interviewers see earned credits without a purchase action.
- checkUser syncs Clerk plan to local credits while rendering header. Existing-user allocation uses a conditional update on the previously read plan and timestamp to avoid duplicate monthly credits from concurrent renders.

Not verified: whether the plan IDs exist in the active Clerk Billing dashboard, checkout/payment completion, tax/refund policy, or subscription lifecycle consistency. No Stripe SDK or payment webhook is present. Marketing copy advertises AI feedback/recording, but marketing copy is not proof those features are delivered.

### Stream calls, chat, and tokens

1. Booking creates a Stream call with type default, booking UUID, creator, two members, start timestamp, mic/camera off, and plan-dependent recording.
2. /call/[callId] requires Clerk identity, loads booking and checks the Clerk ID matches either participant, rejects cancelled or call-less rows, then passes only the correct participant identity to CallRoom.
3. CallUI creates StreamVideoClient with the public API key. Its tokenProvider invokes getCallToken(bookingId). The server repeats identity/participant checks, requires SCHEDULED, then mints a one-hour token scoped to default:<streamCallId>. UI joins, renders SpeakerLayout/CallControls, disconnects when leaving.
4. ChatRoom calls getChatToken, connects as booking participant, watches the messaging channel whose ID equals booking ID, listens for message.new, and sends text up to 4,000 characters. Server refuses cancelled sessions and permits completed follow-up chat.
5. lib/stream.js creates a server SDK client only if NEXT_PUBLIC_STREAM_API_KEY and STREAM_SECRET_KEY exist. Secret remains server-side; public key is supplied to browser.

Missing external setup to confirm: Stream keys; default call type, recording permissions, messaging channel type/member access; webhook URL and subscriptions. Previous read-only Stream API request authenticated; no video call/chat message/recording test was made. UI reports connection/join/send errors; booking chat provisioning errors are logged but do not necessarily fail booking.

### Call lifecycle and Stream webhook

POST /api/webhooks/stream gets Stream client and x-signature, reads raw body, verifies signature before JSON parsing. Missing config/signature or invalid signature returns 401; invalid JSON returns 400.

- call.recording_ready: if call_recording.url is an HTTPS string, stores it on matching booking.
- call.session_ended: finds booking by streamCallId. If SCHEDULED, conditionally updates to COMPLETED; if update count is nonzero, increments interviewer creditBalance by creditsCharged and creates positive BOOKING_EARNING.
- Unknown/missing call IDs are acknowledged. Other event types are not processed.

The conditional status transition prevents duplicate session-ended events from paying twice under expected DB semantics. Webhook URL/subscriptions/retry behavior and real recording were not verified. DB exceptions are uncaught in this handler and will produce a server error/provider retry scenario.

### AI, feedback, and payout

actions/aiQuestions.jsx always returns failure with a message that no provider/API key is configured. The call page’s AIQuestions component displays “AI questions unavailable.” No AI feedback generation path was found. Feedback is only a schema relation and read in appointments if present.

actions/payout.js only reads an interviewer’s own payout history or detail. PayoutReviewClient explicitly says withdrawal submission is disabled because the application has no conversion rate, fee policy, or authorized payout processor. There is no payout-create action. Do not claim cash payout is enabled.

## 5. Prisma/PostgreSQL model

prisma/schema.prisma declares PostgreSQL and writes the generated client to lib/generated/prisma. prisma.config.ts uses DIRECT_URL for Prisma CLI. lib/prisma.js uses DATABASE_URL through pg and PrismaPg at runtime.

### Models and relationships

- **User**: UUID primary key; unique Clerk ID/email; name/image; role default UNASSIGNED; creation/update timestamps. Interviewee fields: credits, currentPlan, creditsLastAllocatedAt. Interviewer fields: bio/title/company/yearsExp/categories/creditRate/creditBalance. Relations: availability, interviewee bookings, interviewer bookings, transactions, payouts.
- **Availability**: UUID, interviewerId foreign key, startTime/endTime, status default AVAILABLE. Interviewer delete cascades. Index interviewerId/startTime. Status: AVAILABLE, BOOKED, BLOCKED.
- **Booking**: UUID id; separate intervieweeId and interviewerId relations to User; start/end; status default SCHEDULED; creditsCharged; optional unique streamCallId; optional recordingUrl; timestamps. Feedback relation and transactions. Indexes status/createdAt and participant/status. Status: SCHEDULED, COMPLETED, CANCELLED. No database range exclusion constraint.
- **Feedback**: unique bookingId gives one-to-one booking; summary, technical, communication, problemSolving, recommendation, strengths, improvements, overallRating, optional sessionRating/comment, createdAt. Ratings: POOR, AVERAGE, GOOD, EXCELLENT. Schema does not say AI created it.
- **CreditTransaction**: userId foreign key, signed amount, type, optional bookingId relation, createdAt. Types CREDIT_PURCHASE, BOOKING_DEDUCTION, BOOKING_EARNING, ADMIN_ADJUSTMENT. Booking path writes deduction; webhook writes earning. checkUser credit allocation does not write ledger transactions.
- **Payout**: interviewerId foreign key, credits, platformFee/netAmount floats, paymentMethod/paymentDetail strings, status PROCESSING/PROCESSED, adminNote and processing metadata/timestamps. Indexed by status/date and interviewer/status. This model exists without a submission action.

Relationship diagram:

    User (interviewer) 1-to-many Availability
    User (interviewee) 1-to-many Booking many-to-1 User (interviewer)
    Booking 1-to-0-or-1 Feedback
    User 1-to-many CreditTransaction
    Booking 1-to-many CreditTransaction (optional booking relation)
    User (interviewer) 1-to-many Payout

The User role is one enum value, so one row is interviewee, interviewer, or unassigned. Relations use local UUIDs; Clerk ID is a separate field.

Actual query patterns:

    db.user.findUnique({ where: { clerkUserId: clerkUser.id } })
    db.booking.findMany({ where: { intervieweeId: user.id } })
    tx.user.updateMany({
      where: { id: interviewee.id, credits: { gte: cost } },
      data: { credits: { decrement: cost } }
    })

Schema/migration state is not the same as data state. Previous read-only verification found one applied migration and an up-to-date database; prior aggregate snapshot had 2 users, 0 bookings, 0 Availability rows. No individual account data is reproduced here.

## 6. External configuration and environment variables

.env and .env.local exist and are gitignored. Only names were inspected for this report, never values.

| Variable | Purpose/type | Evidence |
|---|---|---|
| NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY | Public Clerk browser application key. | Name present; prior read-only Clerk API request succeeded using secret credential. Browser sign-in not tested. |
| CLERK_SECRET_KEY | Secret Clerk server API key. | Name present; prior read-only Clerk API request succeeded. |
| NEXT_PUBLIC_CLERK_SIGN_IN_URL | Public Clerk route setting. | Present by name; source route is /sign-in; exact value not inspected. |
| NEXT_PUBLIC_CLERK_SIGN_UP_URL | Public Clerk route setting. | Present by name; source route is /sign-up; exact value not inspected. |
| DATABASE_URL | Secret runtime Postgres URL used by lib/prisma.js. | Present by name; prior read-only database connection/query succeeded. |
| DIRECT_URL | Secret Prisma CLI datasource in prisma.config.ts, commonly direct rather than pooled. | Present by name; prior migrate status succeeded. No migration was run here. |
| NEXT_PUBLIC_STREAM_API_KEY | Public Stream app key, used by server and browser. | Present; prior read-only Stream API query authenticated. No call was tested. |
| STREAM_SECRET_KEY | Secret server-side Stream API/token key. | Present; prior read-only Stream API query authenticated. |
| ARCJET_KEY | Secret key used by proxy.js. | Present by name; Arcjet deployed decisions were not separately tested. |
| AI provider key | Current source reads no AI provider key; action reports none configured. | AI generation unavailable. |

Clerk plan IDs/prices are constants in lib/data.js; actual Billing plan existence is unverified. No Stripe package/key/webhook was found. Stream webhook signature verification uses Stream SDK and server secret; no separate webhook secret variable was found.

### Dashboard setup to verify before release

- **Clerk:** production/development keys, origins and redirects for /sign-in and /sign-up, monthly Billing plans matching starter/pro plan IDs, entitlement names matching auth().has({plan:"pro"}) and has({plan:"starter"}).
- **Stream:** application key/secret, default call type, media and recording permissions, auto-recording eligibility, messaging type/member behavior, deployed webhook URL ending /api/webhooks/stream, and call.recording_ready/call.session_ended event subscriptions.
- **Postgres:** valid runtime and CLI URLs, pooling/direct connection policies. Previous connectivity/migration checks succeeded; dashboard/network configuration was not reviewed.
- **Arcjet:** active key/policy for shield and detectBot. Home and Stream webhook skip Arcjet.
- **AI/payout:** provider, prompt/output rules, currency conversion, platform fees, processor, balance reservation, and settlement logic are absent.

### Exact manual end-to-end test still required

Run this only in isolated development/test Clerk, PostgreSQL, and Stream projects. Do not use production accounts or a real paid checkout:

1. Create one test INTERVIEWER and two test INTERVIEWEE accounts through Clerk/onboarding. Give the candidates test credits through the project’s approved test setup. From the interviewer dashboard create one future 2-hour window with a known start (for example 09:00–11:00 in the test timezone).
2. Sign in as a candidate and open that profile. Confirm the UI offers 09:00, 09:45, and 10:30 for that window. Attempt to submit 09:05 through the authenticated action request: it must be rejected before any Stream call is created and without changing credits or adding a Booking/ledger row.
3. Submit one valid slot and verify one SCHEDULED Booking, one negative BOOKING_DEDUCTION, and exactly one cost removed from the interviewee balance. Then try the same slot from another candidate and from two concurrent requests; both conflict attempts must fail, and the database must still have one overlapping booking and one deduction.
4. As both participants, open the call and send/receive chat messages. As a third account, try the call page and both token actions; access must fail. Confirm that the scheduled call can join only for the two participants.
5. End the Stream session. Confirm a correctly signed call.session_ended event changes status once, increments interviewer creditBalance once, and creates one BOOKING_EARNING row. Replay the event and confirm no second earning. For a Pro test plan, verify recording is enabled in the Stream dashboard, then confirm call.recording_ready stores an HTTPS recording URL. Check invalid/unsigned events return 401.
6. In Clerk Billing test mode, verify both configured plan IDs exist, are monthly, and expose the expected plan slugs. Complete a test-mode checkout; verify entitlement and the intended 1/5/15 credit allocation. Trigger parallel page loads and confirm only one monthly allotment is applied. Decide and verify upgrade/downgrade proration and renewal-date versus calendar-month behavior before treating balances as production billing.

The current repository has no stated rules for cancellation timing/refunds, whether feedback is interviewer- or AI-authored, AI provider/prompt/output requirements, currency conversion/fees, or payout settlement. Those decisions and provider/test credentials are prerequisites before implementing those workflows; this project does not simulate them.

## 7. Security and trust boundaries

### Authentication and authorization

Authentication asks who is signed in; Clerk answers this. Authorization asks what that user may do; server code checks local role and ownership. proxy.js protects route prefixes for signed-in users. Server actions/pages additionally check roles and participant identity. RoleRedirect and hidden buttons are UX behavior, not security barriers.

- Dashboard and availability actions require INTERVIEWER.
- Profile/slot/booking actions require INTERVIEWEE.
- Appointment query scopes to authenticated local user.
- Payout history requires INTERVIEWER and query is scoped to that interviewer.
- Call page and token actions compare Clerk ID to the booking’s two participant IDs.

### Calls and webhooks

Call page and token action each check participant membership. Token is user-specific, call-specific, and one hour. Chat token is also generated server-side after participant check. Stream external ACL settings still need confirmation.

Webhook validates signature over raw body before parsing/mutating DB. It skips Arcjet, relying on Stream signature. Deployment URL/event subscription/retries are untested.

### Validation and limitations

Server validates onboarding and booking data; booking debit is conditional, booking/availability use serializable transactions. Client checks make UX better but do not replace server checks.

Limits visible in source:
- createBooking validates a future in-window conflict-free 45-minute interval, but not exact slot-grid alignment.
- Schema has no range exclusion constraint, so writers bypassing server actions can violate non-overlap.
- Availability status remains AVAILABLE on booking; conflicts are inferred from Booking rows.
- getCallToken requires status SCHEDULED but does not compare current time to start/end, so clock-time access is not separately bounded before a status transition.
- Payout.paymentDetail is a schema string field, but no payout form/write flow is present.
- No role change after onboarding is available in completeOnboarding.

### Arcjet and secrets

proxy.js applies LIVE shield and bot detection, allowing search-engine/preview bot categories. It has no rateLimit rule, though the marketing card mentions rate limiting. Homepage and webhook bypass Arcjet. Secret variables are read on server: CLERK_SECRET_KEY, DATABASE_URL, DIRECT_URL, STREAM_SECRET_KEY, ARCJET_KEY. NEXT_PUBLIC variables are public by design and must not contain secrets. .env files are ignored by Git. No values are printed in this document.

## 8. Code walkthrough

### actions/booking.js

- getInterviewee(): Clerk current user → local User by clerkUserId → requires INTERVIEWEE.
- getInterviewerProfile(interviewerId): selects interviewer profile and future available windows.
- getOpenSlots(interviewerId, dayStartValue, dayEndValue): parses/validates max 25-hour range, verifies interviewer, reads availability/bookings, and delegates generation to getOpenSlotsForDay in lib/booking-rules.mjs. Slot boundaries are anchored to each availability start.
- createBooking({interviewerId,startTime}): checks role/time/interviewer/credit; preflights the requested start against an available slot and conflict before provisioning Stream; then calls persistBookingTransaction from lib/booking-transaction.mjs in serializable isolation. The transaction repeats the slot, availability, conflict, and conditional debit checks before creating Booking and CreditTransaction. Attempts Stream cleanup after failure.

### actions/appointments.js

getMyAppointments() returns an empty list for signed-out users. For a known user, it chooses filter by role and local user ID and selects booking, counterpart, recording, and feedback display fields. Browser does not supply another user ID.

### actions/call.js

getCallToken(bookingId) requires signed-in participant, SCHEDULED booking, and Stream ID, then returns one-hour token with one allowed call CID. getChatToken(bookingId) checks participant and rejects cancelled status before returning one-hour Stream user token; completed chat remains allowed. Both and the call page use isBookingParticipant from lib/access-control.mjs.

### actions/dashboard.js

getInterviewer() resolves Clerk identity to local user. getDashboardData() role-checks then loads sessions, future availability, aggregate earning transactions, payouts, and balance. createAvailabilityWindow validates then transactionally checks overlap and inserts. removeAvailabilityWindow checks ownership and scheduled bookings then marks BLOCKED transactionally. Both return structured results and retry text if transactions fail.

### actions/user.js

getSignedInDbUser(select) is server-only. It resolves Clerk current user and returns the matching local User, optionally with a Prisma select. It does not create/update.

### actions/payout.js

getPayoutPageData(payoutId) requires sign-in and INTERVIEWER. It returns the user’s own history or a payout whose ID and interviewerId both match. No payout write or payment call exists.

### actions/aiQuestions.jsx

generateInterviewQuestions() always returns failure with the configured-provider-missing message.

### lib/stream.js / lib/prisma.js

getStreamServerClient() returns null if either Stream key is absent; otherwise caches a server StreamClient. allocatePlanCreditsOnce in lib/credit-allocation.mjs uses updateMany with the previously read plan and allocation timestamp as compare-and-update conditions, so only one concurrent request can allocate the same plan period. lib/prisma.js creates a pg Pool from DATABASE_URL, wraps it in PrismaPg, constructs PrismaClient, and caches globally outside production to reduce dev hot-reload connections.

### Profile, slot picker, appointments, call

app/(main)/interviewers/[id]/page.jsx fetches profile and renders details and SlotPicker. SlotPicker produces 14 date choices, requests server open slots, displays loading/empty states, calls createBooking, then toasts and routes to the call page. app/(main)/appointments/page.jsx uses getMyAppointments and renders status/other participant/date/feedback/recording links.

app/(main)/call/[callId]/page.jsx requires Clerk user and verifies participant IDs before rendering CallRoom; missing/nonparticipant/cancelled/call-less rows fail. CallRoom composes CallUI, ChatRoom, and AIQuestions. CallUI connects and joins Stream Video; ChatRoom watches and sends Stream messages; AIQuestions is the unavailable notice.

### Stream webhook

app/api/webhooks/stream/route.js handles POST, verifies raw signature, parses payload, stores HTTPS recording URLs, and handles session end in a DB transaction with conditional completion and interviewer earning ledger entry. Other types are acknowledged with no action.

### Proxy/auth

proxy.js wraps requests in clerkMiddleware, screens non-home/non-webhook requests with Arcjet, and gates protected URL prefixes by Clerk user ID. HeaderRole syncs identity/user row; HeaderClient displays role-appropriate navigation and balance label; RoleRedirect redirects by role. Pages and server actions must enforce the actual access rights.

## 9. Verification and known limitations

The latest booking-verification work ran the focused tests, lint, build, read-only database query, and Prisma migration status. It did not run a live booking, checkout, Stream call/chat/recording/webhook, Arcjet request, or migration. No database writes were performed.

| Check | Existing evidence | Does not prove |
|---|---|---|
| Lint | Latest npm.cmd run lint: exit 0; 0 errors, 22 generated Prisma warnings. | Warning-free lint or runtime behavior. |
| Build | Latest npm.cmd run build: exit 0; Next generated 14 pages/routes. | Live provider flows or deployment. |
| Audit | Previous audit: 0 production findings; 9 high-severity development-tree findings. | Fresh audit status. |
| Tests | npm.cmd test / node:test passed 8 focused unit tests for slot boundaries, overlap, debit/ledger sequencing, participant checks, and concurrent allocation guard. | Uses mocked DB calls; no live transaction/concurrency, provider, or full browser E2E test. |
| Database | Read-only PostgreSQL connection succeeded; Prisma reports one migration and up-to-date schema. Latest aggregate snapshot: 2 users, 0 bookings, 1 availability. | No booking flow with authenticated test user and populated booking data. |
| Clerk | Previous read-only Clerk API count request succeeded. | Browser sign-in, roles, or checkout. |
| Stream | Previous read-only Stream query succeeded. | Video/chat/recording/webhook delivery or dashboard configuration. |
| Arcjet | Key name and source rules inspected. | Deployed Arcjet decisions/configuration. |
| AI/payout | Source explicitly disables AI question generation and payout submission; no feedback generator. | Working AI or payout integrations. |

Landing page metrics/chat/feedback mockups are static; AI and payout feature copy exceeds implemented workflows. In a presentation, identify them as illustrative/planned, not live user data.

## 10. Placement interview preparation

### 30-second introduction

> PrepIQ is a two-sided mock-interview marketplace built with Next.js, React, Clerk, Prisma, PostgreSQL, and Stream. Interviewees browse interviewer profiles, choose a 45-minute availability slot, and book using credits. Interviewers manage availability and see sessions and earned credits. Booking validation and credit changes happen server-side in a database transaction. Stream is used for video and booking chat, with participant access checks and a signed webhook for recording/session completion. AI feedback and payout submission are not complete.

### Two-minute explanation

> The app uses the Next.js App Router. Server pages load data, while client components manage filters, slot selection, checkout buttons, chat, and video controls. Clerk identifies a person; PrepIQ stores a corresponding Prisma User row and role. The role controls navigation and server-side access checks.
>
> Interviewers enter future availability from the dashboard. The server validates it and checks overlap. An interviewee’s profile asks the server for 45-minute slots built from availability minus scheduled bookings. On booking, the server rechecks the time, conflict, and credit balance in a serializable transaction, writes a booking and deduction ledger row, and provisions Stream call/chat resources. The external Stream setup is not atomic with PostgreSQL; cleanup is attempted if the database write fails.
>
> At the call route, the server confirms the current Clerk identity is a participant. A server action mints a one-hour call-scoped Stream token. Chat uses a participant-scoped user token. Signed Stream events can save a recording URL or complete the booking and credit the interviewer.
>
> The source implements the marketplace flow, but a prior DB snapshot had no availability or bookings, so a real booking was not demonstrated. Stream API credentials were checked read-only, but no call or webhook delivery was tested. AI question generation reports unavailable, no AI feedback generator exists, and payout submission is disabled until financial rules and a payout processor exist.

### Architecture sketch

    Browser React components
      ├─ Clerk sign-in and Billing CheckoutButton
      ├─ SlotPicker → server action → Prisma → PostgreSQL
      ├─ CallUI → server token action → Stream Video
      └─ ChatRoom → server token action → Stream Chat

    Next.js server pages/actions
      ├─ Clerk identity + local User role/ownership checks
      ├─ Prisma reads/writes and booking transaction
      └─ Stream Node SDK holds server secret

    Stream webhook → signature validation → booking/recording/credit updates
    Next proxy → Clerk route gate + Arcjet shield/bot detection

### 30 project-specific questions and answers

1. **What problem does PrepIQ solve?** It connects candidates to experienced interviewers for realistic mock sessions. Technically it combines discovery, scheduling, credits, and session communication.
2. **Why Next.js?** It provides App Router pages, server rendering, server actions, and API route handlers in one project.
3. **Why React?** Reusable components and browser state support filters, slot selection, chat, and video controls.
4. **Why Prisma rather than SQL everywhere?** A schema-generated client gives typed model/relation queries and transactions; raw SQL remains useful for DB-specific operations.
5. **What is a Server Component?** App Router’s default server-rendered component; it can load data without shipping that server code to the browser. Client components need use client for browser state/event handlers.
6. **What is a server action here?** A server function called from UI, such as createBooking, that checks the user and performs protected writes.
7. **What does Clerk do?** It authenticates users and supplies plan state; local PrepIQ User rows store app roles and marketplace data.
8. **Why a local User table if Clerk stores users?** The app needs roles, profiles, balances, availability, and booking relations.
9. **How is role selected?** completeOnboarding accepts only INTERVIEWEE/INTERVIEWER and updates a local UNASSIGNED row once.
10. **How is /dashboard protected?** Proxy requires sign-in; getDashboardData separately requires INTERVIEWER.
11. **How does discovery work?** getInterviewers queries interviewer rows; ExploreGrid filters the loaded results by category and text.
12. **How are slots generated?** getOpenSlots clips availability to the day, advances 45 minutes, removes past slots and scheduled overlaps, and returns ISO dates.
13. **How does booking work?** SlotPicker calls createBooking; server validates identity/slot/credit; serializable transaction rechecks, debits, creates booking and transaction.
14. **How prevent insufficient credits?** A friendly precheck is followed by conditional database update requiring credits >= cost inside transaction.
15. **How prevent same-slot double booking?** Server repeats overlap check in serializable transaction; conflicts fail and attempt Stream cleanup. This was not concurrency-tested.
16. **Why a credit transaction table?** It records deductions and earnings as signed typed ledger events. Monthly plan allocations currently update balance without writing CREDIT_PURCHASE rows.
17. **How does interviewer earn?** A signed session-ended webhook completes booking then increments balance and writes BOOKING_EARNING.
18. **How are appointments private?** Query derives local user from Clerk and filters only that user’s participant foreign key.
19. **How block another user from a call?** Page and token actions each compare Clerk ID to both booking participants.
20. **How generate video token?** getCallToken uses server Stream client, participant local ID, one allowed call CID, one-hour validity.
21. **Why not expose Stream secret?** It signs privileged API/token operations; only the public key and restricted token go to browser.
22. **How does Chat work?** Booking creates a two-member channel; browser uses a server token and watches/sends on that booking channel.
23. **What if Chat provisioning fails?** Booking continues after logging; Chat UI may fail to open/send.
24. **How does webhook affect data?** Verify raw signature, store recording URL or complete scheduled booking and credit interviewer.
25. **How avoid double earning?** Completion only proceeds from SCHEDULED and conditional update must affect a row before the earning is written.
26. **What does Arcjet do?** LIVE shield and bot detection in proxy; no rate-limit rule is configured in source.
27. **Why BLOCKED instead of delete availability?** Removal preserves the row but stops it being offered.
28. **What if Stream succeeds but DB fails?** Action attempts compensating deletion; cleanup can fail, because there is no cross-service transaction.
29. **Which features are incomplete?** AI questions/feedback and payout submission; live checkout/call/webhook not proven.
30. **What did you personally contribute?** Answer honestly based on your own work. Explain a file you actually changed and can walk through; do not claim authorship you cannot support.

### 15 deeper follow-ups

1. **Why Serializable?** It asks PostgreSQL to make concurrent transactions equivalent to a serial order; a conflict may abort and require retry. Stream setup is outside this transaction.
2. **Does Serializable create a range constraint?** No. There is no DB exclusion constraint; code paths using different writes can bypass the action’s overlap policy.
3. **Why conditional debit?** Pre-read can be stale; the conditional update and decrement are one database operation.
4. **What if Stream creates a call but Postgres fails?** Compensating deletion is attempted. This is a distributed transaction and cleanup may fail.
5. **What if chat creation fails?** It logs and booking can proceed; chat may be unavailable.
6. **How Clerk and DB identities relate?** Unique User.clerkUserId maps external Clerk identity to local UUID used by relations.
7. **Why unique streamCallId?** It maps one booking to its external call and prevents sharing the same ID across bookings; optionality permits records without an integration ID.
8. **What makes webhook idempotent?** SCHEDULED-to-COMPLETED conditional transition guards earning side effects; recording URL assignment is repeatable.
9. **What webhook settings need confirmation?** URL, events, signature secret, retries, monitoring, and duplicate behavior. Dashboard was not checked.
10. **Can any signed-in user ask for any token?** No; action reloads booking and checks Clerk ID participant membership.
11. **Does getCallToken enforce clock-time?** It enforces SCHEDULED and participation, but does not compare current time with booking start/end.
12. **How subscription credits are allocated?** checkUser checks Clerk plan and adds 1/5/15 credits on plan change or new calendar month; it runs during header user sync.
13. **Are plan allocations in the ledger?** No allocation transaction is written by checkUser; booking debit and webhook earning do create ledger rows.
14. **Does server require exact slot alignment?** It checks future/in-window/45-minute/conflict but not exact generated slot alignment; UI is stricter than server action.
15. **What before claiming AI/payout works?** AI needs configured provider, validated outputs, persistence, authorization, and tests. Payout needs approved conversion/fees, balance reservation, processor, safe detail handling, reconciliation, and failure tests. These are absent.

### Claims to verify before presenting

- Do not claim AI questions/feedback work; source says otherwise.
- Do not present static landing metrics, balance, feedback, or sample messages as real user data.
- Do not claim real call, recording, paid checkout, or webhook delivery has been demonstrated; prior read-only API checks are narrower.
- Do not claim withdrawals are available.
- Distinguish source-level code review from a live tested user flow.

## 11. Learning roadmap

| Order | Read | Concepts | Practical check |
|---|---|---|---|
| 1. Architecture/routes | app/, proxy.js, app/layout.js, next.config.mjs | App Router, route groups, server/client components, proxy, server actions. | Draw /explore and /call request paths and name each responsible file. |
| 2. Booking | SlotPicker, actions/booking.js, actions/dashboard.js, appointments page | Input checks, interval overlap, transactions, isolation, external cleanup. | Trace one slot and identify checks repeated on server. |
| 3. Database | prisma/schema.prisma, migration SQL, lib/prisma.js, prisma.config.ts | Keys, relations, enums, indexes, pooled/direct URLs. | Sketch User–Booking–Availability and explain conditional debit. |
| 4. Identity/roles | proxy.js, HeaderRole, HeaderClient, RoleRedirect, checkUser, onboarding action | Authentication vs authorization, Clerk IDs, local roles. | Explain Clerk-to-User mapping and server role checks. |
| 5. Security | actions/call.js, call page, payout action, Stream webhook | Ownership, restricted tokens, raw-body signature, webhook idempotency. | Explain why direct action invocation does not bypass participant checks. |
| 6. Stream | lib/stream.js, booking action, CallUI, ChatRoom, webhook | Server/browser SDK, call/channel IDs, token provider, event lifecycle. | Draw booking → join → webhook; list dashboard setup needed. |
| 7. UI/style | globals.css, components/ui, animate-ui, hooks, helpers | Tailwind v4, Radix, variants, motion, local fonts, effects. | Explain responsive styling and one animation/date helper. |
| 8. Incomplete integrations | PricingSection, lib/data, aiQuestions, payout page | Clerk Billing, truthful feature boundaries, AI/payout requirements. | Separate static marketing text from working server actions. |
| 9. Verification | package.json and recorded checks | Build vs lint vs tests vs live checks. | For a feature, explain evidence needed for source, build, and production. |

---

**Documentation boundary:** this file explains source behavior and preserves project state. It is not a claim that every external integration or user journey has been exercised in production.
