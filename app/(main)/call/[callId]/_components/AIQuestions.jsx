export default function AIQuestions() {
  return (
    <aside className="h-fit rounded-2xl border border-white/10 bg-white/[0.03] p-5">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-400">Interview prep</p>
      <h2 className="mt-3 text-lg font-semibold">AI questions unavailable</h2>
      <p className="mt-2 text-sm leading-6 text-gray-400">
        No AI provider or API key is configured for this project, so questions cannot be generated for this session.
      </p>
    </aside>
  );
}
