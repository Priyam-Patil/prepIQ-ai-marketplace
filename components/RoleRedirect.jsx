"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

export default function RoleRedirect({
  role,
  isSignedIn,
}) {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isSignedIn || !role || !pathname) {
      return;
    }

    if (role === "UNASSIGNED") {
      if (pathname !== "/onboarding") {
        router.replace("/onboarding");
      }
      return;
    }

    if (
      role === "INTERVIEWER" &&
      (
        pathname === "/explore" ||
        pathname.startsWith("/explore/") ||
        pathname === "/onboarding" ||
        pathname.startsWith("/onboarding/")
      )
    ) {
      router.replace("/dashboard");
      return;
    }

    if (
      role === "INTERVIEWEE" &&
      (
        pathname === "/dashboard" ||
        pathname.startsWith("/dashboard/") ||
        pathname === "/onboarding" ||
        pathname.startsWith("/onboarding/")
      )
    ) {
      router.replace("/explore");
    }
  }, [role, isSignedIn, pathname, router]);

  return null;
}
