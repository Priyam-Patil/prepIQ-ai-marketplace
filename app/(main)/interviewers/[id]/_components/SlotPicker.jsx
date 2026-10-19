"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { toast } from "sonner";
import { createBooking, getOpenSlots } from "@/actions/booking";
import { generateDates, formatDateTab, formatTime } from "@/lib/helpers";
import { Button } from "@/components/ui/button";

export default function SlotPicker({ interviewer }) {
  const router = useRouter();
  const dates = useMemo(() => generateDates(14), []);
  const [date, setDate] = useState(dates[0]);
  const [slots, setSlots] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loadingSlots, setLoadingSlots] = useState(true);
  const [booking, setBooking] = useState(false);

  useEffect(() => {
    let active = true;
    const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const dayEnd = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1);
    getOpenSlots(interviewer.id, dayStart.toISOString(), dayEnd.toISOString())
      .then((result) => {
        if (!active) return;
        if (result.error) {
          setSlots([]);
          toast.error(result.error);
        } else {
          setSlots(result.slots);
        }
      })
      .catch(() => {
        if (active) toast.error("Could not load available times.");
      })
      .finally(() => active && setLoadingSlots(false));
    return () => { active = false; };
  }, [interviewer.id, date]);

  const submit = async () => {
    if (!selected) return;
    setBooking(true);
    try {
      const result = await createBooking({ interviewerId: interviewer.id, startTime: selected.startTime });
      if (!result.success) {
        toast.error(result.error || "Booking failed.");
        return;
      }
      toast.success("Session booked.");
      router.push(`/call/${result.booking.id}`);
      router.refresh();
    } catch {
      toast.error("Booking failed. Please try again.");
    } finally {
      setBooking(false);
    }
  };

  return (
    <div>
      <div className="flex gap-2 overflow-x-auto pb-2" aria-label="Choose a date">
        {dates.map((item) => {
          const labels = formatDateTab(item);
          const active = format(item, "yyyy-MM-dd") === format(date, "yyyy-MM-dd");
          return <button key={item.toISOString()} type="button" onClick={() => { setLoadingSlots(true); setSelected(null); setDate(item); }} aria-pressed={active} className={`min-w-16 rounded-xl border px-3 py-2 text-center ${active ? "border-amber-400/50 bg-amber-400/10 text-amber-300" : "border-white/10 text-gray-400 hover:border-white/20"}`}><span className="block text-xs">{labels.top}</span><span className="mt-1 block text-xs">{labels.bottom}</span></button>;
        })}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        {loadingSlots ? <p className="col-span-2 py-5 text-center text-sm text-gray-500">Loading available times…</p> : slots.length ? slots.map((slot) => {
          const active = selected?.startTime === slot.startTime;
          return <button key={slot.startTime} type="button" onClick={() => setSelected(slot)} aria-pressed={active} className={`rounded-lg border px-3 py-2.5 text-sm ${active ? "border-amber-400 bg-amber-400/10 text-amber-300" : "border-white/10 text-gray-300 hover:border-amber-400/40"}`}>{formatTime(slot.startTime)}</button>;
        }) : <p className="col-span-2 py-5 text-center text-sm text-gray-500">No open times on this date.</p>}
      </div>

      <Button variant="gold" size="hero" className="mt-5 w-full" disabled={!selected || booking || loadingSlots} onClick={submit}>
        {booking ? "Confirming…" : `Book for ${interviewer.creditRate} credit${interviewer.creditRate === 1 ? "" : "s"}`}
      </Button>
      <p className="mt-3 text-center text-xs text-gray-500">45-minute session · Credits are charged when the booking is confirmed.</p>
    </div>
  );
}
