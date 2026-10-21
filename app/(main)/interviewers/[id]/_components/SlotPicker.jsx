
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { CalendarDays, CheckCircle2, Clock3, Coins } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import UpgradeModal from "@/components/UpgradeModal";
import { createBooking, getOpenSlots } from "@/actions/booking";
import { formatDateFull, formatDateTab, formatTime, generateDates } from "@/lib/helpers";

export default function SlotPicker({
  interviewer,
  interviewerCredits = interviewer.creditRate ?? 1,
  userCredits = 0,
}) {
  const router = useRouter();
  const dates = useMemo(() => generateDates(7), []);

  const [selectedDate, setSelectedDate] = useState(() => dates[0]);
  const [slots, setSlots] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [category, setCategory] = useState(interviewer.categories?.[0] || "");
  const [loadingSlots, setLoadingSlots] = useState(true);
  const [booking, setBooking] = useState(false);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [loadError, setLoadError] = useState("");

  const summaryRef = useRef(null);
  const canAfford = userCredits >= interviewerCredits;

  const creditLabel = `${interviewerCredits} ${
    interviewerCredits === 1 ? "credit" : "credits"
  }`;

  useEffect(() => {
    let active = true;

    async function loadSlots() {
      setLoadingSlots(true);
      setSlots([]);
      setSelectedSlot(null);
      setLoadError("");

      const dayStart = new Date(
        selectedDate.getFullYear(),
        selectedDate.getMonth(),
        selectedDate.getDate()
      );
      const dayEnd = new Date(
        selectedDate.getFullYear(),
        selectedDate.getMonth(),
        selectedDate.getDate() + 1
      );

      try {
        const result = await getOpenSlots(
          interviewer.id,
          dayStart.toISOString(),
          dayEnd.toISOString()
        );

        if (!active) return;

        if (result?.error) {
          setLoadError(result.error);
          setSlots([]);
        } else {
          setSlots(Array.isArray(result?.slots) ? result.slots : []);
        }
      } catch {
        if (active) {
          setLoadError("Could not load available times. Please try again.");
          setSlots([]);
        }
      } finally {
        if (active) setLoadingSlots(false);
      }
    }

    loadSlots();

    return () => {
      active = false;
    };
  }, [interviewer.id, selectedDate]);

  useEffect(() => {
    if (selectedSlot && summaryRef.current) {
      summaryRef.current.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
    }
  }, [selectedSlot]);

  function handleDateChange(nextDate) {
    setSelectedDate(nextDate);
    setSelectedSlot(null);
  }

  function handleSlotClick(slot) {
    if (!canAfford) {
      setUpgradeOpen(true);
      return;
    }

    setSelectedSlot((previous) =>
      previous?.startTime === slot.startTime ? null : slot
    );
  }

  async function handleConfirm() {
    if (!selectedSlot || booking || loadingSlots || !category) return;

    if (!canAfford) {
      setUpgradeOpen(true);
      return;
    }

    setBooking(true);

    try {
      const result = await createBooking({
        interviewerId: interviewer.id,
        startTime: selectedSlot.startTime,
        category,
      });

      if (!result?.success) {
        toast.error(result?.error || "Booking failed.");
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
  }

  return (
    <>
      <UpgradeModal
        open={upgradeOpen}
        onOpenChange={setUpgradeOpen}
        reason={`You need ${interviewerCredits} credits to book this session. Your current balance is ${userCredits}.`}
      />

      <div className="flex min-w-0 flex-col gap-4">
        <section className="flex min-w-0 flex-col gap-6 rounded-2xl border border-white/10 bg-[#0f0f11] p-5 sm:p-7">
          {/* Header */}
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="font-serif text-xl tracking-tight text-white">
                Book a session
              </h2>
              <p className="mt-1 text-xs font-light text-stone-500">
                Select a date and available time slot.
              </p>
            </div>

            <div className="shrink-0 text-right">
              <p className="text-xs text-stone-500">Cost</p>
              <p className="mt-1 flex items-center justify-end gap-1.5 font-serif text-xl text-amber-300">
                <Coins size={15} />
                {creditLabel}
              </p>
            </div>
          </div>

          {/* Availability */}
          <div className="flex items-center gap-2 text-xs" aria-live="polite">
            {loadingSlots ? (
              <>
                <span className="size-2 animate-pulse rounded-full bg-amber-400" />
                <span className="text-stone-400">Checking availability...</span>
              </>
            ) : slots.length > 0 ? (
              <>
                <CheckCircle2 size={15} className="text-green-400" />
                <span className="text-green-400">Available</span>
              </>
            ) : (
              <>
                <span className="size-2 rounded-full bg-stone-600" />
                <span className="text-stone-400">
                  No open slots on this date
                </span>
              </>
            )}
          </div>

          {/* Date tabs */}
          <div>
            <div className="mb-3 flex items-center gap-2 text-xs text-stone-500">
              <CalendarDays size={14} />
              Choose a date
            </div>

            <div
              className="flex min-w-0 gap-2 overflow-x-auto overscroll-x-contain px-1 pb-3"
              aria-label="Choose a date"
            >
              {dates.map((date) => {
                const label = formatDateTab(date);
                const active =
                  format(date, "yyyy-MM-dd") ===
                  format(selectedDate, "yyyy-MM-dd");

                return (
                  <button
                    key={format(date, "yyyy-MM-dd")}
                    type="button"
                    aria-pressed={active}
                    onClick={() => handleDateChange(date)}
                    className={[
                      "flex min-w-[88px] shrink-0 flex-col items-center",
                      "justify-center gap-1 rounded-xl border px-3 py-3",
                      "text-center transition-colors duration-200",
                      active
                        ? "border-amber-400/50 bg-amber-400/10 text-amber-300"
                        : "border-white/10 text-stone-400 hover:border-white/20 hover:text-white",
                    ].join(" ")}
                  >
                    <span className="whitespace-nowrap text-sm font-medium leading-5">
                      {label.top}
                    </span>
                    <span className="whitespace-nowrap text-xs leading-4 text-current/80">
                      {label.bottom}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <Separator className="bg-white/[0.06]" />

          {/* Time slots */}
          <div>
            <div className="mb-3 flex items-center gap-2 text-xs text-stone-500">
              <Clock3 size={14} />
              Available time slots
            </div>

            {loadingSlots ? (
              <p className="py-5 text-center text-sm text-stone-500">
                Loading available times...
              </p>
            ) : loadError ? (
              <p className="py-5 text-center text-sm text-red-400">
                {loadError}
              </p>
            ) : slots.length > 0 ? (
              <div className="grid grid-cols-2 gap-2">
                {slots.map((slot) => {
                  const active =
                    selectedSlot?.startTime === slot.startTime;

                  return (
                    <button
                      key={slot.startTime}
                      type="button"
                      aria-pressed={active}
                      onClick={() => handleSlotClick(slot)}
                      className={[
                        "min-w-0 rounded-xl border px-2 py-3 text-sm",
                        "transition-colors duration-200",
                        active
                          ? "border-amber-400/60 bg-amber-400/15 text-amber-300"
                          : "border-white/10 text-stone-300 hover:border-amber-400/40 hover:text-amber-300",
                      ].join(" ")}
                    >
                      {formatTime(slot.startTime)}
                    </button>
                  );
                })}
              </div>
            ) : (
              <p className="rounded-xl border border-dashed border-white/10 px-3 py-6 text-center text-sm text-stone-500">
                No open times on this date. Try another day.
              </p>
            )}
          </div>

          <p className="text-center text-xs leading-5 text-stone-500">
            45-minute session · Credits are charged when the booking is
            confirmed.
          </p>

          {interviewer.categories?.length > 0 && (
            <label className="block text-sm text-stone-300">
              Interview domain
              <select
                value={category}
                onChange={(event) => setCategory(event.target.value)}
                className="mt-2 w-full rounded-lg border border-white/10 bg-[#151515] px-3 py-2 text-sm text-white outline-none focus:border-amber-400"
              >
                {interviewer.categories.map((item) => (
                  <option key={item} value={item}>{item.replaceAll("_", " ")}</option>
                ))}
              </select>
            </label>
          )}
        </section>

        {/* Booking confirmation */}
        {selectedSlot && (
          <section
            ref={summaryRef}
            className="flex flex-col gap-4 rounded-2xl border border-amber-400/20 bg-[#0f0f11] p-5 sm:p-6"
          >
            <p className="text-xs font-semibold uppercase tracking-widest text-stone-500">
              Your booking
            </p>

            <div className="flex flex-col gap-3 text-xs">
              <div className="flex justify-between gap-3">
                <span className="text-stone-500">Date</span>
                <span className="text-right text-stone-300">
                  {formatDateFull(new Date(selectedSlot.startTime))}
                </span>
              </div>

              <div className="flex justify-between gap-3">
                <span className="text-stone-500">Time</span>
                <span className="text-right text-stone-300">
                  {formatTime(selectedSlot.startTime)}
                </span>
              </div>

              <div className="flex justify-between gap-3">
                <span className="text-stone-500">Duration</span>
                <span className="text-stone-300">45 minutes</span>
              </div>
            </div>

            <Separator className="bg-white/[0.08]" />

            <div className="flex justify-between items-center gap-3">
              <span className="text-xs text-stone-400">Credits charged</span>
              <span className="font-serif text-lg text-amber-300">
                −{creditLabel}
              </span>
            </div>

            <div className="flex justify-between gap-3 text-xs">
              <span className="text-stone-500">Balance after booking</span>
              <span className="text-stone-400">
                {userCredits - interviewerCredits} credits
              </span>
            </div>

            <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] px-3.5 py-3">
              <p className="text-xs font-light leading-relaxed text-stone-400">
                A video call room will be created after your booking is
                confirmed.
              </p>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                disabled={booking}
                onClick={() => setSelectedSlot(null)}
              >
                Change slot
              </Button>

              <Button
                variant="gold"
                size="sm"
                className="flex-1"
                disabled={booking || loadingSlots}
                onClick={handleConfirm}
              >
                {booking ? "Confirming..." : "Confirm booking"}
              </Button>
            </div>
          </section>
        )}
      </div>
    </>
  );
}
