
"use client";

import Image from "next/image";
import { Button } from "@/components/ui/button";
import {
  Show,
  SignInButton,
  UserButton,
} from "@clerk/nextjs";
import Link from "next/link";

export default function Header() {
  return (
   <nav className="fixed inset-x-0 top-0 z-50 flex items-center justify-between border-b border-gray-200 bg-white px-4 py-4 text-black sm:px-10">
     <Link href="/" className="flex items-center">
  <Image
    src="/prepiq-logo02.png"
    alt="PrepIQ Logo"
    width={150}
    height={150}
    priority
    className="h-12 w-auto object-contain"
  />
</Link>

      <div className="flex items-center gap-3">
        <Show when="signed-out">
          <SignInButton mode="redirect">
            <Button variant="ghost">Sign in</Button>
          </SignInButton>

          <Button variant="gold" asChild>
            <Link href="/sign-up">Get started →</Link>
          </Button>
        </Show>

        <Show when="signed-in">
          <UserButton />
        </Show>
      </div>
    </nav>
  );
}
