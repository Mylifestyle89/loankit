"use client";

import { useLanguage } from "@/components/language-provider";
import { InvoiceStatusBadge } from "./invoice-status-badge";
import { fmtDisplay as fmt, fmtDateDisplay as fmtDate } from "@/lib/invoice-tracking-format-helpers";

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
};

type Props = {
  invoices: Invoice[];
  onMarkPaid?: (id: string) => void;
  onDelete?: (id: string) => void;
  /** Called when user clicks "Bổ sung" on a needs_supplement virtual entry */
  onSupplement?: (inv: Invoice) => void;
  selectable?: boolean;
  selectedIds?: Set<string>;
  onToggleSelect?: (id: string) => void;
  onToggleSelectAll?: () => void;
};

function isDueSoon(dueDate: string): boolean {
  const due = new Date(dueDate).getTime();
  const now = Date.now();
  const sevenDays = 7 * 24 * 60 * 60 * 1000;
  return due > now && due - now <= sevenDays;
}

/** Countdown text: "Con X ngay" or "Qua han Y ngay" */
function deadlineCountdown(dueDate: string, status: string): string | null {
  if (status === "paid") return null;
  const diffMs = new Date(dueDate).getTime() - Date.now();
  const diffDays = Math.ceil(diffMs / (24 * 60 * 60 * 1000));
  if (diffDays < 0) return `Quá hạn ${Math.abs(diffDays)} ngày`;
  if (diffDays === 0) return "Hôm nay";
  if (diffDays <= 7) return `Còn ${diffDays} ngày`;
  return null;
}

export function isSelectable(inv: { id: string; status: string }): boolean {
  if (inv.id.startsWith("virtual-")) return false;
  return inv.status === "pending" || inv.status === "overdue";
}

