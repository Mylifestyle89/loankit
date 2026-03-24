"use client";

import Link from "next/link";
import { Eye, FileText, Pencil, Plus } from "lucide-react";
import { fmtDisplay as fmt, fmtDateDisplay as fmtDate } from "@/lib/invoice-tracking-format-helpers";

// --- Types ---

export type DisbursementRow = {
  id: string;
  amount: number;
  disbursementDate: string;
  description: string | null;
  status: string;
  _count: { invoices: number };
  beneficiaryLines: { id: string; beneficiaryName: string; amount: number; invoiceStatus: string; invoiceAmount: number }[];
};

// --- Badge styles ---

const badgeCls = {
  green: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  yellow: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  red: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
} as const;
const badgeBase = "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium";

// --- Sub-components ---

function BeneficiaryInvoiceBadge({ line }: { line: { invoiceStatus: string; invoiceAmount: number } }) {
  if (line.invoiceStatus === "has_invoice") {
    return <span className={`${badgeBase} ${badgeCls.green}`}>Đã bổ sung</span>;
  }
  if (line.invoiceStatus === "supplementing") {
    return <span className={`${badgeBase} ${badgeCls.yellow}`}>Đang bổ sung</span>;
  }
  return <span className={`${badgeBase} ${badgeCls.red}`}>Cần bổ sung</span>;
}

function DisbursementActions({ d, onEdit, onReport, t, rowSpan }: {
  d: DisbursementRow;
  onEdit: (id: string) => void;
  onReport: (id: string) => void;
  t: (k: string) => string | undefined;
  rowSpan?: number;
}) {
  return (
    <td className="px-4 py-2 align-middle" rowSpan={rowSpan}>
      <div className="flex items-center gap-1">
        <button type="button" onClick={() => onEdit(d.id)} title={t("common.edit") ?? "Sửa"}
          className="cursor-pointer rounded p-1.5 text-zinc-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:text-indigo-400 dark:hover:bg-indigo-900/20 transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50">
          <Pencil className="h-4 w-4" />
        </button>
        <button type="button" onClick={() => onReport(d.id)} title={t("disbursements.generateReport") ?? "Tạo báo cáo"}
          className="cursor-pointer rounded p-1.5 text-zinc-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:text-amber-400 dark:hover:bg-amber-900/20 transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/50">
          <FileText className="h-4 w-4" />
        </button>
        <Link href={`/report/disbursements/${d.id}`} title={t("common.view") ?? "Xem"}
          className="cursor-pointer rounded p-1.5 text-zinc-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:text-emerald-400 dark:hover:bg-emerald-900/20 transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50">
          <Eye className="h-4 w-4" />
        </Link>
      </div>
    </td>
  );
}

// --- Main table component ---

type Props = {
  disbursements: DisbursementRow[];
  loading: boolean;
  t: (k: string) => string | undefined;
  onEdit: (id: string) => void;
  onReport: (id: string) => void;
  onAddInvoice: (target: { disbursementId: string; lineId: string; name: string; amount: number }) => void;
};

