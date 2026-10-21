"use server";

import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { db } from "@/lib/prisma";
import { getAppointmentsForUser } from "@/lib/appointments.mjs";
import { getSafeErrorDetails } from "@/lib/safe-error.mjs";

export async function getMyAppointments() {
  const serverNow = new Date().toISOString();
  let userId;

  try {
    ({ userId } = await auth());
  } catch (error) {
    console.error("Appointment authentication context unavailable.", getSafeErrorDetails(error));
    return { ok: false, serverNow };
  }

  if (!userId) {
    redirect("/sign-in");
  }

  try {
    const appointments = await getAppointmentsForUser(db, userId);
    return { ok: true, ...appointments, serverNow };
  } catch (error) {
    console.error("Appointment query failed.", getSafeErrorDetails(error));
    return { ok: false, serverNow };
  }
}