export function InvoiceTable({ invoices, onMarkPaid, onDelete, onSupplement, selectable, selectedIds, onToggleSelect, onToggleSelectAll }: Props) {
  const { t } = useLanguage();

  if (invoices.length === 0) {
    return <p className="p-6 text-sm text-zinc-500 dark:text-slate-400">{t("invoices.noData")}</p>;
  }

  const eligibleInvoices = selectable ? invoices.filter(isSelectable) : [];
  const allSelected = selectable && eligibleInvoices.length > 0 && eligibleInvoices.every((inv) => selectedIds?.has(inv.id));

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-zinc-200 dark:border-white/[0.07] bg-amber-50/50 dark:bg-white/[0.05] text-left">
            {selectable && (
              <th className="pl-4 pr-1 py-2.5 w-8">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={() => onToggleSelectAll?.()}
                  className="h-4 w-4 rounded border-zinc-300 text-amber-600 focus:ring-amber-500 cursor-pointer"
                  title="Chọn tất cả"
                />
              </th>
            )}
            <th className="px-4 py-2.5 font-semibold whitespace-nowrap">{t("invoices.number")}</th>
            <th className="px-4 py-2.5 font-semibold whitespace-nowrap">{t("invoices.supplier")}</th>
            <th className="px-4 py-2.5 font-semibold whitespace-nowrap text-right">{t("invoices.amount")}</th>
            <th className="px-4 py-2.5 font-semibold whitespace-nowrap text-right">Cần bổ sung</th>
            <th className="px-4 py-2.5 font-semibold whitespace-nowrap">{t("invoices.dueDate")}</th>
            <th className="px-4 py-2.5 font-semibold whitespace-nowrap">{t("invoices.status")}</th>
            <th className="px-4 py-2.5 font-semibold whitespace-nowrap">{t("common.actions")}</th>
          </tr>
        </thead>
        <tbody>
          {invoices.map((inv) => (
            <tr
              key={inv.id}
              className={`border-t border-zinc-200 dark:border-white/[0.07] transition-colors duration-150 hover:bg-amber-50/50 dark:hover:bg-white/[0.04] ${
                isDueSoon(inv.dueDate) && inv.status === "pending"
                  ? "bg-yellow-50 dark:bg-yellow-500/5"
                  : ""
              }`}
            >
              {selectable && (
                <td className="pl-4 pr-1 py-2.5 w-8">
                  {isSelectable(inv) ? (
                    <input
                      type="checkbox"
                      checked={selectedIds?.has(inv.id) ?? false}
                      onChange={() => onToggleSelect?.(inv.id)}
                      className="h-4 w-4 rounded border-zinc-300 text-amber-600 focus:ring-amber-500 cursor-pointer"
                    />
                  ) : (
                    <input
                      type="checkbox"
                      disabled
                      className="h-4 w-4 rounded border-zinc-200 dark:border-zinc-700 opacity-30 cursor-not-allowed"
                      title={inv.status === "needs_supplement" ? "Cần bổ sung đủ hóa đơn trước khi hoàn thành" : ""}
                    />
                  )}
                </td>
              )}
              <td className="px-4 py-2.5 font-medium whitespace-nowrap">{inv.invoiceNumber}</td>
              <td className="px-4 py-2.5">{inv.supplierName}</td>
              <td className="px-4 py-2.5 text-right tabular-nums">{fmt(inv.amount)}</td>
              <td className="px-4 py-2.5 text-right tabular-nums whitespace-nowrap">
                {(() => {
                  // For virtual entries: amount = remaining to supplement
                  if (inv.id.startsWith("virtual-")) {
                    return <span className="text-red-600 dark:text-red-400 font-medium">{fmt(inv.amount)}</span>;
                  }
                  // For real invoices: calc remaining from beneficiary line
                  const b = inv.disbursementBeneficiary;
                  if (b) {
                    const rem = b.amount - b.invoiceAmount;
                    if (rem <= 0) return <span className="text-emerald-600 dark:text-emerald-400">Đã đủ</span>;
                    return <span className="text-amber-600 dark:text-amber-400">{fmt(rem)}</span>;
                  }
                  return <span className="text-zinc-400">—</span>;
                })()}
              </td>
              <td className="px-4 py-2.5 whitespace-nowrap">
                {fmtDate(inv.customDeadline ?? inv.dueDate)}
                {(() => {
                  const cd = deadlineCountdown(inv.customDeadline ?? inv.dueDate, inv.status);
                  if (!cd) return null;
                  const isOverdue = cd.startsWith("Quá hạn");
                  return (
                    <span className={`ml-1.5 text-xs font-medium ${isOverdue ? "text-red-600 dark:text-red-400" : "text-yellow-600 dark:text-yellow-400"}`}>
                      ({cd})
                    </span>
                  );
                })()}
              </td>
              <td className="px-4 py-2.5"><InvoiceStatusBadge status={inv.status} /></td>
              <td className="px-4 py-2.5">
                <div className="flex gap-2">
                  {inv.status === "needs_supplement" && onSupplement && (
                    <button
                      type="button"
                      onClick={() => onSupplement(inv)}
                      className="cursor-pointer rounded border border-amber-300 dark:border-amber-500/30 px-2 py-1 text-xs text-amber-700 dark:text-amber-400 transition-colors duration-150 hover:bg-amber-50 dark:hover:bg-amber-500/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/50"
                    >
                      Bổ sung
                    </button>
                  )}
                  {inv.status === "pending" && onMarkPaid && !inv.id.startsWith("virtual-") && (
                    <button
                      type="button"
                      onClick={() => onMarkPaid(inv.id)}
                      className="cursor-pointer rounded border border-green-300 dark:border-green-500/30 px-2 py-1 text-xs text-green-700 dark:text-green-400 transition-colors duration-150 hover:bg-green-50 dark:hover:bg-green-500/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500/50"
                    >
                      {t("invoices.markPaid")}
                    </button>
                  )}
                  {onDelete && !inv.id.startsWith("virtual-") && (
                    <button
                      type="button"
                      onClick={() => onDelete(inv.id)}
                      className="cursor-pointer rounded border border-red-200 dark:border-red-500/30 px-2 py-1 text-xs text-red-700 dark:text-red-400 transition-colors duration-150 hover:bg-red-50 dark:hover:bg-red-500/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500/50"
                    >
                      {t("common.delete")}
                    </button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
