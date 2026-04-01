export default function InvoicesLoading() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="h-10 w-48 rounded-lg bg-zinc-100 dark:bg-white/[0.05]" />
      <div className="h-8 w-full rounded-lg bg-zinc-100 dark:bg-white/[0.05]" />
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-14 rounded-lg bg-zinc-50 dark:bg-white/[0.03]" />
        ))}
      </div>
    </div>
  );
}
