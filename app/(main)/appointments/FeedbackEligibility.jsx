"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function FeedbackEligibility({ bookingId, endTime, serverNow, submitted, cancelled }) {
  const router = useRouter();
  const [eligible, setEligible] = useState(() => new Date(endTime).getTime() <= new Date(serverNow).getTime());

  useEffect(() => {
    if (eligible || cancelled) return undefined;
    const serverTime = new Date(serverNow).getTime();
    const offset = serverTime - Date.now();
    const remaining = new Date(endTime).getTime() - (Date.now() + offset);
    if (remaining <= 0) {
      const timer = setTimeout(() => {
      setEligible(true);
      router.refresh();
      }, 0);
      return () => clearTimeout(timer);
    }
    const timer = setTimeout(() => {
      setEligible(true);
      router.refresh();
    }, Math.min(remaining + 25, 2_147_000_000));
    return () => clearTimeout(timer);
  }, [cancelled, eligible, endTime, router, serverNow]);

  if (cancelled || (!submitted && !eligible)) return null;
  if (submitted) return <span className="inline-flex items-center rounded-lg border border-emerald-400/20 bg-emerald-400/5 px-3 py-2 text-sm text-emerald-200">Feedback Submitted</span>;
  return <Link href={`/feedback/${encodeURIComponent(bookingId)}`} className="inline-flex items-center rounded-lg border border-amber-300/30 bg-amber-300/10 px-3 py-2 text-sm font-semibold text-amber-100 hover:bg-amber-300/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300">Give Feedback</Link>;
}
