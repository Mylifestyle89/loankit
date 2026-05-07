"use client";

/**
 * loan-disbursement-summary-cards.tsx
 *
 * Summary stat cards for the loan detail page (total disbursed, count, active, completed).
 */

import { Banknote, CheckCircle, Layers, Zap } from "lucide-react";
import { fmtDisplay as fmt } from "@/lib/invoice-tracking-format-helpers";
import { useLanguage } from "@/components/language-provider";

type DisbursementSummary = {
  totalDisbursed: number;
  disbursementCount: number;
  activeCount: number;
  completedCount: number;
};

type Props = { summary: DisbursementSummary };

export function LoanDisbursementSummaryCards({ summary }: Props) {
  const { t } = useLanguage();

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      <div className="flex items-center gap-3 rounded-xl border border-zinc-200 dark:border-white/[0.07] bg-white dark:bg-[#161616] p-3.5 shadow-sm">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-100 dark:bg-primary-500/15">
          <Banknote className="h-5 w-5 text-primary-500 dark:text-primary-400" />
        </div>
        <div>
          <p className="text-xs text-zinc-400 dark:text-slate-500">{t("disbursements.totalDisbursed") ?? "Tổng giải ngân"}</p>
          <p className="font-bold tabular-nums text-sm">{fmt(summary.totalDisbursed)}</p>
        </div>
      </div>
      <div className="flex items-center gap-3 rounded-xl border border-zinc-200 dark:border-white/[0.07] bg-white dark:bg-[#161616] p-3.5 shadow-sm">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-100 dark:bg-sky-500/15">
          <Layers className="h-5 w-5 text-sky-600 dark:text-sky-400" />
        </div>
        <div>
          <p className="text-xs text-zinc-400 dark:text-slate-500">{t("disbursements.count") ?? "Số lượng"}</p>
          <p className="font-bold tabular-nums text-sm">{summary.disbursementCount}</p>
        </div>
      </div>
      <div className="flex items-center gap-3 rounded-xl border border-zinc-200 dark:border-white/[0.07] bg-white dark:bg-[#161616] p-3.5 shadow-sm">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100 dark:bg-emerald-500/15">
          <Zap className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
        </div>
        <div>
          <p className="text-xs text-zinc-400 dark:text-slate-500">{t("disbursements.active") ?? "Đang hoạt động"}</p>
          <p className="font-bold tabular-nums text-sm">{summary.activeCount}</p>
        </div>
      </div>
      <div className="flex items-center gap-3 rounded-xl border border-zinc-200 dark:border-white/[0.07] bg-white dark:bg-[#161616] p-3.5 shadow-sm">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-100 dark:bg-primary-400/15">
          <CheckCircle className="h-5 w-5 text-primary-500 dark:text-primary-400" />
        </div>
        <div>
          <p className="text-xs text-zinc-400 dark:text-slate-500">{t("disbursements.completed") ?? "Đã hoàn thành"}</p>
          <p className="font-bold tabular-nums text-sm">{summary.completedCount}</p>
        </div>
      </div>
    </div>
  );
}
