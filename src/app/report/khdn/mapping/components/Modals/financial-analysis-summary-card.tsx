// SummaryCard: compact stat card shown in step 2 data preview grid
export function SummaryCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-slate-200/60 dark:border-white/[0.08] bg-slate-50/50 dark:bg-white/[0.04] px-3 py-2">
      <div className="text-[10px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
        {label}
      </div>
      <div className="mt-0.5 text-lg font-semibold text-slate-900 dark:text-slate-100">
        {value}
      </div>
    </div>
  );
}
