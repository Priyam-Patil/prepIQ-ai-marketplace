"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createAvailabilityWindow, removeAvailabilityWindow } from "@/actions/dashboard";

function formatDate(date) {
  return new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

export default function AvailabilitySection({ availability }) {
  const router = useRouter();
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [busy, setBusy] = useState(false);

  const addWindow = async (event) => {
    event.preventDefault();
    setBusy(true);
    try {
      const result = await createAvailabilityWindow({
        startTime: new Date(start).toISOString(),
        endTime: new Date(end).toISOString(),
      });
      if (!result.success) return toast.error(result.error);
      toast.success("Availability added.");
      setStart("");
      setEnd("");
      router.refresh();
    } catch {
      toast.error("Could not add availability. Check the selected times.");
    } finally {
      setBusy(false);
    }
  };

  const removeWindow = async (id) => {
    const result = await removeAvailabilityWindow(id);
    if (!result.success) return toast.error(result.error);
    toast.success("Availability removed.");
    router.refresh();
  };

  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 sm:p-6">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-400">Schedule</p>
      <h2 className="mt-2 text-xl font-semibold">Availability</h2>
      <form onSubmit={addWindow} className="mt-5 grid gap-3 sm:grid-cols-2">
        <label className="text-xs text-gray-400">Starts<input required type="datetime-local" value={start} onChange={(event) => setStart(event.target.value)} className="mt-1 block w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2.5 text-sm text-white" /></label>
        <label className="text-xs text-gray-400">Ends<input required type="datetime-local" value={end} onChange={(event) => setEnd(event.target.value)} className="mt-1 block w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2.5 text-sm text-white" /></label>
        <button disabled={busy} className="rounded-lg bg-amber-400 px-4 py-2.5 text-sm font-semibold text-black disabled:opacity-50 sm:col-span-2">{busy ? "Saving…" : "Add availability"}</button>
      </form>
      <ul className="mt-5 divide-y divide-white/10">
        {availability.map((window) => (
          <li key={window.id} className="flex items-center justify-between gap-3 py-3 text-sm">
            <span className="text-gray-300">{formatDate(window.startTime)} – {formatDate(window.endTime)}</span>
            <button type="button" onClick={() => removeWindow(window.id)} className="text-xs text-gray-500 hover:text-red-300">Remove</button>
          </li>
        ))}
        {!availability.length && <li className="py-3 text-sm text-gray-400">No upcoming availability set.</li>}
      </ul>
    </section>
  );
}
