"use client";

const COLORS: Record<string, string> = {
  active: "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400",
  completed: "bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400",
  cancelled: "bg-zinc-100 text-zinc-500 dark:bg-zinc-500/20 dark:text-zinc-400",
};

export function LoanStatusBadge({ status }: { status: string }) {
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${COLORS[status] ?? COLORS.active}`}>
      {status}
    </span>
  );
}
