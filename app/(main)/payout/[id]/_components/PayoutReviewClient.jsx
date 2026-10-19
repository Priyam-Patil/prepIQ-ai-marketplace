import Link from "next/link";

function formatDate(date) {
  return new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

export default function PayoutReviewClient({ data }) {
  if (data.payout) {
    const payout = data.payout;
    return (
      <main className="min-h-screen bg-[#090909] px-5 pb-20 pt-12 text-white sm:px-8">
        <section className="mx-auto max-w-3xl rounded-2xl border border-white/10 bg-white/[0.03] p-6 sm:p-9">
          <Link href="/payout/new" className="text-sm text-amber-400 hover:text-amber-300">← Payout history</Link>
          <p className="mt-8 text-xs font-semibold uppercase tracking-[0.2em] text-amber-400">Withdrawal request</p>
          <h1 className="mt-2 text-3xl font-bold">{payout.credits} credits</h1>
          <p className="mt-3 text-sm text-gray-400">Requested {formatDate(payout.createdAt)} · {payout.status.toLowerCase()}</p>
          <dl className="mt-7 grid gap-4 border-t border-white/10 pt-6 sm:grid-cols-2">
            <div><dt className="text-xs text-gray-500">Payment method</dt><dd className="mt-1 text-sm text-gray-200">{payout.paymentMethod}</dd></div>
            <div><dt className="text-xs text-gray-500">Net amount</dt><dd className="mt-1 text-sm text-gray-200">{payout.netAmount}</dd></div>
            <div><dt className="text-xs text-gray-500">Platform fee</dt><dd className="mt-1 text-sm text-gray-200">{payout.platformFee}</dd></div>
            {payout.adminNote && <div className="sm:col-span-2"><dt className="text-xs text-gray-500">Update</dt><dd className="mt-1 text-sm text-gray-200">{payout.adminNote}</dd></div>}
          </dl>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#090909] px-5 pb-20 pt-12 text-white sm:px-8">
      <div className="mx-auto max-w-4xl">
        <Link href="/dashboard" className="text-sm text-amber-400 hover:text-amber-300">← Interviewer dashboard</Link>
        <p className="mt-8 text-xs font-semibold uppercase tracking-[0.2em] text-amber-400">Earnings</p>
        <h1 className="mt-2 text-3xl font-bold">Payout requests</h1>
        <p className="mt-3 text-sm text-gray-400">Available balance: {data.balance} credits</p>
        <section className="mt-7 rounded-2xl border border-amber-400/20 bg-amber-400/[0.04] p-5 text-sm leading-6 text-gray-300">
          Withdrawal submission is not enabled yet. The database has request fields, but the project has no configured credit-to-currency rate, platform fee policy, or authorized payout processor. The app will not guess a cash amount or collect payment details until those rules are set.
        </section>
        <section className="mt-7 rounded-2xl border border-white/10 bg-white/[0.03] p-5 sm:p-6">
          <h2 className="text-lg font-semibold">Request history</h2>
          {data.payouts.length ? <ul className="mt-4 divide-y divide-white/10">{data.payouts.map((payout) => <li key={payout.id} className="flex flex-wrap items-center justify-between gap-3 py-4"><div><p className="font-medium">{payout.credits} credits · {payout.status.toLowerCase()}</p><p className="mt-1 text-xs text-gray-500">{formatDate(payout.createdAt)}</p></div><Link href={`/payout/${payout.id}`} className="text-sm text-amber-400 hover:text-amber-300">Details →</Link></li>)}</ul> : <p className="mt-4 text-sm text-gray-400">No payout requests yet.</p>}
        </section>
      </div>
    </main>
  );
}
