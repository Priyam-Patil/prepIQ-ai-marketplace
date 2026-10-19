
import { Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import { Bot, Wallet } from "lucide-react";
// import { useEffect, useState } from "react";

import { AI_TAGS, AVATARS, LOGOS, ROLES, SLOTS } from "@/lib/data";
import {
  GoldTitle,
  GrayTitle,
  SectionHeading,
  SectionLabel,
} from "@/components/reusables";
import { StarsBackgroundDemo } from "@/components/demo-components-backgrounds-stars";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import PricingSectionWithRole from "@/components/PricingSectionWithRole";
import { CodeDemo } from "@/components/demo-components-animate-code";

function MockUI({ rows = 3 }) {
  const widths = ["w-4/5", "w-3/5", "w-2/5", "w-4/5", "w-1/2"];
  const colors = [
    "bg-white/5",
    "bg-white/5",
    "bg-amber-400/15",
    "bg-white/5",
    "bg-white/5",
  ];

  return (
    <div className="mt-5 overflow-hidden rounded-xl border border-white/10 bg-[#141417]">
      <div className="flex h-9 items-center gap-1.5 border-b border-white/10 bg-white/5 px-3.5">
        <span className="h-2 w-2 rounded-full bg-[#ff5f57]" />
        <span className="h-2 w-2 rounded-full bg-[#ffbd2e]" />
        <span className="h-2 w-2 rounded-full bg-[#28c840]" />
      </div>

      <div className="flex flex-col gap-2 p-4">
        {Array.from({ length: rows }).map((_, i) => (
          <div
            key={i}
            className={
              "h-2 rounded-full " +
              widths[i % widths.length] +
              " " +
              colors[i % colors.length]
            }
          />
        ))}
      </div>
    </div>
  );
}

export function BentoCard({
  icon,
  title,
  desc,
  children,
  className = "",
}) {
  return (
    <div
      className={
        "relative h-full overflow-hidden rounded-2xl border border-white/10 bg-[#0f0f11] p-9 transition duration-300 hover:border-amber-400/20 " +
        className
      }
    >
      <div className="pointer-events-none absolute inset-0 bg-linear-to-br from-amber-400/5 via-transparent" />

      <span className="relative mb-5 flex h-11 w-11 items-center justify-center rounded-xl border border-amber-400/20 bg-amber-400/10 text-xl">
        {icon}
      </span>

      <h3 className="relative mb-2 font-serif text-xl tracking-tight">
        {title}
      </h3>

      <p className="relative text-sm leading-relaxed text-stone-400">
        {desc}
      </p>

      {children && <div className="relative">{children}</div>}
    </div>
  );
}

export default function LandingPage() {
  return (
    <div className="min-h-screen overflow-x-hidden bg-[#0b0b0b] text-white">
      {/* HERO */}
      <section className="relative isolate grid min-h-screen grid-cols-1 gap-8 overflow-hidden bg-[#0b0b0b] px-4 pb-20 pt-28 sm:px-8 sm:pt-32 lg:grid-cols-5">
        <div className="pointer-events-none absolute inset-0 z-0">
          <StarsBackgroundDemo />
        </div>

        <div className="relative z-10 col-span-full flex flex-col items-center justify-center text-center lg:col-span-3 lg:-rotate-2">
          <Badge variant="gold">Powered by AI — Now in Beta</Badge>

          <h1 className="relative mt-5 max-w-4xl font-serif text-5xl tracking-tighter sm:text-6xl lg:text-7xl">
            <GrayTitle>Ace your next interview</GrayTitle>
            <br />
            <GoldTitle>with real experts</GoldTitle>
          </h1>

          <p className="relative mt-6 max-w-xl text-sm leading-relaxed text-stone-400 sm:text-base md:text-lg">
            Book 1:1 mock interviews with senior engineers from top companies.
            Get AI-powered feedback, role-specific questions, and the confidence
            to land your dream job.
          </p>

          <div className="relative mt-10 flex flex-wrap justify-center gap-3 sm:gap-4">
            <Link href="/onboarding">
              <Button variant="gold" size="hero">
                Get started
              </Button>
            </Link>

            <Link href="/explore">
              <Button variant="outline" size="hero">
                Browse Interviewers →
              </Button>
            </Link>
          </div>

          <div className="relative mt-8 flex items-center justify-center gap-3 sm:mt-16 sm:gap-4">
            <div className="flex">
              {AVATARS.map((av, i) => (
                <div
                  key={av.src ?? i}
                  className={
                    "h-8 w-8 overflow-hidden rounded-full border-2 border-[#0a0a0b] " +
                    (i > 0 ? "-ml-2" : "")
                  }
                >
                  <Image
                    src={av.src}
                    alt="User avatar"
                    width={32}
                    height={32}
                    className="h-full w-full object-cover"
                  />
                </div>
              ))}
            </div>

            <p className="text-center text-sm text-stone-500 sm:text-left">
              <strong className="font-medium text-stone-300">
                5,800+ engineers
              </strong>{" "}
              cracked FAANG interviews via PrepIQ
            </p>
          </div>
        </div>

        <div className="relative z-10 col-span-full mt-8 flex items-center justify-center lg:col-span-2 lg:mt-0 lg:rotate-3">
          <CodeDemo duration={35} delay={0} writing cursor />
        </div>
      </section>

{/* LOGOS */}
<section className="relative z-10 border-y border-white/10 bg-[#0b0b0b] py-12">
  <p className="mb-8 text-center text-xs font-medium uppercase tracking-widest text-stone-500">
    Interviewees landed roles at
  </p>

  <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-4 px-4 sm:gap-8 sm:px-6">
    {LOGOS.map((logo) => (
      <div
        key={logo.alt}
        className="flex min-w-0 flex-1 items-center justify-center"
      >
        <Image
          src={logo.src}
          alt={logo.alt}
          width={80}
          height={40}
          className="h-5 max-w-full object-contain opacity-100 grayscale-0 transition duration-300 hover:scale-110 sm:h-7"
        />
      </div>
    ))}
  </div>
</section>


      
{/* FEATURES */}
<section className="relative z-10 mx-auto max-w-6xl bg-[#0b0b0b] px-4 py-20 sm:px-6 sm:py-28">
  <div className="mx-auto mb-14 max-w-2xl text-center sm:mb-16">
    <SectionLabel>Features</SectionLabel>
    <SectionHeading
      gray="Everything you need,"
      gold="nothing you don't"
    />
    <p className="mx-auto mt-5 max-w-xl text-sm leading-7 text-stone-400 sm:text-base">
      Everything you need to practise smarter, connect with experienced
      engineers, and prepare confidently for your next interview.
    </p>
  </div>

  <div className="grid grid-cols-1 gap-5 md:grid-cols-12">
    {/* AI QUESTION GENERATOR */}
    <div className="md:col-span-7">
   
<BentoCard
  icon={<Bot size={21} className="text-amber-400" />}
  title={<GrayTitle>AI Question Generator</GrayTitle>}
  desc="Generate interview questions tailored to your role, experience, and skill level. Practise DSA, system design, and behavioural questions with an AI co-pilot."
  className="p-6 sm:p-8"
>
  <div className="mt-6 flex flex-wrap gap-2">
    {AI_TAGS.map((tag) => (
      <Badge
        key={tag.label}
        variant={tag.active ? "gold" : "outline"}
        className={
          tag.active
            ? "text-black"
            : "!border-white/25 !bg-transparent !text-stone-300 hover:!border-amber-400/50 hover:!text-white"
        }
      >
        {tag.label}
      </Badge>
    ))}
  </div>
</BentoCard>

    </div>

    {/* CREDIT SYSTEM */}
    <div className="md:col-span-5">
      <BentoCard
        icon={<Wallet size={20} className="text-amber-400" />}
        title={<GrayTitle>Credit System</GrayTitle>}
        desc="Manage your interview credits in one place. Book practice sessions and track your remaining balance."
        className="p-6 sm:p-8"
      >
        <div className="mt-6 flex items-center justify-between gap-4 rounded-xl border border-white/10 bg-[#141417] p-4 sm:p-5">
          <div>
            <p className="mb-2 text-xs font-medium text-stone-400">
              Your balance
            </p>
            <p className="bg-linear-to-br from-amber-300 to-amber-500 bg-clip-text font-serif text-4xl leading-none text-transparent">
              28
            </p>
            <p className="mt-2 text-xs text-stone-400">
              credits remaining
            </p>
          </div>
          <Badge variant="secondary">+10 this month</Badge>
        </div>
      </BentoCard>
    </div>

    {/* VIDEO CALLS */}
    <div className="md:col-span-4">
      <BentoCard
        icon="📹"
        title={<GrayTitle>HD Video Calls</GrayTitle>}
        desc="Connect with interviewers through video sessions with screen sharing and recording support."
        className="p-6 sm:p-7"
      >
        <MockUI rows={3} />
      </BentoCard>
    </div>

    {/* PERSISTENT CHAT */}
    <div className="md:col-span-4">
      <BentoCard
        icon="💬"
        title={<GrayTitle>Persistent Chat</GrayTitle>}
        desc="Keep your conversations in one place. Share preparation notes, ask follow-up questions, and exchange resources before or after your interview."
        className="p-6 sm:p-7"
      >
        <div className="mt-6 space-y-3 rounded-xl border border-white/10 bg-[#141417] p-4">
          <div className="max-w-[90%] rounded-xl rounded-tl-sm bg-white/[0.06] px-3 py-2.5 text-xs leading-relaxed text-stone-300">
            Could you share some tips for the system design round?
          </div>
          <div className="ml-auto max-w-[90%] rounded-xl rounded-tr-sm border border-amber-400/15 bg-amber-400/10 px-3 py-2.5 text-xs leading-relaxed text-amber-100">
            Start with requirements, then explain your architecture.
          </div>
          <div className="flex items-center gap-2 border-t border-white/10 pt-3">
            <div className="h-1.5 w-1.5 rounded-full bg-amber-400" />
            <span className="text-[11px] text-stone-500">
              Interview conversation
            </span>
          </div>
        </div>
      </BentoCard>
    </div>

    {/* SECURITY */}
    <div className="md:col-span-4">
      <BentoCard
        icon="🔒"
        title={<GrayTitle>Security by Arcjet</GrayTitle>}
        desc="Add a layer of protection with bot detection, rate limiting, and abuse prevention for supported application routes."
        className="p-6 sm:p-7"
      >
        <div className="mt-6 space-y-3 rounded-xl border border-white/10 bg-[#141417] p-4">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs text-stone-400">Bot protection</span>
            <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2 py-1 text-[10px] text-emerald-300">
              Protected
            </span>
          </div>
          <div className="h-px bg-white/10" />
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs text-stone-400">Rate limiting</span>
            <span className="text-xs text-amber-400">Enabled</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
            <div className="h-full w-2/3 rounded-full bg-linear-to-r from-amber-500 to-amber-300" />
          </div>
        </div>
      </BentoCard>
    </div>

    {/* AI FEEDBACK */}
    <div className="md:col-span-6">
      <BentoCard
        icon="📊"
        title={<GrayTitle>AI Feedback Reports</GrayTitle>}
        desc="Review actionable feedback on your answers, communication, and problem-solving approach so you know what to improve next."
        className="p-6 sm:p-8"
      >
        <div className="mt-6 grid grid-cols-2 gap-3">
          <div className="rounded-xl border border-white/10 bg-[#141417] p-4">
            <p className="text-xs text-stone-400">Communication</p>
            <p className="mt-2 font-serif text-2xl text-amber-400">
              Strong
            </p>
            <p className="mt-1 text-[11px] leading-relaxed text-stone-500">
              Clear and structured answers
            </p>
          </div>
          <div className="rounded-xl border border-white/10 bg-[#141417] p-4">
            <p className="text-xs text-stone-400">Problem solving</p>
            <p className="mt-2 font-serif text-2xl text-amber-400">
              Improve
            </p>
            <p className="mt-1 text-[11px] leading-relaxed text-stone-500">
              Explain trade-offs in more detail
            </p>
          </div>
        </div>
      </BentoCard>
    </div>

    {/* SCHEDULING */}
    <div className="md:col-span-6">
      <BentoCard
        icon="🗓️"
        title={<GoldTitle>Slot-based Scheduling</GoldTitle>}
        desc="Set interviewer availability and let candidates choose a convenient time. Make scheduling simpler without unnecessary back-and-forth."
        className="p-6 sm:p-8"
      >
        <div className="mt-6 flex flex-wrap gap-2">
          {SLOTS.map((slot) => (
            <span
              key={slot.label}
              className={
                "rounded-lg border px-3 py-2 text-xs " + slot.cls
              }
            >
              {slot.label}
            </span>
          ))}
        </div>
      </BentoCard>
    </div>
  </div>
</section>

      {/* ROLES */}
      <section className="relative z-10 mx-auto max-w-5xl bg-[#0b0b0b] px-6 pb-28">
        <div className="mb-16 text-center">
          <SectionLabel>Who it&apos;s for</SectionLabel>
          <SectionHeading gray="Built for both sides" gold="of the table" />
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {ROLES.map((role) => (
            <div
              key={role.label}
              className="relative h-full overflow-hidden rounded-2xl border border-white/10 bg-[#0f0f11] p-12 transition duration-300 hover:border-amber-400/20"
            >
              <div className="pointer-events-none absolute bottom-0 right-0 h-48 w-48 rounded-full bg-[radial-gradient(circle,rgba(251,191,36,0.05)_0%,transparent_70%)]" />

              <span className="relative mb-5 inline-block rounded-full border border-amber-400/20 bg-amber-400/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-widest text-amber-400">
                {role.label}
              </span>

              <h3 className="relative mb-4 font-serif text-2xl tracking-tight">
                {role.title}
              </h3>

              <p className="relative mb-8 text-sm leading-relaxed text-stone-400">
                {role.desc}
              </p>

              <ul className="relative space-y-3">
                {role.perks.map((perk) => (
                  <li key={perk} className="flex gap-3 text-sm text-stone-400">
                    <span className="mt-0.5 flex h-4 min-w-4 items-center justify-center rounded-full border border-amber-400/20 bg-amber-400/10 text-xs text-amber-400">
                      ✓
                    </span>
                    {perk}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* PRICING */}
      <section className="relative z-10 mx-auto max-w-5xl bg-[#0b0b0b] px-6 pb-28">
        <div className="mb-16 text-center">
          <SectionLabel>Pricing</SectionLabel>
          <SectionHeading
            gray="Simple, transparent"
            gold="credit-based plans"
          />
          <p className="mt-3 text-sm text-stone-400">
            Each credit = one session. Unused credits roll over.
          </p>
        </div>

        <Suspense
          fallback={
            <div
              aria-hidden="true"
              className="grid grid-cols-1 gap-5 md:grid-cols-3"
            >
              {[0, 1, 2].map((index) => (
                <div
                  key={index}
                  className={`h-[440px] animate-pulse rounded-2xl border p-10 ${
                    index === 1
                      ? "border-amber-400/20 bg-[#141417]"
                      : "border-white/10 bg-[#0f0f11]"
                  }`}
                />
              ))}
            </div>
          }
        >
          <PricingSectionWithRole />
        </Suspense>
      </section>

      {/* CTA */}
      <section className="relative z-10 mx-auto max-w-5xl bg-[#0b0b0b] px-6 pb-28">
        <div className="relative isolate overflow-hidden rounded-3xl border border-amber-400/20 bg-[#0b0b0b] px-3 py-20 text-center sm:px-16">
          <div className="pointer-events-none absolute inset-0 z-0">
            <StarsBackgroundDemo />
          </div>

          <div className="relative z-10">
            <h2 className="relative mb-4 font-serif text-4xl leading-tight tracking-tight md:text-5xl">
              <GrayTitle>Your next interview</GrayTitle>
              <br />
              <GoldTitle>starts here</GoldTitle>
            </h2>

            <p className="relative mb-11 text-sm font-light text-stone-400">
              Ace your next interview with PrepIQ.
            </p>

            <div className="relative flex flex-col justify-center gap-4 sm:flex-row">
              <Link href="/onboarding">
                <Button variant="gold" size="hero">
                  Get started
                </Button>
              </Link>

              <Link href="/explore">
                <Button variant="outline" size="hero">
                  Browse Interviewers →
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
