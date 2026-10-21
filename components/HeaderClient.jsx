"use client";

import Image from "next/image";
import Link from "next/link";
import {
  Show,
  SignInButton,
  SignUpButton,
  UserButton,
} from "@clerk/nextjs";

import { Button } from "@/components/ui/button";
import CreditButton from "@/components/CreditButton";

export default function HeaderClient({ role, user }) {
  const credits =
    role === "INTERVIEWER"
      ? user?.creditBalance ?? 0
      : user?.credits ?? 0;

  return (
    <nav className="fixed inset-x-0 top-0 z-50 border-b border-gray-200/80 bg-white/95 text-black shadow-[0_8px_24px_-8px_rgba(107,114,128,0.22)] backdrop-blur-xl after:absolute after:inset-x-0 after:bottom-0 after:h-[2px] after:bg-gradient-to-r after:from-gray-400 after:via-amber-300 after:to-yellow-500 after:opacity-80 after:content-['']">
      <div className="mx-auto flex h-[76px] max-w-[1440px] items-center justify-between px-5 sm:px-10 lg:px-14">
        <Link
          href="/"
          aria-label="PrepIQ home"
          className="shrink-0"
        >
          <Image
            src="/prepiq-logo02.png"
            alt="PrepIQ Logo"
            width={150}
            height={60}
            priority
            sizes="150px"
            className="h-12 w-auto object-contain"
          />
        </Link>

        <div className="flex items-center gap-2 sm:gap-4">
          <Show when="signed-out">
            <SignInButton mode="redirect">
              <Button variant="ghost">
                Sign in
              </Button>
            </SignInButton>

            <SignUpButton mode="redirect">
              <Button variant="gold">
                Get started →
              </Button>
            </SignUpButton>
          </Show>

          <Show when="signed-in">
            {role === "INTERVIEWEE" && (
              <>
                <Button variant="gold" asChild>
                  <Link href="/explore">
                    Explore
                  </Link>
                </Button>

                <Button variant="gold" asChild>
                  <Link href="/appointments">
                    My Appointments
                  </Link>
                </Button>
              </>
            )}

            {role === "INTERVIEWER" && (
              <Button variant="gold" asChild>
                <Link href="/dashboard">
                  Dashboard
                </Link>
              </Button>
            )}

            <CreditButton
              role={role}
              credits={credits}
            />

            <UserButton />
          </Show>
        </div>
      </div>
    </nav>
  );
}
