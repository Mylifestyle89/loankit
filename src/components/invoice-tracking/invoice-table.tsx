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
};

type Props = {
  invoices: Invoice[];
  onMarkPaid?: (id: string) => void;
  onDelete?: (id: string) => void;
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

export function InvoiceTable({ invoices, onMarkPaid, onDelete }: Props) {
  const { t } = useLanguage();

  if (invoices.length === 0) {
    return <p className="p-6 text-sm text-zinc-500 dark:text-slate-400">{t("invoices.noData")}</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-zinc-200 dark:border-white/[0.07] bg-violet-50/50 dark:bg-white/[0.05] text-left">
            <th className="px-4 py-2.5 font-semibold whitespace-nowrap">{t("invoices.number")}</th>
            <th className="px-4 py-2.5 font-semibold whitespace-nowrap">{t("invoices.supplier")}</th>
            <th className="px-4 py-2.5 font-semibold whitespace-nowrap text-right">{t("invoices.amount")}</th>
            <th className="px-4 py-2.5 font-semibold whitespace-nowrap">{t("invoices.issueDate")}</th>
            <th className="px-4 py-2.5 font-semibold whitespace-nowrap">{t("invoices.dueDate")}</th>
            <th className="px-4 py-2.5 font-semibold whitespace-nowrap">{t("invoices.status")}</th>
            <th className="px-4 py-2.5 font-semibold whitespace-nowrap">{t("common.actions")}</th>
          </tr>
        </thead>
        <tbody>
          {invoices.map((inv) => (
            <tr
              key={inv.id}
              className={`border-t border-zinc-200 dark:border-white/[0.07] transition-colors duration-150 hover:bg-violet-50/50 dark:hover:bg-white/[0.04] ${
                isDueSoon(inv.dueDate) && inv.status === "pending"
                  ? "bg-yellow-50 dark:bg-yellow-500/5"
                  : ""
              }`}
            >
              <td className="px-4 py-2.5 font-medium whitespace-nowrap">{inv.invoiceNumber}</td>
              <td className="px-4 py-2.5">{inv.supplierName}</td>
              <td className="px-4 py-2.5 text-right tabular-nums">{fmt(inv.amount)}</td>
              <td className="px-4 py-2.5 whitespace-nowrap">{fmtDate(inv.issueDate)}</td>
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
