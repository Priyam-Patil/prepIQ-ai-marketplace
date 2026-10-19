import "server-only";

import { currentUser } from "@clerk/nextjs/server";
import { db } from "@/lib/prisma";

export async function getSignedInDbUser(select) {
  const clerkUser = await currentUser();
  if (!clerkUser?.id) return null;

  return db.user.findUnique({
    where: { clerkUserId: clerkUser.id },
    ...(select ? { select } : {}),
  });
}
