/* Customer card component for card view in CustomerListView */

import Link from "next/link";
import { ArrowRight, Banknote, Building2, Check, FileText, Trash2 } from "lucide-react";

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
  const collateralCount = c.collateralCount ?? 0;
  const collateralTotal = c.collateralTotal ?? 0;

  return (
    <div
      className={`group relative rounded-xl border bg-white dark:bg-[#161616] shadow-sm transition-all duration-200 hover:shadow-md animate-[fadeSlideIn_0.3s_ease-out_both] ${
        isSelected
          ? "border-primary-400 dark:border-primary-500/40 ring-1 ring-primary-300 dark:ring-primary-500/20"
          : "border-zinc-200 dark:border-white/[0.07] hover:border-primary-200 dark:hover:border-primary-500/20"
      }`}
      style={{ animationDelay: `${index * 50}ms` }}
    >
      {/* Header */}
      <div className="p-4 pb-3">
        <div className="flex items-center gap-2.5">
          <h3 className="truncate font-semibold text-zinc-900 dark:text-white">{c.customer_name}</h3>
          <span className="shrink-0 inline-flex items-center rounded-full bg-primary-100 dark:bg-primary-500/10 px-2 py-0.5 text-[11px] font-medium text-primary-600 dark:text-primary-400 ring-1 ring-primary-500/20">
            {c.customer_code}
          </span>
        </div>
        <p className="mt-1 text-sm text-zinc-500 dark:text-slate-400 line-clamp-1">{c.address ?? "—"}</p>
      </div>

      {/* Stats — single row */}
      <div className="mx-4 flex items-center divide-x divide-zinc-200 dark:divide-white/[0.06] rounded-lg bg-zinc-50 dark:bg-white/[0.03] px-1">
        {[
          { label: "Vay active", value: loanCount, icon: <FileText className="h-3 w-3 text-primary-400" /> },
          { label: "Dư nợ", value: fmtVND(loanTotal), icon: <Banknote className="h-3 w-3 text-primary-400" /> },
          { label: "Tài sản", value: collateralCount, icon: <Building2 className="h-3 w-3 text-emerald-500" /> },
          { label: "Giá trị TS", value: fmtVND(collateralTotal), icon: <Banknote className="h-3 w-3 text-emerald-500" /> },
        ].map(({ label, value, icon }) => (
          <div key={label} className="flex flex-1 flex-col items-center py-2 gap-0.5 min-w-0">
            <div className="flex items-center gap-1 text-[10px] text-zinc-400 dark:text-slate-500">{icon}{label}</div>
            <p className="text-xs font-semibold text-zinc-800 dark:text-slate-200 truncate w-full text-center">{value}</p>
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 p-4 pt-3">
        <Link href={`${basePath}/${c.id}`} className="cursor-pointer inline-flex items-center gap-1 rounded-lg bg-primary-100 dark:bg-primary-500/10 px-3 py-1.5 text-xs font-medium text-primary-600 dark:text-primary-400 transition-colors hover:bg-primary-100 dark:hover:bg-primary-500/20">
          {t("customers.edit")} <ArrowRight className="h-3 w-3" />
        </Link>
        {showSelect && (
          <button type="button" onClick={onSelect} className={`cursor-pointer inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${isSelected ? "bg-primary-500 text-white hover:bg-primary-600" : "bg-zinc-100 dark:bg-white/[0.06] text-zinc-600 dark:text-slate-400 hover:bg-primary-50 dark:hover:bg-primary-500/10 hover:text-primary-600 dark:hover:text-primary-400"}`}>
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
