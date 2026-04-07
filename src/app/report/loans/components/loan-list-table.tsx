"use client";

/**
 * loan-list-table.tsx
 *
 * Table view and card view renderers for the loans list page.
 * Handles both viewMode="table" and viewMode="card" layouts.
 */

import Link from "next/link";
import {
  ArrowRight, ArrowUpDown, Calendar, ChevronDown, ChevronUp,
  Percent, Shield, Tag, Trash2,
} from "lucide-react";
import { LoanStatusBadge } from "@/components/invoice-tracking/loan-status-badge";
import { fmtDisplay as fmt, fmtDateDisplay as fmtDate } from "@/lib/invoice-tracking-format-helpers";
import { useLanguage } from "@/components/language-provider";
import type { SortKey } from "./loan-list-filters";

import type { Loan } from "../types";
import { METHOD_SHORT_LABELS as LOAN_METHOD_LABELS } from "@/lib/loan-plan/loan-plan-constants";

type Props = {
  loans: Loan[];
  viewMode: "table" | "card";
  sortBy: SortKey;
  sortOrder: "asc" | "desc";
  onSort: (key: SortKey) => void;
  onDelete: (id: string) => void;
};

function CustomerTypeBadge({ type }: { type?: string }) {
  if (!type) return null;
  return (
    <span className={`mt-0.5 inline-block rounded px-1.5 py-0.5 text-[10px] font-medium ${
      type === "individual"
        ? "bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400"
        : "bg-brand-50 text-brand-500 dark:bg-brand-500/10 dark:text-brand-400"
    }`}>
      {type === "individual" ? "CN" : "DN"}
    </span>
  );
}

function SortIcon({ col, sortBy, sortOrder }: { col: SortKey; sortBy: SortKey; sortOrder: "asc" | "desc" }) {
  if (sortBy !== col) return <ArrowUpDown className="h-3 w-3 opacity-40" />;
  return sortOrder === "asc"
    ? <ChevronUp className="h-3 w-3 text-brand-500 dark:text-brand-400" />
    : <ChevronDown className="h-3 w-3 text-brand-500 dark:text-brand-400" />;
}

