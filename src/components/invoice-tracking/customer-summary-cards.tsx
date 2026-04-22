"use client";

import { Settings } from "lucide-react";
import { fmtDisplay as fmt } from "@/lib/invoice-tracking-format-helpers";

type CustomerSummary = {
  customerId: string;
  customerName: string;
  customerEmail?: string | null;
  totalInvoices: number;
  totalAmount: number;
  pendingCount: number;
  overdueCount: number;
  needsSupplementCount?: number;
};

type Props = {
  customers: CustomerSummary[];
  selectedCustomerId: string;
  onSelectCustomer: (id: string) => void;
  onOpenEmailSettings: () => void;
};

export function CustomerSummaryCards({
  customers,
  selectedCustomerId,
  onSelectCustomer,
  onOpenEmailSettings,
}: Props) {
  const totalOverdue = customers.reduce((s, c) => s + c.overdueCount, 0);

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-zinc-500 dark:text-slate-400">
          Lọc theo khách hàng
        </span>
        <button
          type="button"
          onClick={onOpenEmailSettings}
          className="cursor-pointer flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs text-zinc-500 dark:text-slate-400 hover:bg-zinc-100 dark:hover:bg-white/[0.06] hover:text-zinc-700 dark:hover:text-slate-300 transition-colors"
        >
          <Settings className="h-3.5 w-3.5" />
          Email thông báo
        </button>
      </div>

      {/* Chip row — horizontally scrollable */}
      <div className="flex flex-wrap gap-2">
        {/* "Tất cả" chip */}
        <button
          type="button"
          onClick={() => onSelectCustomer("")}
          className={`cursor-pointer flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
            !selectedCustomerId
              ? "border-brand-400 bg-brand-50 text-brand-700 dark:border-brand-500/60 dark:bg-brand-500/10 dark:text-brand-300"
              : "border-zinc-200 dark:border-white/[0.08] text-zinc-600 dark:text-slate-400 hover:border-zinc-300 dark:hover:border-white/20 hover:bg-zinc-50 dark:hover:bg-white/[0.04]"
          }`}
        >
          Tất cả
          {totalOverdue > 0 && !selectedCustomerId && (
            <span className="rounded-full bg-red-100 dark:bg-red-500/20 px-1.5 py-0.5 text-[10px] font-semibold text-red-600 dark:text-red-400">
              {totalOverdue}⚠
            </span>
          )}
        </button>

        {customers.map((c) => {
          const isSelected = selectedCustomerId === c.customerId;
          return (
            <button
              key={c.customerId}
              type="button"
              onClick={() => onSelectCustomer(isSelected ? "" : c.customerId)}
              title={`${c.totalInvoices} HĐ · ${fmt(c.totalAmount)} VND`}
              className={`cursor-pointer flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                isSelected
                  ? "border-brand-400 bg-brand-50 text-brand-700 dark:border-brand-500/60 dark:bg-brand-500/10 dark:text-brand-300"
                  : "border-zinc-200 dark:border-white/[0.08] text-zinc-600 dark:text-slate-400 hover:border-zinc-300 dark:hover:border-white/20 hover:bg-zinc-50 dark:hover:bg-white/[0.04]"
              }`}
            >
              <span className="max-w-[160px] truncate">{c.customerName}</span>
              {c.overdueCount > 0 && (
                <span className="rounded-full bg-red-100 dark:bg-red-500/20 px-1.5 py-0.5 text-[10px] font-semibold text-red-600 dark:text-red-400">
                  {c.overdueCount}⚠
                </span>
              )}
              {c.pendingCount > 0 && !c.overdueCount && (
                <span className="rounded-full bg-zinc-100 dark:bg-white/[0.06] px-1.5 py-0.5 text-[10px] text-zinc-500 dark:text-slate-400">
                  {c.pendingCount}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
