
import { getInterviewers } from "@/actions/explore";
import { connection } from "next/server";
import ExploreGrid from "./components/ExploreGrid";
import { Users } from "lucide-react";

export const instant = false;

export default async function ExplorePage() {
  await connection();
  const interviewers = await getInterviewers();

  return (
    <main className="min-h-screen bg-[#090909] px-5 pb-20 pt-12 text-white sm:px-8 lg:px-12">
      <div className="mx-auto max-w-7xl">
        {/* Page heading */}
        <section className="mb-10">
          <p className="mb-3 text-sm font-semibold uppercase tracking-[0.25em] text-amber-400">
            PrepIQ Marketplace
          </p>

          <h1 className="text-3xl font-bold tracking-tight sm:text-5xl">
            Find Your{" "}
            <span className="text-amber-400">Perfect</span> Interviewer
          </h1>

          <p className="mt-4 max-w-2xl text-sm leading-7 text-gray-400 sm:text-base">
            Practice with experienced interviewers, strengthen your skills,
            and prepare for your next technical interview.
          </p>

          <div className="mt-6 flex items-center gap-2 text-sm text-gray-400">
            <Users size={18} className="text-amber-400" />

            <span>
              {interviewers.length}{" "}
              {interviewers.length === 1
                ? "interviewer found"
                : "interviewers found"}
            </span>
          </div>
        </section>

        {/* Search, filters and interviewer cards */}
        <ExploreGrid interviewers={interviewers} />
      </div>
    </main>
  );
}