export function LoanListTable({ loans, viewMode, sortBy, sortOrder, onSort, onDelete }: Props) {
  const { t } = useLanguage();
  const thCls = "px-4 py-3 text-left font-medium cursor-pointer select-none hover:text-brand-500 dark:hover:text-brand-400 transition-colors";

  if (viewMode === "table") {
    return (
      <div className="overflow-x-auto rounded-xl border border-zinc-200 dark:border-white/[0.07] bg-white dark:bg-[#161616] shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-100 dark:border-white/[0.05] text-xs text-zinc-500 dark:text-slate-400">
              <th className={thCls} onClick={() => onSort("contractNumber")}>
                <span className="inline-flex items-center gap-1">Số HĐ <SortIcon col="contractNumber" sortBy={sortBy} sortOrder={sortOrder} /></span>
              </th>
              <th className={thCls} onClick={() => onSort("customerName")}>
                <span className="inline-flex items-center gap-1">Khách hàng <SortIcon col="customerName" sortBy={sortBy} sortOrder={sortOrder} /></span>
              </th>
              <th className={`${thCls} text-right`} onClick={() => onSort("loanAmount")}>
                <span className="inline-flex items-center gap-1 justify-end">Số tiền vay <SortIcon col="loanAmount" sortBy={sortBy} sortOrder={sortOrder} /></span>
              </th>
              <th className="px-4 py-3 text-center font-medium">Lãi suất</th>
              <th className="px-4 py-3 text-center font-medium">Phương thức</th>
              <th className={thCls} onClick={() => onSort("startDate")}>
                <span className="inline-flex items-center gap-1">Thời hạn <SortIcon col="startDate" sortBy={sortBy} sortOrder={sortOrder} /></span>
              </th>
              <th className={thCls} onClick={() => onSort("status")}>
                <span className="inline-flex items-center gap-1">Trạng thái <SortIcon col="status" sortBy={sortBy} sortOrder={sortOrder} /></span>
              </th>
              <th className="px-4 py-3 text-right font-medium" />
            </tr>
          </thead>
          <tbody>
            {loans.map((loan) => (
              <tr key={loan.id} className="border-b border-zinc-50 dark:border-white/[0.03] hover:bg-brand-50/30 dark:hover:bg-brand-500/5 transition-colors">
                <td className="px-4 py-3 font-medium">
                  <Link href={`/report/loans/${loan.id}`} className="text-brand-500 dark:text-brand-400 hover:underline">
                    {loan.contractNumber}
                  </Link>
                </td>
                <td className="px-4 py-3 text-zinc-600 dark:text-slate-300">
                  <div>{loan.customer.customer_name}</div>
                  <CustomerTypeBadge type={loan.customer.customer_type} />
                </td>
                <td className="px-4 py-3 text-right font-semibold tabular-nums">{fmt(loan.loanAmount)}</td>
                <td className="px-4 py-3 text-center tabular-nums">{loan.interestRate != null ? `${loan.interestRate}%` : "—"}</td>
                <td className="px-4 py-3 text-center text-xs whitespace-nowrap">{LOAN_METHOD_LABELS[loan.loan_method] ?? loan.loan_method}</td>
                <td className="px-4 py-3 text-xs tabular-nums text-zinc-500 dark:text-slate-400 whitespace-nowrap">{fmtDate(loan.startDate)} — {fmtDate(loan.endDate)}</td>
                <td className="px-4 py-3"><LoanStatusBadge status={loan.status} /></td>
                <td className="px-4 py-3 text-right">
                  <button
                    type="button"
                    onClick={() => onDelete(loan.id)}
                    className="rounded-md p-1.5 text-zinc-400 hover:text-red-600 hover:bg-red-50 dark:hover:text-red-400 dark:hover:bg-red-500/10 transition-colors cursor-pointer"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  // Card view
  return (
    <div className="grid gap-3">
      {loans.map((loan) => (
        <div
          key={loan.id}
          className="group relative rounded-xl border border-zinc-200 dark:border-white/[0.07] bg-white dark:bg-[#161616] p-4 shadow-sm transition-all duration-200 hover:shadow-md hover:border-brand-200 dark:hover:border-brand-500/20"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2.5">
                <h3 className="truncate font-semibold text-zinc-900 dark:text-white">{loan.contractNumber}</h3>
                <LoanStatusBadge status={loan.status} />
                <CustomerTypeBadge type={loan.customer.customer_type} />
              </div>
              <p className="mt-0.5 text-sm text-zinc-500 dark:text-slate-400">{loan.customer.customer_name}</p>
            </div>
            <div className="text-right shrink-0">
              <p className="text-lg font-bold tabular-nums text-brand-600 dark:text-brand-400">
                {fmt(loan.loanAmount)}
              </p>
              <p className="text-xs text-zinc-400 dark:text-slate-500">VND</p>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-zinc-500 dark:text-slate-400">
            <span className="inline-flex items-center gap-1"><Calendar className="h-3 w-3" />{fmtDate(loan.startDate)} — {fmtDate(loan.endDate)}</span>
            {loan.interestRate != null && <span className="inline-flex items-center gap-1"><Percent className="h-3 w-3" />LS: {loan.interestRate}%/năm</span>}
            <span className="inline-flex items-center gap-1"><Tag className="h-3 w-3" />{LOAN_METHOD_LABELS[loan.loan_method] ?? loan.loan_method}</span>
            {loan.collateralValue != null && loan.collateralValue > 0 && (
              <span className="inline-flex items-center gap-1"><Shield className="h-3 w-3" />TSBD: {fmt(loan.collateralValue)}</span>
            )}
            {loan.purpose && <span className="truncate max-w-[260px]" title={loan.purpose}>{loan.purpose}</span>}
          </div>
          <div className="mt-3 flex items-center gap-2 border-t border-zinc-100 dark:border-white/[0.05] pt-3">
            <Link
              href={`/report/loans/${loan.id}`}
              className="inline-flex items-center gap-1 rounded-lg bg-brand-100 dark:bg-brand-500/10 px-3 py-1.5 text-xs font-medium text-brand-600 dark:text-brand-400 transition-colors duration-150 hover:bg-brand-100 dark:hover:bg-brand-500/20"
            >
              {t("common.view")}<ArrowRight className="h-3 w-3" />
            </Link>
            <button
              type="button"
              onClick={() => onDelete(loan.id)}
              className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs text-zinc-500 dark:text-slate-400 transition-colors duration-150 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10 dark:hover:text-red-400 cursor-pointer"
            >
              <Trash2 className="h-3 w-3" />{t("common.delete")}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
