
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { approvePayout } from "@/actions/payout";
import useFetch from "@/hooks/use-fetch";
import { isPayoutApproved } from "@/lib/payout-status.mjs";

function formatMoney(value) {
  const amount = Number(value);

  return Number.isFinite(amount)
    ? new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
      }).format(amount)
    : "Unavailable";
}

export default function PayoutReviewClient({ payout }) {
  const router = useRouter();

  const {
    data,
    loading,
    error,
    fn: approveFn,
  } = useFetch(approvePayout);

  const [confirmed, setConfirmed] = useState(false);

  async function handleApprove() {
    if (loading || confirmed) return;

    const accepted = window.confirm(
      `Approve payout of ${formatMoney(payout.netAmount)}?`
    );

    if (!accepted) return;

    try {
      const result = await approveFn({ payoutId: payout.id });

      if (result?.success) {
        setConfirmed(true);
        toast.success("Payout approval completed.");
        router.refresh();
      } else {
        toast.error(result?.error || "Could not approve payout.");
      }
    } catch {
      toast.error("Payout approval failed. Please try again.");
    }
  }

  const alreadyProcessed = isPayoutApproved(payout.status);

  if (alreadyProcessed || confirmed) {
    return (
      <section className="rounded-2xl border border-white/10 bg-[#0f0f11] p-8 text-center">
        <div className="text-3xl">✓</div>
        <h2 className="mt-3 text-xl font-semibold">
          Payout approved
        </h2>
        <p className="mt-2 text-sm text-stone-400">
          Approval is recorded. The actual transfer has not been verified.
        </p>
      </section>
    );
  }

  return (
    <section className="flex flex-col gap-5 rounded-2xl border border-white/10 bg-[#0f0f11] p-6 sm:p-8">
      <div className="rounded-xl border border-white/10 bg-[#141417] p-4">
        <Detail label="Interviewer" value={payout.interviewerName} />
        <Detail label="Email" value={payout.interviewerEmail} />
        <Detail label="Credits" value={payout.credits} />

        <Detail
          label="Platform fee"
          value={formatMoney(payout.platformFee)}
        />

        <Separator className="my-3 bg-white/10" />

        <Detail
          label="Net payout"
          value={formatMoney(payout.netAmount)}
          highlight
        />

        <Detail
          label="Payment method"
          value={payout.paymentMethod}
        />

        <Detail
          label="Payment details"
          value={payout.paymentDetail}
        />

        <Detail label="Status" value={payout.status} />
      </div>

      <p className="text-xs leading-5 text-stone-400">
        Confirm the payout details before approving. Approval records
        the decision only; it does not send or verify a transfer.
      </p>

      {error && (
        <p role="alert" className="text-sm text-red-400">
          {error?.message || String(error)}
        </p>
      )}

      <Button
        variant="gold"
        disabled={loading || confirmed}
        onClick={handleApprove}
        className="w-full"
      >
        {loading ? "Saving approval…" : "Approve payout request"}
      </Button>
    </section>
  );
}

function Detail({ label, value, highlight = false }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2 text-sm">
      <span className="shrink-0 text-stone-500">{label}</span>
      <span
        className={
          highlight
            ? "break-words text-right font-semibold text-amber-400"
            : "break-words text-right text-stone-200"
        }
      >
        {value ?? "Not available"}
      </span>
    </div>
  );
}
