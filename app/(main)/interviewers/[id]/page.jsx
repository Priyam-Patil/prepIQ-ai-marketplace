
import { connection } from "next/server";
import { notFound, redirect } from "next/navigation";
import { currentUser } from "@clerk/nextjs/server";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { db } from "@/lib/prisma";
import { getInterviewerProfile } from "@/actions/booking";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { GrayTitle, SectionLabel } from "@/components/reusables";
import { StarsBackgroundDemo } from "@/components/demo-components-backgrounds-stars";
import { CATEGORY_LABEL, EXPECT_ITEMS } from "@/lib/data";
import SlotPicker from "./_components/SlotPicker";

export const instant = false;

export default async function InterviewerProfilePage({ params }) {
  await connection();

  const { id } = await params;
  const user = await currentUser();

  if (!user) redirect("/");

  const dbUser = await db.user.findUnique({
    where: { clerkUserId: user.id },
    select: { role: true, credits: true },
  });

  if (!dbUser) redirect("/");
  if (dbUser.role === "UNASSIGNED") redirect("/onboarding");

  const result = await getInterviewerProfile(id);

  if (result?.error) redirect("/onboarding");

  const interviewer = result?.interviewer;

  if (!interviewer) notFound();

  const name = interviewer.name || "PrepIQ Interviewer";
  const categories = interviewer.categories || [];
  const creditRate = interviewer.creditRate ?? 1;
  const creditLabel = `${creditRate} ${
    creditRate === 1 ? "credit" : "credits"
  }`;

  const hasAvailability = (interviewer.availabilities || []).length > 0;

  return (
    <main className="min-h-screen bg-black text-white">
      {/* Hero identity banner */}
      <section className="relative isolate overflow-hidden border-b border-white/[0.08]">
        <div className="pointer-events-none absolute inset-0 -z-10">
          <StarsBackgroundDemo />
        </div>

        <div className="relative mx-auto flex max-w-6xl flex-col gap-8 px-5 pb-12 pt-8 sm:px-8 sm:pb-14 sm:pt-12 lg:px-12 lg:pt-16">
          <Link href="/explore" className="w-fit">
            <Button
              variant="link"
              className="cursor-pointer text-stone-400 hover:text-white"
            >
              <ArrowLeft size={14} />
              Back to explore
            </Button>
          </Link>

          <div className="flex min-w-0 flex-col items-start gap-5 sm:flex-row sm:gap-8">
            <Avatar className="size-20 shrink-0 rounded-2xl border-2 border-white/10 sm:size-24">
              <AvatarImage
                src={interviewer.imageUrl || undefined}
                alt={name}
                className="rounded-2xl object-cover"
              />
              <AvatarFallback className="rounded-2xl border border-amber-400/20 bg-amber-400/10 text-3xl font-medium text-amber-400">
                {name.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>

            <div className="min-w-0 pt-1">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-amber-400">
                Interviewer profile
              </p>

              <h1 className="mt-3 break-words font-serif text-4xl leading-tight tracking-tight sm:text-5xl lg:text-6xl">
                <GrayTitle>{name}</GrayTitle>
              </h1>

              {(interviewer.title || interviewer.company) && (
                <p className="mt-3 flex flex-wrap items-center gap-2 text-sm font-light text-stone-400 sm:text-base">
                  {interviewer.title}
                  {interviewer.title && interviewer.company && (
                    <span className="text-stone-700">·</span>
                  )}
                  {interviewer.company}
                </p>
              )}

              <div className="mt-5 flex flex-wrap items-center gap-2">
                {interviewer.yearsExp != null && (
                  <Badge
                    variant="outline"
                    className="border-white/10 px-3 py-1 text-xs text-stone-400"
                  >
                    {interviewer.yearsExp}+ years experience
                  </Badge>
                )}

                <Badge
                  variant="outline"
                  className="border-amber-400/25 bg-amber-400/[0.08] px-3 py-1 text-xs text-amber-400"
                >
                  {creditLabel} / session
                </Badge>

                <Badge
                  variant="outline"
                  className={
                    hasAvailability
                      ? "border-green-500/20 bg-green-500/[0.08] px-3 py-1 text-xs text-green-400"
                      : "border-white/10 px-3 py-1 text-xs text-stone-500"
                  }
                >
                  <span
                    className={`mr-1.5 inline-block size-2 rounded-full ${
                      hasAvailability ? "bg-green-400" : "bg-stone-600"
                    }`}
                  />
                  {hasAvailability ? "Available" : "No availability"}
                </Badge>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Profile details and booking */}
      <section className="mx-auto grid max-w-6xl grid-cols-1 items-start gap-6 px-5 py-8 sm:px-8 sm:py-10 lg:grid-cols-5 lg:gap-8 lg:px-12">
        {/* Left column */}
        <div className="order-2 flex min-w-0 flex-col gap-6 lg:order-1 lg:col-span-3">
          <section className="flex flex-col gap-5 rounded-2xl border border-white/10 bg-[#0f0f11] p-6 sm:p-8">
            <SectionLabel>About</SectionLabel>
            <p className="whitespace-pre-wrap text-sm font-light leading-7 text-stone-300 sm:text-base">
              {interviewer.bio ||
                "This interviewer has not added a profile summary yet."}
            </p>
          </section>

          <section className="flex flex-col gap-5 rounded-2xl border border-white/10 bg-[#0f0f11] p-6 sm:p-8">
            <div>
              <SectionLabel>Specialties</SectionLabel>
              <p className="mt-2 text-sm font-light text-stone-500">
                Interview categories this expert covers.
              </p>
            </div>

            {categories.length > 0 ? (
              <div className="flex flex-wrap gap-2.5">
                {categories.map((category) => (
                  <span
                    key={category}
                    className="rounded-xl border border-amber-400/20 bg-amber-400/[0.05] px-4 py-2 text-sm text-amber-400"
                  >
                    {CATEGORY_LABEL[category] || category}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-sm text-stone-500">
                No specialties have been added yet.
              </p>
            )}
          </section>

          <section className="flex flex-col gap-6 rounded-2xl border border-white/10 bg-[#0f0f11] p-6 sm:p-8">
            <div>
              <SectionLabel>What to expect</SectionLabel>
              <p className="mt-2 text-sm font-light text-stone-500">
                Details about your mock interview session.
              </p>
            </div>

            <ul className="flex flex-col gap-5">
              {EXPECT_ITEMS.map(([icon, title, description]) => (
                <li key={title} className="flex items-start gap-4">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-amber-400/20 bg-amber-400/10 text-lg">
                    {icon}
                  </span>
                  <div className="flex min-w-0 flex-col gap-1">
                    <p className="text-sm font-medium text-stone-200">
                      {title}
                    </p>
                    <p className="text-xs font-light leading-relaxed text-stone-500">
                      {description}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        </div>

        {/* Right column: PrepIQ booking component */}
        <aside className="order-1 min-w-0 lg:order-2 lg:col-span-2 lg:sticky lg:top-24">
          <SlotPicker
            interviewer={interviewer}
            interviewerCredits={creditRate}
            userCredits={dbUser.credits}
          />
        </aside>
      </section>
    </main>
  );
}
