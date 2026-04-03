"use client";

/**
 * invoice-filters-bar.tsx
 *
 * Filter controls for the invoices overview page:
 * status select, customer select, group-by toggle, bulk-action toolbar.
 */

import { CheckSquare, Layers } from "lucide-react";
import { useLanguage } from "@/components/language-provider";

import type { Customer } from "../types";
type Props = {
  statusFilter: string;
  onStatusFilterChange: (value: string) => void;
  customerFilter: string;
  onCustomerFilterChange: (value: string) => void;
  customers: Customer[];
  groupBy: "none" | "disbursement";
  onToggleGroupBy: () => void;
  selectedCount: number;
  bulkLoading: boolean;
  onBulkMarkPaid: () => void;
  onClearSelection: () => void;
};

export function InvoiceFiltersBar({
  statusFilter,
  onStatusFilterChange,
  customerFilter,
  onCustomerFilterChange,
  customers,
  groupBy,
  onToggleGroupBy,
  selectedCount,
  bulkLoading,
  onBulkMarkPaid,
  onClearSelection,
}: Props) {
  const { t } = useLanguage();

  return (
    <div className="space-y-3">
      {/* Filter controls */}
      <div className="flex items-center gap-3 flex-wrap">
        <select
          value={statusFilter}
          onChange={(e) => onStatusFilterChange(e.target.value)}
          className="cursor-pointer rounded-lg border border-zinc-200 dark:border-white/[0.09] bg-white dark:bg-[#1a1a1a] px-3 py-2 text-sm shadow-sm transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/40"
        >
          <option value="">{t("invoices.all")}</option>
          <option value="needs_supplement">{t("invoices.status.needs_supplement")}</option>
          <option value="pending">{t("invoices.status.pending")}</option>
          <option value="paid">{t("invoices.status.paid")}</option>
          <option value="overdue">{t("invoices.status.overdue")}</option>
        </select>
        <select
          value={customerFilter}
          onChange={(e) => onCustomerFilterChange(e.target.value)}
          className="cursor-pointer rounded-lg border border-zinc-200 dark:border-white/[0.09] bg-white dark:bg-[#1a1a1a] px-3 py-2 text-sm shadow-sm transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/40"
        >
          <option value="">{t("invoices.filterCustomer")}</option>
          {customers.map((c) => (
            <option key={c.id} value={c.id}>{c.customer_name}</option>
          ))}
        </select>
        <button
          type="button"
          onClick={onToggleGroupBy}
          className={`cursor-pointer inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/40 ${
            groupBy === "disbursement"
              ? "border-violet-300 dark:border-violet-500/30 bg-violet-50 dark:bg-violet-500/10 text-violet-700 dark:text-violet-400"
              : "border-zinc-200 dark:border-white/[0.09] bg-white dark:bg-[#1a1a1a] text-zinc-600 dark:text-slate-400 hover:border-violet-200 dark:hover:border-violet-500/20"
          }`}
        >
          <Layers className="h-4 w-4" />
          Nhóm theo giải ngân
        </button>
      </div>

      {/* Bulk action toolbar */}
      {selectedCount > 0 && (
        <div className="flex items-center gap-3 rounded-xl border border-violet-200 dark:border-violet-500/20 bg-violet-50 dark:bg-violet-500/10 px-4 py-2.5">
          <CheckSquare className="h-4 w-4 text-violet-600 dark:text-violet-400" />
          <span className="text-sm font-medium text-violet-700 dark:text-violet-300">
            Đã chọn {selectedCount} hóa đơn
          </span>
          <button
            type="button"
            onClick={onBulkMarkPaid}
            disabled={bulkLoading}
            className="cursor-pointer ml-auto rounded-lg border border-green-300 dark:border-green-500/30 bg-green-50 dark:bg-green-500/10 px-3 py-1.5 text-xs font-medium text-green-700 dark:text-green-400 transition-colors hover:bg-green-100 dark:hover:bg-green-500/20 disabled:opacity-50"
          >
            {bulkLoading ? "Đang xử lý..." : "Hoàn thành đã chọn"}
          </button>
          <button
            type="button"
            onClick={onClearSelection}
            className="cursor-pointer rounded-lg border border-zinc-200 dark:border-white/[0.09] px-3 py-1.5 text-xs text-zinc-600 dark:text-slate-400 transition-colors hover:bg-zinc-50 dark:hover:bg-white/[0.04]"
          >
            Bỏ chọn
          </button>
        </div>
      )}
    </div>
  );
}
