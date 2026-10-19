import { connection } from "next/server";
import { notFound, redirect } from "next/navigation";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { getInterviewerProfile } from "@/actions/booking";
import { CATEGORY_LABEL } from "@/lib/data";
import SlotPicker from "./_components/SlotPicker";

export const instant = false;

export default async function InterviewerProfilePage({ params }) {
  await connection();
  const { id } = await params;
  const result = await getInterviewerProfile(id);
  if (result.error) redirect("/onboarding");
  const { interviewer } = result;
  if (!interviewer) notFound();

  return (
    <main className="min-h-screen bg-[#090909] px-5 pb-20 pt-12 text-white sm:px-8 lg:px-12">
      <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 sm:p-9">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
            <Avatar className="size-20 border border-amber-400/25">
              <AvatarImage src={interviewer.imageUrl || undefined} alt={interviewer.name || "Interviewer"} />
              <AvatarFallback className="bg-amber-400/10 text-2xl text-amber-300">{(interviewer.name || "I").slice(0, 1).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-amber-400">Interviewer profile</p>
              <h1 className="mt-2 text-3xl font-bold sm:text-4xl">{interviewer.name || "PrepIQ interviewer"}</h1>
              <p className="mt-2 text-gray-400">{[interviewer.title, interviewer.company].filter(Boolean).join(" · ")}</p>
              {interviewer.yearsExp != null && <p className="mt-1 text-sm text-gray-500">{interviewer.yearsExp}+ years of experience</p>}
            </div>
          </div>
          <div className="mt-8 flex flex-wrap gap-2">
            {interviewer.categories.map((category) => <Badge key={category} variant="outline" className="border-amber-400/20 text-amber-300">{CATEGORY_LABEL[category] || category}</Badge>)}
          </div>
          <div className="mt-8 border-t border-white/10 pt-7">
            <h2 className="text-lg font-semibold">About</h2>
            <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-gray-400">{interviewer.bio || "This interviewer has not added a profile summary yet."}</p>
          </div>
          <div className="mt-8 rounded-xl border border-white/10 bg-black/20 p-5">
            <h2 className="font-semibold">What to expect</h2>
            <p className="mt-2 text-sm leading-6 text-gray-400">A 45-minute practice session. Booking uses {interviewer.creditRate} credit{interviewer.creditRate === 1 ? "" : "s"}; your balance is checked before the session is confirmed.</p>
          </div>
        </section>

        <aside className="h-fit rounded-2xl border border-white/10 bg-white/[0.03] p-5 sm:p-6">
          <h2 className="text-xl font-semibold">Choose a time</h2>
          <p className="mt-2 text-sm text-gray-400">Available openings in the next two weeks.</p>
          <div className="mt-5"><SlotPicker interviewer={interviewer} /></div>
        </aside>
      </div>
    </main>
  );
}
