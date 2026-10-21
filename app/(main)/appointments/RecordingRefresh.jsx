"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function RecordingRefresh() {
  const router = useRouter();

  useEffect(() => {
    let lastRefresh = 0;
    const refreshWhenVisible = () => {
      if (document.visibilityState !== "visible") return;
      const now = Date.now();
      if (now - lastRefresh < 2000) return;
      lastRefresh = now;
      router.refresh();
    };

    window.addEventListener("focus", refreshWhenVisible);
    document.addEventListener("visibilitychange", refreshWhenVisible);
    return () => {
      window.removeEventListener("focus", refreshWhenVisible);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
    };
  }, [router]);

  return null;
}
