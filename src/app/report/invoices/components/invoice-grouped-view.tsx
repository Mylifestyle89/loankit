"use client";

/**
 * invoice-grouped-view.tsx
 *
 * Renders invoices grouped by disbursement with collapsible rows,
 * progress bars, and per-group invoice tables.
 */

import Link from "next/link";
import { ChevronDown, ChevronRight, Eye } from "lucide-react";
import { InvoiceTable } from "@/components/invoice-tracking/invoice-table";
import { fmtDisplay as fmt } from "@/lib/invoice-tracking-format-helpers";

type Invoice = {
  id: string;
  invoiceNumber: string;
  supplierName: string;
  amount: number;
  issueDate: string;
  dueDate: string;
  customDeadline?: string | null;
  status: string;
  notes?: string | null;
  disbursementId?: string;
  disbursementBeneficiaryId?: string;
  disbursementBeneficiary?: { amount: number; invoiceAmount: number } | null;
  disbursement?: {
    id: string;
    amount: number;
    disbursementDate?: string;
    loan?: { contractNumber: string; customer?: { customer_name: string } };
  };
};

export type GroupedDisbursement = {
  disbursementId: string;
  disbursementAmount: number;
  disbursementDate: string;
  contractNumber: string;
  customerName: string;
  invoices: Invoice[];
  totalInvoiceAmount: number;
};

type Props = {
  groups: GroupedDisbursement[];
  collapsedGroups: Set<string>;
  onToggleGroup: (id: string) => void;
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onToggleSelectAll: () => void;
  onMarkPaid: (invoiceId: string) => void;
  onSupplement: (inv: Invoice) => void;
};

export function InvoiceGroupedView({
  groups,
  collapsedGroups,
  onToggleGroup,
  selectedIds,
  onToggleSelect,
  onToggleSelectAll,
  onMarkPaid,
  onSupplement,
}: Props) {
  if (groups.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-zinc-300 dark:border-white/[0.08] py-12 text-center">
        <p className="text-sm text-zinc-400 dark:text-slate-500">Không có hóa đơn nào.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {groups.map((g) => {
        const isCollapsed = collapsedGroups.has(g.disbursementId);
        const remaining = Math.max(0, g.disbursementAmount - g.totalInvoiceAmount);
        const pct = g.disbursementAmount > 0
          ? Math.min(100, Math.round((g.totalInvoiceAmount / g.disbursementAmount) * 100))
          : 0;
        const isFull = pct >= 100;

        return (
          <div
            key={g.disbursementId}
            className="rounded-2xl border border-zinc-200 dark:border-white/[0.07] bg-white dark:bg-[#161616] shadow-sm overflow-hidden"
          >
            {/* Group header */}
            <button
              type="button"
              onClick={() => onToggleGroup(g.disbursementId)}
              className="cursor-pointer w-full px-5 py-4 text-left hover:bg-zinc-50/50 dark:hover:bg-white/[0.02] transition-colors"
            >
              {/* Row 1: contract info + badge */}
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0">
                  {isCollapsed
                    ? <ChevronRight className="h-4 w-4 text-zinc-400 shrink-0" />
                    : <ChevronDown className="h-4 w-4 text-violet-500 shrink-0" />
                  }
                  <span className="text-sm font-semibold text-zinc-800 dark:text-slate-200 truncate">
                    {g.contractNumber}
                  </span>
                  <span className="hidden sm:inline text-xs text-zinc-400 dark:text-slate-500 truncate">
                    {g.customerName}
                  </span>
                  <span className="text-xs text-zinc-400 dark:text-slate-500">
                    • {new Date(g.disbursementDate).toLocaleDateString("vi-VN")}
                  </span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                    isFull
                      ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400"
                      : "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400"
                  }`}>
                    {pct}%
                  </span>
                  <span className="text-xs text-zinc-400 dark:text-slate-500">{g.invoices.length} HĐ</span>
                  <Link
                    href={`/report/disbursements/${g.disbursementId}`}
                    onClick={(e) => e.stopPropagation()}
                    title="Quản lý giải ngân"
                    className="cursor-pointer rounded-lg p-1.5 text-zinc-400 hover:text-violet-600 hover:bg-violet-50 dark:hover:text-violet-400 dark:hover:bg-violet-500/10 transition-colors"
                  >
                    <Eye className="h-4 w-4" />
                  </Link>
                </div>
              </div>
              {/* Row 2: progress bar + amounts */}
              <div className="mt-2.5 ml-6 space-y-1.5">
                <div className="h-2 rounded-full bg-zinc-100 dark:bg-white/[0.06] overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      isFull ? "bg-emerald-500" : pct > 50 ? "bg-violet-500" : "bg-amber-500"
                    }`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-xs tabular-nums">
                  <span className="text-zinc-500 dark:text-slate-400">
                    Đã bổ sung:{" "}
                    <span className="font-medium text-zinc-700 dark:text-slate-300">{fmt(g.totalInvoiceAmount)}</span>
                    <span className="text-zinc-400 dark:text-slate-500"> / {fmt(g.disbursementAmount)}</span>
                  </span>
                  {remaining > 0 && (
                    <span className="text-red-600 dark:text-red-400 font-medium">
                      Còn thiếu: {fmt(remaining)}
                    </span>
                  )}
                  {isFull && (
                    <span className="text-emerald-600 dark:text-emerald-400 font-medium">Đã đủ</span>
                  )}
                </div>
              </div>
            </button>
            {/* Group invoices */}
            {!isCollapsed && (
              <InvoiceTable
                invoices={g.invoices}
                onMarkPaid={onMarkPaid}
                onSupplement={onSupplement}
                selectable
                selectedIds={selectedIds}
                onToggleSelect={onToggleSelect}
                onToggleSelectAll={onToggleSelectAll}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
