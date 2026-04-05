/* Skeleton loading states for CustomerListView */

export function SkeletonTable() {
  return (
    <div className="rounded-xl border border-zinc-200 dark:border-white/[0.07] bg-white dark:bg-[#161616] overflow-hidden">
      <div className="p-4 space-y-3">
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="flex items-center gap-4 animate-pulse" style={{ animationDelay: `${i * 80}ms` }}>
            <div className="h-4 w-48 rounded bg-zinc-200 dark:bg-white/[0.08]" />
            <div className="h-4 w-20 rounded bg-zinc-100 dark:bg-white/[0.06]" />
            <div className="h-4 flex-1 rounded bg-zinc-100 dark:bg-white/[0.05]" />
            <div className="h-4 w-24 rounded bg-zinc-100 dark:bg-white/[0.05]" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function SkeletonCards() {
  return (
    <div className="grid gap-3">
      {[0, 1, 2].map((i) => (
        <div key={i} className="rounded-xl border border-zinc-200 dark:border-white/[0.07] bg-white dark:bg-[#161616] p-4 animate-pulse" style={{ animationDelay: `${i * 100}ms` }}>
          <div className="flex items-center gap-2.5">
            <div className="h-5 w-40 rounded bg-zinc-200 dark:bg-white/[0.08]" />
            <div className="h-5 w-16 rounded-full bg-amber-100 dark:bg-amber-500/10" />
          </div>
          <div className="mt-2 h-4 w-64 rounded bg-zinc-100 dark:bg-white/[0.05]" />
          <div className="mt-3 border-t border-zinc-100 dark:border-white/[0.05] pt-3 flex gap-2">
            <div className="h-7 w-20 rounded-lg bg-zinc-100 dark:bg-white/[0.06]" />
            <div className="h-7 w-16 rounded-lg bg-zinc-100 dark:bg-white/[0.06]" />
          </div>
        </div>
      ))}
    </div>
  );
}
