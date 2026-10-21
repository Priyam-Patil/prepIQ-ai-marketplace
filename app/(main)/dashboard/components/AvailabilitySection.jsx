
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import {
  createAvailabilityWindow,
  removeAvailabilityWindow,
} from "@/actions/dashboard";

function formatDate(date) {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(date));
}

export default function AvailabilitySection({ availability = [] }) {
  const router = useRouter();

  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [busy, setBusy] = useState(false);
  const [removingId, setRemovingId] = useState(null);

  async function addWindow(event) {
    event.preventDefault();

    if (!start || !end) {
      toast.error("Choose both start and end times.");
      return;
    }

    const startDate = new Date(start);
    const endDate = new Date(end);

    if (
      !Number.isFinite(startDate.getTime()) ||
      !Number.isFinite(endDate.getTime())
    ) {
      toast.error("Choose valid dates and times.");
      return;
    }

    setBusy(true);

    try {
      const result = await createAvailabilityWindow({
        startTime: startDate.toISOString(),
        endTime: endDate.toISOString(),
      });

      if (!result?.success) {
        toast.error(result?.error || "Could not add availability.");
        return;
      }

      toast.success("Availability added.");
      setStart("");
      setEnd("");
      router.refresh();
    } catch (error) {
      console.error("Add availability failed:", error);
      toast.error("Could not add availability. Try again.");
    } finally {
      setBusy(false);
    }
  }

  async function removeWindow(id) {
    setRemovingId(id);

    try {
      const result = await removeAvailabilityWindow(id);

      if (!result?.success) {
        toast.error(result?.error || "Could not remove availability.");
        return;
      }

      toast.success("Availability removed.");
      router.refresh();
    } catch (error) {
      console.error("Remove availability failed:", error);
      toast.error("Could not remove availability. Try again.");
    } finally {
      setRemovingId(null);
    }
  }

  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 sm:p-6">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-400">
        Schedule
      </p>

      <h2 className="mt-2 text-xl font-semibold">Availability</h2>

      <form
        onSubmit={addWindow}
        className="mt-5 grid gap-3 sm:grid-cols-2"
      >
        <label className="text-xs text-gray-400">
          Starts
          <input
            required
            type="datetime-local"
            value={start}
            onChange={(event) => setStart(event.target.value)}
            className="mt-1 block w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2.5 text-sm text-white"
          />
        </label>

        <label className="text-xs text-gray-400">
          Ends
          <input
            required
            type="datetime-local"
            value={end}
            onChange={(event) => setEnd(event.target.value)}
            className="mt-1 block w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2.5 text-sm text-white"
          />
        </label>

        <button
          type="submit"
          disabled={busy}
          className="rounded-lg bg-amber-400 px-4 py-2.5 text-sm font-semibold text-black disabled:opacity-50 sm:col-span-2"
        >
          {busy ? "Saving…" : "Add availability"}
        </button>
      </form>

      <ul className="mt-5 divide-y divide-white/10">
        {availability.map((window) => (
          <li
            key={window.id}
            className="flex flex-col justify-between gap-3 py-3 text-sm sm:flex-row sm:items-center"
          >
            <span className="text-gray-300">
              {formatDate(window.startTime)} – {formatDate(window.endTime)}
            </span>

            <button
              type="button"
              disabled={busy || removingId !== null}
              onClick={() => removeWindow(window.id)}
              className="text-left text-xs text-gray-500 hover:text-red-300 disabled:opacity-50 sm:text-right"
            >
              {removingId === window.id ? "Removing…" : "Remove"}
            </button>
          </li>
        ))}

        {availability.length === 0 && (
          <li className="py-3 text-sm text-gray-400">
            No upcoming availability set.
          </li>
        )}
      </ul>
    </section>
  );
}
