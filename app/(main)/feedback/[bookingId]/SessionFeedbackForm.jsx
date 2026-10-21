"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { submitSessionFeedback } from "@/actions/sessionFeedback";

export default function SessionFeedbackForm({ bookingId }) {
  const router = useRouter();
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  function submit(event) {
    event.preventDefault();
    setError("");
    startTransition(async () => {
      try {
        const result = await submitSessionFeedback({ bookingId, rating, comment });
        if (!result?.success) {
          setError(result?.error || "Feedback could not be saved.");
          return;
        }
        router.refresh();
      } catch {
        setError("Feedback could not be saved. Please try again.");
      }
    });
  }

  return (
    <form onSubmit={submit} className="mt-6 space-y-5">
      <label className="block text-sm text-gray-200">Session rating
        <select value={rating} onChange={(event) => setRating(Number(event.target.value))} className="mt-2 w-full rounded-lg border border-white/10 bg-[#151515] px-3 py-2.5 text-white focus:border-amber-400 focus:outline-none">
          {[5, 4, 3, 2, 1].map((value) => <option key={value} value={value}>{value} / 5</option>)}
        </select>
      </label>
      <label className="block text-sm text-gray-200">Comment (optional)
        <textarea value={comment} onChange={(event) => setComment(event.target.value)} maxLength={2000} rows={4} className="mt-2 w-full rounded-lg border border-white/10 bg-[#151515] px-3 py-2.5 text-white focus:border-amber-400 focus:outline-none" />
      </label>
      {error && <p role="alert" className="text-sm text-red-300">{error}</p>}
      <button disabled={pending} className="w-full rounded-lg bg-amber-400 px-4 py-3 text-sm font-semibold text-black hover:bg-amber-300 disabled:opacity-50">{pending ? "Saving…" : "Submit feedback"}</button>
    </form>
  );
}
