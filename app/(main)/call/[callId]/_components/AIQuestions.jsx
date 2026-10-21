"use client";

import { useMemo, useState, useTransition } from "react";
import { generateInterviewQuestions } from "@/actions/aiQuestions";

const LABELS = {
  FRONTEND: "Frontend",
  BACKEND: "Backend",
  FULLSTACK: "Full Stack",
  DSA: "Data Structures & Algorithms",
  SYSTEM_DESIGN: "System Design",
  BEHAVIORAL: "Behavioral",
  DEVOPS: "DevOps",
  MOBILE: "Mobile",
};

export default function AIQuestions({ categories = [] }) {
  const available = useMemo(
    () =>
      [...new Set(categories)]
        .filter((category) => Object.hasOwn(LABELS, category))
        .map((value) => ({ value, label: LABELS[value] })),
    [categories]
  );

  const [category, setCategory] = useState(
    available[0]?.value || "FRONTEND"
  );
  const [questions, setQuestions] = useState([]);
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  function generate() {
    setError("");

    startTransition(async () => {
      try {
        const result = await generateInterviewQuestions({ category });

        if (!result?.success) {
          throw new Error(
            result?.error || "Unable to generate questions."
          );
        }

        setQuestions(result.questions);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Unable to generate questions."
        );
      }
    });
  }

  const options = available.length
    ? available
    : [{ value: "FRONTEND", label: "Frontend" }];

  return (
    <aside className="h-fit rounded-2xl border border-white/10 bg-white/[0.03] p-5">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-400">
        Interview prep
      </p>

      <h2 className="mt-3 text-lg font-semibold">
        AI interview questions
      </h2>

      <p className="mt-2 text-sm leading-6 text-gray-400">
        Generate six practice questions with sample answers.
      </p>

      <label
        htmlFor="ai-question-category"
        className="mt-4 block text-sm text-gray-300"
      >
        Topic
      </label>

      <select
        id="ai-question-category"
        value={category}
        onChange={(event) => setCategory(event.target.value)}
        className="mt-2 w-full rounded-lg border border-white/10 bg-[#151515] px-3 py-2 text-sm text-white outline-none focus:border-amber-400"
      >
        {options.map((item) => (
          <option key={item.value} value={item.value}>
            {item.label}
          </option>
        ))}
      </select>

      <button
        type="button"
        onClick={generate}
        disabled={isPending}
        className="mt-3 w-full rounded-lg bg-amber-400 px-4 py-2.5 text-sm font-semibold text-black transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isPending ? "Generating..." : "Generate questions"}
      </button>

      {error && (
        <p role="alert" className="mt-3 text-sm text-red-300">
          {error}
        </p>
      )}

      {questions.length > 0 && (
        <div className="mt-5 space-y-4">
          {questions.map((item, index) => (
            <details
              key={`${index}-${item.question}`}
              className="rounded-lg border border-white/10 p-3"
            >
              <summary className="cursor-pointer text-sm font-medium text-white">
                {index + 1}. {item.question}
              </summary>

              <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-gray-400">
                {item.answer}
              </p>
            </details>
          ))}
        </div>
      )}
    </aside>
  );
}
