"use client";

import { useLanguage } from "@/components/language-provider";

const STYLES: Record<string, { bg: string; dot: string }> = {
  active: {
    bg: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 ring-1 ring-emerald-500/20",
    dot: "bg-emerald-500",
  },
  completed: {
    bg: "bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-400 ring-1 ring-sky-500/20",
    dot: "bg-sky-500",
  },
  cancelled: {
    bg: "bg-zinc-50 text-zinc-500 dark:bg-zinc-500/10 dark:text-zinc-400 ring-1 ring-zinc-500/20",
    dot: "bg-zinc-400",
  },
};

export function LoanStatusBadge({ status }: { status: string }) {
  const { t } = useLanguage();
  const style = STYLES[status] ?? STYLES.active;
  const label = t(`loans.status.${status}`) || status;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${style.bg}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${style.dot}`} />
      {label}
    </span>
  );
}
