import { connection } from "next/server";
import { redirect } from "next/navigation";
import { getDashboardData } from "@/actions/dashboard";
import AppointmentsSection from "./components/AppointmentsSection";
import AvailabilitySection from "./components/AvailabilitySection";
import EarningsSection from "./components/EarningsSection";

export const instant = false;

export default async function DashboardPage() {
  await connection();
  const data = await getDashboardData();
  if (!data) redirect("/onboarding");

  return (
    <main className="min-h-screen bg-[#090909] px-5 pb-20 pt-12 text-white sm:px-8 lg:px-12">
      <div className="mx-auto max-w-6xl">
        <p className="mb-3 text-sm font-semibold uppercase tracking-[0.25em] text-amber-400">Interviewer workspace</p>
        <h1 className="text-3xl font-bold tracking-tight sm:text-5xl">Welcome{data.user.name ? `, ${data.user.name}` : " back"}</h1>
        <p className="mt-4 text-sm leading-7 text-gray-400 sm:text-base">Manage your upcoming sessions, availability, and earned credits.</p>

        <div className="mt-9 grid gap-5 lg:grid-cols-2">
          <EarningsSection user={data.user} earnedCredits={data.earnedCredits} payouts={data.payouts} />
          <AppointmentsSection appointments={data.appointments} />
          <div className="lg:col-span-2"><AvailabilitySection availability={data.availability} /></div>
        </div>
      </div>
    </main>
  );
}
