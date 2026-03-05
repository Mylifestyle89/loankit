"use client";

import { useLanguage } from "@/components/language-provider";
import { fmtDisplay as fmt } from "@/lib/invoice-tracking-format-helpers";

type Props = {
  disbursementAmount: number;
  totalInvoice: number;
  diff: number;
  label: "surplus" | "deficit" | "balanced";
};

const STYLES: Record<string, string> = {
  balanced: "border-green-300 bg-green-50 text-green-800 dark:border-green-500/30 dark:bg-green-500/10 dark:text-green-400",
  surplus: "border-blue-300 bg-blue-50 text-blue-800 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-400",
  deficit: "border-red-300 bg-red-50 text-red-800 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-400",
};

export function SurplusDeficitBanner({ disbursementAmount, totalInvoice, diff, label }: Props) {
  const { t } = useLanguage();
  const labelText =
    label === "balanced" ? t("disbursements.balanced")
    : label === "surplus" ? t("disbursements.surplus")
    : t("disbursements.deficit");

  return (
    <div className={`flex items-center justify-between rounded-lg border px-4 py-3 text-sm font-medium ${STYLES[label]}`}>
      <span>{t("disbursements.amount")}: {fmt(disbursementAmount)} VND</span>
      <span>|</span>
      <span>{t("invoices.totalAmount")}: {fmt(totalInvoice)} VND</span>
      <span>|</span>
      <span>{labelText}: {fmt(Math.abs(diff))} VND</span>
    </div>
  );
}
