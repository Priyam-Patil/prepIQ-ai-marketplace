
"use client";

import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Show, SignInButton, UserButton } from "@clerk/nextjs";

export default function Header() {
  return (
    <nav className="fixed inset-x-0 top-0 z-50 border-b border-gray-200/80 bg-white/95 text-black shadow-[0_8px_24px_-8px_rgba(107,114,128,0.22)] backdrop-blur-xl after:absolute after:inset-x-0 after:bottom-0 after:h-[2px] after:bg-gradient-to-r after:from-gray-400 after:via-amber-300 after:to-yellow-500 after:opacity-80 after:content-['']">
      <div className="mx-auto flex h-[76px] max-w-[1440px] items-center justify-between px-5 sm:px-10 lg:px-14">
        {/* PrepIQ Logo */}
        <Link
          href="/"
          aria-label="PrepIQ home"
          className="group flex shrink-0 items-center"
        >
          <Image
            src="/prepiq-logo02.png"
            alt="PrepIQ Logo"
            width={150}
            height={150}
            priority
            className="h-12 w-auto object-contain transition-transform duration-300 group-hover:scale-[1.04]"
          />
        </Link>

        {/* Authentication Actions */}
        <div className="flex items-center gap-3 sm:gap-5">
          <Show when="signed-out">
            <SignInButton mode="redirect">
              <Button
                variant="ghost"
                className="rounded-xl px-4 font-medium text-gray-700 transition-all duration-300 hover:bg-gray-100 hover:text-black"
              >
                Sign in
              </Button>
            </SignInButton>

            <Button
              variant="gold"
              asChild
              className="group rounded-xl border border-amber-300/70 px-4 font-semibold text-black shadow-[0_4px_12px_rgba(245,158,11,0.22)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_6px_20px_rgba(245,158,11,0.32)] sm:px-5"
            >
              <Link href="/sign-up">
                Get started
                <span className="ml-1 inline-block transition-transform duration-300 group-hover:translate-x-1">
                  →
                </span>
              </Link>
            </Button>
          </Show>

          <Show when="signed-in">
            <div className="rounded-full ring-2 ring-amber-400/20 transition-all duration-300 hover:ring-amber-400/60">
              <UserButton />
            </div>
          </Show>
        </div>
      </div>
    </nav>
  );
}
