import { auth, currentUser } from "@clerk/nextjs/server";
import { connection } from "next/server";
import { checkUser } from "@/lib/checkUser";
import HeaderClient from "@/components/HeaderClient";
import RoleRedirect from "@/components/RoleRedirect";
import { getSafeErrorDetails } from "@/lib/safe-error.mjs";
import { db } from "@/lib/prisma";

export default async function HeaderRole() {
  await connection();
  let userId = null;
  let clerkUser = null;
  let user = null;

  try {
    const authState = await auth();
    userId = authState.userId;

    if (userId) {
      try {
        clerkUser = await currentUser();

        if (clerkUser) {
          user = await checkUser(clerkUser);
        }
      } catch (error) {
        console.error(
          "HeaderRole Clerk profile lookup failed.",
          getSafeErrorDetails(error),
        );
      }

      // A valid Clerk session is enough to safely look up this user's existing
      // local role. This keeps role-based navigation available during a Clerk
      // Backend API outage without assigning or elevating a role.
      if (!user) {
        try {
          user = await db.user.findUnique({
            where: { clerkUserId: userId },
          });
        } catch (error) {
          console.error(
            "HeaderRole local user lookup failed.",
            getSafeErrorDetails(error),
          );
        }
      }
    }
  } catch (error) {
    console.error("HeaderRole initialization failed.", getSafeErrorDetails(error));
  }

  const role = user?.role ?? null;
  const isSignedIn = Boolean(userId);

  return (
    <>
      <RoleRedirect
        role={role}
        isSignedIn={isSignedIn}
      />

      <HeaderClient
        role={role ?? "UNASSIGNED"}
        user={user}
      />
    </>
  );
}
