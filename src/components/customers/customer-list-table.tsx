/* Sortable customer table + SortIcon for CustomerListView */

import Link from "next/link";
import { ArrowUpDown, Check, ChevronDown, ChevronUp, RefreshCw, Trash2 } from "lucide-react";

import { formatRelativeTime } from "@/lib/format-relative-time";

export type SortKey = "customer_name" | "customer_code" | "customer_type" | "lastActivityAt";

export type Customer = {
  id: string;
  customer_code: string;
  customer_name: string;
  customer_type: string;
  address: string | null;
  main_business: string | null;
  charter_capital: number | null;
  legal_representative_name: string | null;
  legal_representative_title: string | null;
  organization_type: string | null;
  updatedAt: string;
  activeLoanCount?: number;
  activeLoanTotal?: number;
  collateralCount?: number;
  collateralTotal?: number;
  lastActivityAt?: string;
  lastActivityType?: "customer" | "loan" | "collateral" | "loan_plan";
};

const ACTIVITY_LABEL: Record<string, string> = {
  customer: "Hồ sơ KH",
  loan: "Khoản vay",
  collateral: "TSBĐ",
  loan_plan: "Phương án",
};

export function SortIcon({ active, dir }: { active: boolean; dir: "asc" | "desc" }) {
  if (!active) return <ArrowUpDown className="h-3 w-3 opacity-30" />;
  return dir === "asc" ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />;
}

export function CustomerTable({
  customers, sortKey, sortDir, onSort,
  selectedCustomerId, deletingId,
  basePath, showSelect,
  onSelect, onDeleteRequest, onDeleteConfirm, onDeleteCancel, onToggleType, t,
}: {
  customers: Customer[];
  sortKey: SortKey;
  sortDir: "asc" | "desc";
  onSort: (key: SortKey) => void;
  selectedCustomerId: string;
  deletingId: string | null;
  basePath: string;
  showSelect: boolean;
  onSelect: (id: string) => void;
  onDeleteRequest: (id: string) => void;
  onDeleteConfirm: (id: string) => void;
  onDeleteCancel: () => void;
  onToggleType?: (id: string, currentType: string) => void;
  t: (k: string) => string;
}) {
  const thCls = "cursor-pointer select-none px-4 py-3 text-left text-xs font-semibold text-zinc-500 dark:text-slate-400 transition-colors hover:text-brand-500 dark:hover:text-brand-400";
  const tdCls = "px-4 py-3 text-sm";

  return (
    <div className="rounded-xl border border-zinc-200 dark:border-white/[0.07] bg-white dark:bg-[#161616] overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-zinc-100 dark:border-white/[0.05] bg-zinc-50/50 dark:bg-white/[0.02]">
              <th className={thCls} onClick={() => onSort("customer_name")}>
                <span className="inline-flex items-center gap-1">Tên khách hàng <SortIcon active={sortKey === "customer_name"} dir={sortDir} /></span>
              </th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-zinc-500 dark:text-slate-400">Khoản vay</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-zinc-500 dark:text-slate-400">Tổng dư nợ</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-500 dark:text-slate-400">Địa chỉ</th>
              <th className={thCls} onClick={() => onSort("lastActivityAt")}>
                <span className="inline-flex items-center gap-1">Hoạt động gần nhất <SortIcon active={sortKey === "lastActivityAt"} dir={sortDir} /></span>
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-zinc-500 dark:text-slate-400">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 dark:divide-white/[0.05]">
            {customers.map((c) => {
              const isSelected = selectedCustomerId === c.id;
              const isDeleting = deletingId === c.id;
              return (
                <tr
                  key={c.id}
                  className={`transition-colors duration-150 ${
                    isSelected
                      ? "bg-brand-50/50 dark:bg-brand-500/5"
                      : "hover:bg-zinc-50 dark:hover:bg-white/[0.02]"
                  }`}
                >
                  <td className={tdCls}>
                    <Link href={`${basePath}/${c.id}`} className="font-medium text-zinc-900 dark:text-white hover:text-brand-500 dark:hover:text-brand-400 transition-colors">
                      {c.customer_name}
                    </Link>
                  </td>
                  <td className={`${tdCls} text-center tabular-nums`}>
                    {c.activeLoanCount ? (
                      <span className="inline-flex items-center rounded-full bg-emerald-50 dark:bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:text-emerald-400">
                        {c.activeLoanCount}
                      </span>
                    ) : <span className="text-zinc-300 dark:text-slate-600">—</span>}
                  </td>
                  <td className={`${tdCls} text-right tabular-nums text-xs`}>
                    {c.activeLoanTotal ? new Intl.NumberFormat("vi-VN").format(c.activeLoanTotal) : "—"}
                  </td>
                  <td className={`${tdCls} text-zinc-500 dark:text-slate-400 max-w-xs truncate`}>{c.address ?? "—"}</td>
                  <td className={`${tdCls} text-xs`}>
                    <div className="flex flex-col leading-tight">
                      <span className="text-zinc-500 dark:text-slate-400 tabular-nums">
                        {formatRelativeTime(c.lastActivityAt ?? c.updatedAt)}
                      </span>
                      <span className="text-[10px] text-zinc-400 dark:text-slate-500">
                        {ACTIVITY_LABEL[c.lastActivityType ?? "customer"]}
                      </span>
                    </div>
                  </td>
                  <td className={`${tdCls} text-right`}>
                    <div className="flex items-center justify-end gap-1.5">
                      {showSelect && (
                        <button
                          type="button"
                          onClick={() => onSelect(c.id)}
                          className={`cursor-pointer inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-medium transition-colors duration-150 ${
                            isSelected
                              ? "bg-brand-500 text-white hover:bg-brand-600"
                              : "text-zinc-500 dark:text-slate-400 hover:bg-brand-50 dark:hover:bg-brand-500/10 hover:text-brand-600 dark:hover:text-brand-400"
                          }`}
                        >
                          {isSelected ? <><Check className="h-3 w-3" /> Chọn</> : "Chọn"}
                        </button>
                      )}
                      {onToggleType && (
                        <button
                          type="button"
                          onClick={() => onToggleType(c.id, c.customer_type)}
                          className="cursor-pointer rounded-lg px-2 py-1 text-xs font-medium text-zinc-500 dark:text-slate-400 transition-colors hover:bg-brand-50 hover:text-brand-600 dark:hover:bg-brand-500/10 dark:hover:text-brand-400"
                          title={c.customer_type === "individual" ? "Chuyển sang Doanh nghiệp" : "Chuyển sang Cá nhân"}
                        >
                          <RefreshCw className="h-3.5 w-3.5" />
                        </button>
                      )}
                      {isDeleting ? (
                        <span className="inline-flex items-center gap-1 text-xs">
                          <button type="button" onClick={() => onDeleteConfirm(c.id)} className="cursor-pointer rounded-lg bg-red-600 px-2 py-1 text-xs font-medium text-white hover:bg-red-700 transition-colors">Xoá</button>
                          <button type="button" onClick={onDeleteCancel} className="cursor-pointer rounded-lg bg-zinc-100 dark:bg-white/[0.06] px-2 py-1 text-xs text-zinc-600 dark:text-slate-400 hover:bg-zinc-200 dark:hover:bg-white/[0.1] transition-colors">Huỷ</button>
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => onDeleteRequest(c.id)}
                          className="cursor-pointer rounded-lg p-1.5 text-zinc-400 dark:text-slate-500 transition-colors hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10 dark:hover:text-red-400"
                          title={t("customers.delete")}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
