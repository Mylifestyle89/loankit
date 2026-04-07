/** Reusable coverage progress bar with color coding (green/yellow/red) */
export function CoverageProgressBar({
  filled,
  total,
  barWidth = "w-20",
  showLabel = true,
}: {
  filled: number;
  total: number;
  barWidth?: string;
  showLabel?: boolean;
}) {
  const percent = total > 0 ? Math.round((filled / total) * 100) : 0;
  const colorClass =
    percent >= 80 ? "bg-emerald-500" : percent >= 50 ? "bg-brand-500" : "bg-red-500";
  const textClass =
    percent >= 80
      ? "text-emerald-600 dark:text-emerald-400"
      : percent >= 50
        ? "text-brand-500 dark:text-brand-400"
        : "text-red-600 dark:text-red-400";

  return (
    <div className="flex items-center gap-2">
      <div className={`h-1.5 ${barWidth} rounded-full bg-zinc-200 dark:bg-white/10 overflow-hidden`}>
        <div
          className={`h-full rounded-full transition-all duration-300 ${colorClass}`}
          style={{ width: `${percent}%` }}
        />
      </div>
      {showLabel && (
        <span className={`text-[11px] font-semibold ${textClass}`}>
          {filled}/{total} ({percent}%)
        </span>
      )}
    </div>
  );
}
