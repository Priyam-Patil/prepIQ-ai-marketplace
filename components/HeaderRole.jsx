import { auth, currentUser } from "@clerk/nextjs/server";
import { connection } from "next/server";
import { checkUser } from "@/lib/checkUser";
import HeaderClient from "@/components/HeaderClient";
import RoleRedirect from "@/components/RoleRedirect";

export default async function HeaderRole() {
  await connection();
  let userId = null;
  let clerkUser = null;
  let user = null;

  try {
    const authState = await auth();
    userId = authState.userId;

    if (userId) {
      clerkUser = await currentUser();

      if (clerkUser) {
        user = await checkUser(clerkUser, authState.has);
      }
    }
  } catch (error) {
    console.error(
      "HeaderRole error:",
      error instanceof Error ? error.message : error
    );
  }

  const role = user?.role ?? null;
  const isSignedIn = Boolean(userId && clerkUser);

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
