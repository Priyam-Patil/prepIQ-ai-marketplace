import Link from "next/link";

export default function EarningsSection({ user, earnedCredits, payouts }) {
  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 sm:p-6">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-400">Earnings</p>
      <h2 className="mt-2 text-xl font-semibold">Credit balance</h2>
      <div className="mt-5 grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-white/10 bg-black/20 p-4"><p className="text-xs text-gray-500">Available</p><p className="mt-1 text-2xl font-semibold text-amber-300">{user.creditBalance}</p></div>
        <div className="rounded-xl border border-white/10 bg-black/20 p-4"><p className="text-xs text-gray-500">Earned to date</p><p className="mt-1 text-2xl font-semibold text-white">{earnedCredits}</p></div>
      </div>
      <div className="mt-5 flex items-center justify-between gap-3">
        <span className="text-sm text-gray-400">{payouts.length ? `${payouts.length} withdrawal request${payouts.length === 1 ? "" : "s"}` : "No withdrawal requests"}</span>
        <Link href="/payout/new" className="rounded-lg border border-amber-400/30 px-3 py-2 text-sm text-amber-300 hover:bg-amber-400/10">Payout details</Link>
      </div>
    </section>
  );
}
