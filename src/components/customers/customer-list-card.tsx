/* Customer card component for card view in CustomerListView */

import Link from "next/link";
import { ArrowRight, Banknote, Check, FileText, Trash2 } from "lucide-react";

import type { Customer } from "./customer-list-table";

function fmtVND(n: number | undefined | null): string {
  if (!n) return "0đ";
  return n.toLocaleString("vi-VN") + "đ";
}

export function CustomerCard({
  customer: c, index, isSelected, isDeleting,
  basePath, showSelect,
  onSelect, onDeleteRequest, onDeleteConfirm, onDeleteCancel, t,
}: {
  customer: Customer;
  index: number;
  isSelected: boolean;
  isDeleting: boolean;
  basePath: string;
  showSelect: boolean;
  onSelect: () => void;
  onDeleteRequest: () => void;
  onDeleteConfirm: () => void;
  onDeleteCancel: () => void;
  t: (k: string) => string;
}) {
  const loanCount = c.activeLoanCount ?? 0;
  const loanTotal = c.activeLoanTotal ?? 0;

  return (
    <div
      className={`group relative rounded-xl border bg-white dark:bg-[#161616] shadow-sm transition-all duration-200 hover:shadow-md animate-[fadeSlideIn_0.3s_ease-out_both] ${
        isSelected
          ? "border-amber-400 dark:border-amber-500/40 ring-1 ring-amber-300 dark:ring-amber-500/20"
          : "border-zinc-200 dark:border-white/[0.07] hover:border-amber-200 dark:hover:border-amber-500/20"
      }`}
      style={{ animationDelay: `${index * 50}ms` }}
    >
      {/* Header */}
      <div className="p-4 pb-3">
        <div className="flex items-center gap-2.5">
          <h3 className="truncate font-semibold text-zinc-900 dark:text-white">{c.customer_name}</h3>
          <span className="shrink-0 inline-flex items-center rounded-full bg-amber-50 dark:bg-amber-500/10 px-2 py-0.5 text-[11px] font-medium text-amber-700 dark:text-amber-400 ring-1 ring-amber-500/20">
            {c.customer_code}
          </span>
        </div>
        <p className="mt-1 text-sm text-zinc-500 dark:text-slate-400 line-clamp-1">{c.address ?? "—"}</p>
      </div>

      {/* Stats */}
      <div className="mx-4 grid grid-cols-2 gap-3 rounded-lg bg-zinc-50 dark:bg-white/[0.03] p-3">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-amber-100 dark:bg-amber-500/10">
            <FileText className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <p className="text-[10px] text-zinc-400 dark:text-slate-500">Khoản vay</p>
            <p className="text-sm font-semibold text-zinc-800 dark:text-slate-200">{loanCount}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-orange-100 dark:bg-orange-500/10">
            <Banknote className="h-3.5 w-3.5 text-orange-600 dark:text-orange-400" />
          </div>
          <div>
            <p className="text-[10px] text-zinc-400 dark:text-slate-500">Tổng dư nợ</p>
            <p className="text-sm font-semibold text-zinc-800 dark:text-slate-200">{fmtVND(loanTotal)}</p>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 p-4 pt-3">
        <Link href={`${basePath}/${c.id}`} className="cursor-pointer inline-flex items-center gap-1 rounded-lg bg-amber-50 dark:bg-amber-500/10 px-3 py-1.5 text-xs font-medium text-amber-700 dark:text-amber-400 transition-colors hover:bg-amber-100 dark:hover:bg-amber-500/20">
          {t("customers.edit")} <ArrowRight className="h-3 w-3" />
        </Link>
        {showSelect && (
          <button type="button" onClick={onSelect} className={`cursor-pointer inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${isSelected ? "bg-amber-600 text-white hover:bg-amber-700" : "bg-zinc-100 dark:bg-white/[0.06] text-zinc-600 dark:text-slate-400 hover:bg-amber-50 dark:hover:bg-amber-500/10 hover:text-amber-700 dark:hover:text-amber-400"}`}>
            {isSelected ? <><Check className="h-3 w-3" /> Đang chọn</> : "Chọn KH"}
          </button>
        )}
        {isDeleting ? (
          <span className="inline-flex items-center gap-1.5 text-xs">
            <span className="text-red-600 dark:text-red-400 font-medium">Xác nhận?</span>
            <button type="button" onClick={onDeleteConfirm} className="cursor-pointer rounded-lg bg-red-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-red-700 transition-colors">Xoá</button>
            <button type="button" onClick={onDeleteCancel} className="cursor-pointer rounded-lg bg-zinc-100 dark:bg-white/[0.06] px-2.5 py-1 text-xs text-zinc-600 dark:text-slate-400 hover:bg-zinc-200 dark:hover:bg-white/[0.1] transition-colors">Huỷ</button>
          </span>
        ) : (
          <button type="button" onClick={onDeleteRequest} className="cursor-pointer inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs text-zinc-500 dark:text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10 dark:hover:text-red-400">
            <Trash2 className="h-3 w-3" /> {t("customers.delete")}
          </button>
        )}
      </div>
    </div>
  );
}
