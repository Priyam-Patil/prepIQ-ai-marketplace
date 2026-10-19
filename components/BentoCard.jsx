export default function BentoCard({ icon, title, desc, children, className = "" }) {
  return (
    <div className={`relative h-full overflow-hidden rounded-2xl border border-white/10 bg-[#0f0f11] p-9 transition duration-300 hover:border-amber-400/20 ${className}`}>
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-linear-to-br from-amber-400/5 via-transparent" />
      <span className="relative mb-5 flex h-11 w-11 items-center justify-center rounded-xl border border-amber-400/20 bg-amber-400/10 text-xl">{icon}</span>
      <h3 className="relative mb-2 font-serif text-xl tracking-tight">{title}</h3>
      <p className="relative text-sm leading-relaxed text-stone-400">{desc}</p>
      {children && <div className="relative">{children}</div>}
    </div>
  );
}
