"use client";

import { useLanguage } from "@/components/language-provider";

const COLORS: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-700 dark:bg-yellow-500/20 dark:text-yellow-400",
  paid: "bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400",
  overdue: "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400",
  needs_supplement: "bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-400",
};

export function InvoiceStatusBadge({ status }: { status: string }) {
  const { t } = useLanguage();
  const label = t(`invoices.status.${status}`) || status;
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${COLORS[status] ?? COLORS.pending}`}>
      {label}
    </span>
  );
}
