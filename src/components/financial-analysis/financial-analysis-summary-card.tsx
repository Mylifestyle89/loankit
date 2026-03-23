// ─── SummaryCard sub-component ────────────────────────────────────────────────

export function SummaryCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="rounded-lg border border-slate-200 dark:border-white/[0.07] bg-slate-50 dark:bg-white/[0.04] px-3 py-2.5">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
        {label}
      </p>
      <p className="mt-0.5 text-base font-bold text-slate-800 dark:text-slate-100 tabular-nums">
        {value}
      </p>
      {sub && (
        <p className="text-[11px] text-slate-400 dark:text-slate-500">{sub}</p>
      )}
    </div>
  );
}
