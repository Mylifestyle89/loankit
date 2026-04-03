// StepDots: visual progress indicator for the 4-step financial analysis wizard
export function StepDots({ step }: { step: number }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
        Bước {step}/4
      </span>
      <div className="flex gap-1.5">
        {[1, 2, 3, 4].map((s) => (
          <div
            key={s}
            className={`h-1.5 rounded-full transition-all duration-300 ${
              s === step
                ? "w-6 bg-emerald-500"
                : s < step
                ? "w-1.5 bg-emerald-300 dark:bg-emerald-400"
                : "w-1.5 bg-slate-200 dark:bg-white/[0.1]"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
