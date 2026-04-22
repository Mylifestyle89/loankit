"use client";

import { useLanguage } from "@/components/language-provider";

const COLORS: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-700 dark:bg-yellow-500/20 dark:text-yellow-400",
  overdue: "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400",
  needs_supplement: "bg-brand-100 text-brand-600 dark:bg-brand-500/20 dark:text-brand-400",
  has_invoice: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400",
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
