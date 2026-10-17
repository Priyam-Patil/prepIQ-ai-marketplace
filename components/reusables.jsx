
export const GrayTitle = ({ children }) => (
  <span className="bg-linear-to-br from-stone-100 via-stone-300 to-stone-500 bg-clip-text text-transparent">
    {children}
  </span>
);

export const GoldTitle = ({ children }) => (
  <span className="bg-linear-to-br from-amber-300 via-amber-400 to-amber-600 bg-clip-text text-transparent">
    {children}
  </span>
);

export const SectionLabel = ({ children }) => (
  <p className="mb-4 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-amber-400">
    <span className="h-px w-4 bg-amber-400" />
    {children}
  </p>
);

export const SectionHeading = ({ gray, gold }) => (
  <h2 className="font-serif text-[clamp(2rem,4vw,3rem)] leading-[1.1] tracking-[-0.025em]">
    <GrayTitle>{gray}</GrayTitle>
    <br />
    <GoldTitle>{gold}</GoldTitle>
  </h2>
);

export default function PageHeader({
  label,
  gray,
  gold,
  description,
  right,
}) {
  return (
    <div className="border-b border-white/8 px-8 py-10">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
        <div>
          {label && <SectionLabel>{label}</SectionLabel>}

          <h1 className="mt-1 font-serif text-5xl tracking-tight">
            {gray && <GrayTitle>{gray} </GrayTitle>}
            {gold && <GoldTitle>{gold}</GoldTitle>}
          </h1>

          {description && (
            <p className="mt-2 text-sm font-light text-stone-500">
              {description}
            </p>
          )}
        </div>

        {right && <div className="shrink-0">{right}</div>}
      </div>
    </div>
  );
}
