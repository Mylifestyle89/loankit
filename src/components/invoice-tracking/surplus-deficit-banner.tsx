"use client";

import { Banknote, FileCheck, AlertTriangle } from "lucide-react";
import { fmtDisplay as fmt } from "@/lib/invoice-tracking-format-helpers";

type Props = {
  disbursementAmount: number;
  totalInvoice: number;
  diff: number;
  label: "surplus" | "deficit" | "balanced";
};

export function SurplusDeficitBanner({ disbursementAmount, totalInvoice, diff }: Props) {
  const remaining = Math.abs(diff);
  const isFullyCovered = totalInvoice >= disbursementAmount;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      {/* Số tiền giải ngân */}
      <div className="rounded-xl border border-brand-200 dark:border-brand-500/20 bg-brand-50/50 dark:bg-brand-500/5 p-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-100 dark:bg-brand-500/15">
            <Banknote className="h-4.5 w-4.5 text-brand-500 dark:text-brand-400" />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-zinc-500 dark:text-slate-400">Số tiền giải ngân</p>
            <p className="text-sm font-bold tabular-nums text-brand-600 dark:text-brand-300 truncate">{fmt(disbursementAmount)} <span className="text-xs font-medium">VND</span></p>
          </div>
        </div>
      </div>

      {/* Giá trị hóa đơn đã bổ sung */}
      <div className={`rounded-xl border p-4 ${
        isFullyCovered
          ? "border-emerald-200 dark:border-emerald-500/20 bg-emerald-50/50 dark:bg-emerald-500/5"
          : "border-brand-200 dark:border-brand-500/20 bg-brand-50/50 dark:bg-brand-500/5"
      }`}>
        <div className="flex items-center gap-2.5">
          <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
            isFullyCovered
              ? "bg-emerald-100 dark:bg-emerald-500/15"
              : "bg-brand-100 dark:bg-brand-500/15"
          }`}>
            <FileCheck className={`h-4.5 w-4.5 ${
              isFullyCovered
                ? "text-emerald-600 dark:text-emerald-400"
                : "text-brand-500 dark:text-brand-400"
            }`} />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-zinc-500 dark:text-slate-400">Giá trị HĐ đã bổ sung</p>
            <p className={`text-sm font-bold tabular-nums truncate ${
              isFullyCovered
                ? "text-emerald-700 dark:text-emerald-300"
                : "text-brand-600 dark:text-brand-300"
            }`}>{fmt(totalInvoice)} <span className="text-xs font-medium">VND</span></p>
          </div>
        </div>
      </div>

      {/* Giá trị hóa đơn còn thiếu */}
      <div className={`rounded-xl border p-4 ${
        remaining === 0
          ? "border-emerald-200 dark:border-emerald-500/20 bg-emerald-50/50 dark:bg-emerald-500/5"
          : "border-red-200 dark:border-red-500/20 bg-red-50/50 dark:bg-red-500/5"
      }`}>
        <div className="flex items-center gap-2.5">
          <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
            remaining === 0
              ? "bg-emerald-100 dark:bg-emerald-500/15"
              : "bg-red-100 dark:bg-red-500/15"
          }`}>
            <AlertTriangle className={`h-4.5 w-4.5 ${
              remaining === 0
                ? "text-emerald-600 dark:text-emerald-400"
                : "text-red-600 dark:text-red-400"
            }`} />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-zinc-500 dark:text-slate-400">Giá trị HĐ còn thiếu</p>
            <p className={`text-sm font-bold tabular-nums truncate ${
              remaining === 0
                ? "text-emerald-700 dark:text-emerald-300"
                : "text-red-700 dark:text-red-300"
            }`}>{remaining === 0 ? "Đã đủ" : `${fmt(remaining)}`} <span className="text-xs font-medium">{remaining > 0 ? "VND" : ""}</span></p>
          </div>
        </div>
      </div>
    </div>
  );
}
