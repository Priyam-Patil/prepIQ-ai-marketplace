"use client";

import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { CATEGORIES } from "@/lib/data";
import InterviewerCard from "./InterviewerCard";

export default function ExploreGrid({ interviewers = [] }) {
  const [activeCategory, setActiveCategory] = useState(null);
  const [search, setSearch] = useState("");

  const filteredInterviewers = useMemo(() => {
    const query = search.trim().toLowerCase();

    return interviewers.filter((interviewer) => {
      const matchesCategory =
        activeCategory === null ||
        interviewer.categories?.includes(activeCategory);

      const matchesSearch =
        !query ||
        interviewer.name?.toLowerCase().includes(query) ||
        interviewer.title?.toLowerCase().includes(query) ||
        interviewer.company?.toLowerCase().includes(query) ||
        interviewer.bio?.toLowerCase().includes(query) ||
        interviewer.categories?.some((category) =>
          category.toLowerCase().replaceAll("_", " ").includes(query),
        );

      return matchesCategory && matchesSearch;
    });
  }, [interviewers, activeCategory, search]);

  return (
    <div className="flex flex-col gap-8">
      {/* Search and filters */}
      <div className="flex flex-col gap-4">
        <div className="relative max-w-sm">
          <Search
            size={16}
            aria-hidden="true"
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-500"
          />

          <Input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by name, title or company..."
            aria-label="Search interviewers"
            className="border-white/10 bg-[#0f0f11] pl-10 text-sm text-stone-100 placeholder:text-stone-600"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((category) => {
            const isActive = activeCategory === category.value;

            return (
              <button
                key={category.value}
                type="button"
                onClick={() => setActiveCategory(category.value)}
                aria-pressed={isActive}
                className={`cursor-pointer rounded-lg border px-4 py-2 text-xs transition-colors ${
                  isActive
                    ? "border-amber-400/40 bg-amber-400/10 text-amber-400"
                    : "border-white/10 text-stone-500 hover:border-white/20 hover:text-stone-300"
                }`}
              >
                {category.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Result count */}
      <p className="text-xs text-stone-500" aria-live="polite">
        {filteredInterviewers.length === 0
          ? "No interviewers found"
          : `${filteredInterviewers.length} interviewer${
              filteredInterviewers.length === 1 ? "" : "s"
            } found`}
      </p>

      {/* Interviewer cards */}
      {filteredInterviewers.length === 0 ? (
        <div className="py-16 text-center">
          <p className="text-sm text-stone-400">
            {interviewers.length === 0
              ? "No interviewer profiles are available yet."
              : "No interviewers match your search or selected category."}
          </p>

          {(search || activeCategory !== null) && (
            <button
              type="button"
              onClick={() => {
                setSearch("");
                setActiveCategory(null);
              }}
              className="mt-3 cursor-pointer text-xs text-amber-400 transition-colors hover:text-amber-300"
            >
              Clear filters
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredInterviewers.map((interviewer) => (
            <InterviewerCard key={interviewer.id} interviewer={interviewer} />
          ))}
        </div>
      )}
    </div>
  );
}