export function DisbursementTable({ disbursements, loading, t, onEdit, onReport, onAddInvoice }: Props) {
  if (loading) return <p className="p-6 text-sm text-zinc-500 dark:text-slate-400">{t("loans.loading")}</p>;
  if (disbursements.length === 0) return <p className="p-6 text-sm text-zinc-500 dark:text-slate-400">{t("disbursements.noData")}</p>;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-zinc-200 dark:border-white/[0.07] bg-violet-50/50 dark:bg-white/[0.05] text-left">
            <th className="px-4 py-2 font-semibold">{t("disbursements.date")}</th>
            <th className="px-4 py-2 font-semibold">{t("disbursements.amount")}</th>
            <th className="px-4 py-2 font-semibold">{t("disbursements.beneficiary")}</th>
            <th className="px-4 py-2 font-semibold text-right">{t("disbursements.invoiceProgress")}</th>
            <th className="px-4 py-2 font-semibold">{t("disbursements.invoiceStatus")}</th>
            <th className="px-4 py-2 font-semibold w-20" />
          </tr>
        </thead>
        <tbody>
          {disbursements.map((d) => {
            const lines = d.beneficiaryLines;
            const rowSpan = Math.max(lines.length, 1);
            return lines.length === 0 ? (
              <tr key={d.id} className="border-t border-zinc-200 dark:border-white/[0.07] transition-colors duration-150 hover:bg-violet-50/50 dark:hover:bg-white/[0.04]">
                <td className="px-4 py-2">{fmtDate(d.disbursementDate)}</td>
                <td className="px-4 py-2 font-medium tabular-nums">{fmt(d.amount)}</td>
                <td className="px-4 py-2 text-zinc-400 dark:text-slate-500">—</td>
                <td className="px-4 py-2 text-right">
                  <div className="tabular-nums text-zinc-400 dark:text-slate-500">0 / {fmt(d.amount)}</div>
                  <div className="mt-1 h-1.5 w-full rounded-full bg-zinc-100 dark:bg-white/[0.08]">
                    <div className="h-full w-0 rounded-full bg-zinc-300 dark:bg-white/[0.15]" />
                  </div>
                </td>
                <td className="px-4 py-2"><span className={`${badgeBase} ${badgeCls.red}`}>Cần bổ sung</span></td>
                <DisbursementActions d={d} onEdit={onEdit} onReport={onReport} t={t} />
              </tr>
            ) : (
              lines.map((b, i) => (
                <tr key={`${d.id}-${i}`} className={`${i === 0 ? "border-t border-zinc-200 dark:border-white/[0.07]" : ""} transition-colors duration-150 hover:bg-violet-50/50 dark:hover:bg-white/[0.04]`}>
                  {i === 0 && (
                    <>
                      <td className="px-4 py-2 align-middle" rowSpan={rowSpan}>{fmtDate(d.disbursementDate)}</td>
                      <td className="px-4 py-2 align-middle font-medium tabular-nums" rowSpan={rowSpan}>{fmt(d.amount)}</td>
                    </>
                  )}
                  <td className="px-4 py-2 text-zinc-700 dark:text-slate-300">{b.beneficiaryName}</td>
                  <td className="px-4 py-2 text-right">
                    <div className="tabular-nums">
                      <span className={b.invoiceAmount >= b.amount ? "text-green-600 dark:text-green-400" : "text-zinc-500 dark:text-slate-400"}>
                        {fmt(b.invoiceAmount)}
                      </span>
                      <span className="text-zinc-400 dark:text-slate-500"> / {fmt(b.amount)}</span>
                    </div>
                    <div className="mt-1 h-1.5 w-full rounded-full bg-zinc-100 dark:bg-white/[0.08]">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          b.invoiceAmount >= b.amount
                            ? "bg-green-500 dark:bg-green-400"
                            : b.invoiceAmount > 0
                              ? "bg-amber-500 dark:bg-amber-400"
                              : "bg-zinc-300 dark:bg-white/[0.15]"
                        }`}
                        style={{ width: `${Math.min(100, b.amount > 0 ? (b.invoiceAmount / b.amount) * 100 : 0)}%` }}
                      />
                    </div>
                  </td>
                  <td className="px-4 py-2">
                    <div className="flex items-center gap-1.5">
                      <BeneficiaryInvoiceBadge line={b} />
                      {b.invoiceStatus !== "has_invoice" && (
                        <button type="button"
                          onClick={() => onAddInvoice({ disbursementId: d.id, lineId: b.id, name: b.beneficiaryName, amount: b.amount })}
                          title="Bổ sung hóa đơn"
                          className="cursor-pointer rounded p-1 text-zinc-400 hover:text-violet-600 hover:bg-violet-50/50 dark:hover:text-violet-400 dark:hover:bg-violet-900/20 transition-colors">
                          <Plus className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </td>
                  {i === 0 && <DisbursementActions d={d} onEdit={onEdit} onReport={onReport} t={t} rowSpan={rowSpan} />}
                </tr>
              ))
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
