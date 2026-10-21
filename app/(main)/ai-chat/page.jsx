import { auth } from "@clerk/nextjs/server";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import AIChat from "./AIChat";

export const instant = false;

export default async function AIChatPage() {
  await connection();
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  return (
    <main className="min-h-screen bg-[#090909] px-4 pb-16 pt-10 text-white sm:px-8 sm:pt-14">
      <div className="mx-auto max-w-3xl">
        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.25em] text-amber-400">Interview preparation</p>
        <h1 className="font-serif text-4xl tracking-tight sm:text-5xl">Practice with <span className="text-amber-400">PrepIQ AI</span></h1>
        <p className="mb-8 mt-3 max-w-xl text-sm leading-6 text-gray-400">Keep a private conversation for each interview domain. Follow up, ask for examples, and prepare before your session.</p>
        <AIChat />
      </div>
    </main>
  );
}
