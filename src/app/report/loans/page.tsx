"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowRight, ArrowUpDown, Calendar, ChevronDown, ChevronUp,
  Layers, LayoutGrid, List, Percent, Plus, Search, Shield, Tag, Trash2, X,
} from "lucide-react";

import { useLanguage } from "@/components/language-provider";
import { LoanStatusBadge } from "@/components/invoice-tracking/loan-status-badge";
import { fmtDisplay as fmt, fmtDateDisplay as fmtDate } from "@/lib/invoice-tracking-format-helpers";

type Loan = {
  id: string;
  contractNumber: string;
  loanAmount: number;
  interestRate: number | null;
  loan_method: string;
  collateralValue: number | null;
  startDate: string;
  endDate: string;
  status: string;
  purpose: string | null;
  customer: { id: string; customer_name: string; customer_type?: string };
  _count: { disbursements: number };
};

const LOAN_METHOD_LABELS: Record<string, string> = {
  tung_lan: "Từng lần",
  han_muc: "Hạn mức",
  trung_dai: "Trung dài hạn",
  tieu_dung: "Tiêu dùng",
};

const STATUS_OPTIONS = [
  { value: "", label: "Tất cả trạng thái" },
  { value: "active", label: "Đang hoạt động" },
  { value: "completed", label: "Đã hoàn thành" },
  { value: "cancelled", label: "Đã hủy" },
];

const CUSTOMER_TYPE_OPTIONS = [
  { value: "", label: "Tất cả" },
  { value: "individual", label: "Cá nhân (CN)" },
  { value: "corporate", label: "Doanh nghiệp (DN)" },
];

type SortKey = "contractNumber" | "customerName" | "loanAmount" | "startDate" | "status" | "";

export default function LoansPage() {
  const { t } = useLanguage();
  const [loans, setLoans] = useState<Loan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [viewMode, setViewMode] = useState<"table" | "card">("table");

  // Filters
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [customerTypeFilter, setCustomerTypeFilter] = useState("");

  // Sort
  const [sortBy, setSortBy] = useState<SortKey>("");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  // Debounce search
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null);

  const loadLoans = useCallback(async (searchTerm?: string) => {
    setLoading(true);
    setError("");
    const params = new URLSearchParams();
    const term = searchTerm ?? search;
    if (term.trim()) params.set("search", term.trim());
    if (statusFilter) params.set("status", statusFilter);
    if (customerTypeFilter) params.set("customerType", customerTypeFilter);
    if (sortBy) {
      params.set("sortBy", sortBy);
      params.set("sortOrder", sortOrder);
    }
    const qs = params.toString();
    try {
      const res = await fetch(`/api/loans${qs ? `?${qs}` : ""}`, { cache: "no-store" });
      const data = await res.json();
      if (!data.ok) { setError(data.error ?? "Failed"); setLoading(false); return; }
      setLoans(data.loans ?? []);
    } catch {
      setError("Lỗi mạng.");
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, customerTypeFilter, sortBy, sortOrder]);

  // Reload when filters change (not search — search is debounced)
  useEffect(() => { void loadLoans(); }, [statusFilter, customerTypeFilter, sortBy, sortOrder]); // eslint-disable-line react-hooks/exhaustive-deps

  // Debounce search input
  function handleSearchChange(value: string) {
    setSearch(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => void loadLoans(value), 350);
  }

  function handleSort(key: SortKey) {
    if (sortBy === key) {
      setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(key);
      setSortOrder(key === "loanAmount" || key === "startDate" ? "desc" : "asc");
    }
  }

  async function handleDelete(id: string) {
    if (!confirm(t("loans.deleteConfirm"))) return;
    const res = await fetch(`/api/loans/${id}`, { method: "DELETE" });
    const data = await res.json();
    if (data.ok) void loadLoans();
    else setError(data.error ?? "Delete failed.");
  }

  function clearFilters() {
    setSearch("");
    setStatusFilter("");
    setCustomerTypeFilter("");
    setSortBy("");
    setSortOrder("desc");
  }

  const hasFilters = search || statusFilter || customerTypeFilter;
  const totalAmount = loans.reduce((s, l) => s + l.loanAmount, 0);
  const activeCount = loans.filter((l) => l.status === "active").length;

  const filterBtnCls = (active: boolean) =>
    `cursor-pointer rounded-lg px-3 py-1.5 text-xs font-medium border transition-all duration-150 ${
      active
        ? "border-violet-300 bg-violet-50 text-violet-700 dark:border-violet-500/30 dark:bg-violet-500/15 dark:text-violet-400"
        : "border-zinc-200 bg-white text-zinc-600 hover:border-violet-200 dark:border-white/[0.09] dark:bg-[#1a1a1a] dark:text-slate-400 dark:hover:border-violet-500/20"
    }`;

  function SortIcon({ col }: { col: SortKey }) {
    if (sortBy !== col) return <ArrowUpDown className="h-3 w-3 opacity-40" />;
    return sortOrder === "asc"
      ? <ChevronUp className="h-3 w-3 text-violet-600 dark:text-violet-400" />
      : <ChevronDown className="h-3 w-3 text-violet-600 dark:text-violet-400" />;
  }

  const thCls = "px-4 py-3 text-left font-medium cursor-pointer select-none hover:text-violet-600 dark:hover:text-violet-400 transition-colors";

  return (
    <section className="space-y-5">
      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl border border-violet-100 dark:border-violet-500/10 bg-gradient-to-br from-violet-50 via-white to-fuchsia-50 dark:from-violet-950/30 dark:via-[#141414] dark:to-fuchsia-950/20 p-5">
        <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-violet-200/30 blur-2xl dark:bg-violet-500/10" />
        <div className="relative flex items-start justify-between">
          <div>
            <h2 className="text-xl font-bold tracking-tight bg-gradient-to-r from-violet-700 to-fuchsia-600 dark:from-violet-400 dark:to-fuchsia-400 bg-clip-text text-transparent">
              {t("loans.title")}
            </h2>
            <p className="mt-1 text-sm text-zinc-500 dark:text-slate-400">{t("loans.desc")}</p>
            {error && <p className="mt-2 text-sm text-red-600 dark:text-red-400" role="alert">{error}</p>}
          </div>
          <Link href="/report/loans/new"
            className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-violet-600 to-fuchsia-600 px-4 py-2 text-sm font-medium text-white shadow-sm shadow-violet-500/25 transition-all duration-200 hover:shadow-md hover:shadow-violet-500/30 hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/50">
            <Plus className="h-4 w-4" />
            {t("loans.add")}
          </Link>
        </div>

        {/* Quick stats */}
        <div className="relative mt-4 flex gap-6 text-sm">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-100 dark:bg-violet-500/15">
              <Layers className="h-4 w-4 text-violet-600 dark:text-violet-400" />
            </div>
            <div>
              <p className="text-xs text-zinc-400 dark:text-slate-500">{t("loans.title")}</p>
              <p className="font-semibold tabular-nums">{loans.length}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-500/15">
              <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{activeCount}</span>
            </div>
            <div>
              <p className="text-xs text-zinc-400 dark:text-slate-500">{t("loans.status.active")}</p>
              <p className="font-semibold tabular-nums">{fmt(totalAmount)} VND</p>
            </div>
          </div>
        </div>
      </div>

      {/* Search & Filter bar */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Search input */}
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400 dark:text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Tìm theo số HĐ hoặc tên khách hàng..."
            className="w-full rounded-lg border border-zinc-200 dark:border-white/[0.09] bg-white dark:bg-[#1a1a1a] pl-9 pr-9 py-2 text-sm shadow-sm transition-all duration-150 placeholder:text-zinc-400 dark:placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/40"
          />
          {search && (
            <button type="button" onClick={() => handleSearchChange("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md p-0.5 text-zinc-400 hover:text-zinc-600 dark:text-slate-500 dark:hover:text-slate-300 transition-colors cursor-pointer">
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Customer type filter */}
        <div className="flex items-center gap-1">
          {CUSTOMER_TYPE_OPTIONS.map((opt) => (
            <button key={opt.value} type="button"
              onClick={() => setCustomerTypeFilter(opt.value)}
              className={filterBtnCls(customerTypeFilter === opt.value)}>
              {opt.label}
            </button>
          ))}
        </div>

        {/* Status filter */}
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="cursor-pointer rounded-lg border border-zinc-200 dark:border-white/[0.09] bg-white dark:bg-[#1a1a1a] px-3 py-1.5 text-xs font-medium shadow-sm transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/40"
        >
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>

        {/* Clear filters */}
        {hasFilters && (
          <button type="button" onClick={clearFilters}
            className="cursor-pointer inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs text-zinc-500 hover:text-red-600 hover:bg-red-50 dark:text-slate-400 dark:hover:text-red-400 dark:hover:bg-red-500/10 transition-colors">
            <X className="h-3 w-3" /> Xóa bộ lọc
          </button>
        )}

        {/* View mode toggle */}
        <div className="ml-auto flex items-center gap-1 rounded-lg border border-zinc-200 dark:border-white/[0.09] bg-white dark:bg-[#1a1a1a] p-0.5">
          <button type="button" onClick={() => setViewMode("table")} className={`cursor-pointer rounded-md p-1.5 transition-colors ${viewMode === "table" ? "bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-400" : "text-zinc-400 hover:text-zinc-600 dark:hover:text-slate-300"}`} title="Dạng bảng"><List className="h-4 w-4" /></button>
          <button type="button" onClick={() => setViewMode("card")} className={`cursor-pointer rounded-md p-1.5 transition-colors ${viewMode === "card" ? "bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-400" : "text-zinc-400 hover:text-zinc-600 dark:hover:text-slate-300"}`} title="Dạng thẻ"><LayoutGrid className="h-4 w-4" /></button>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-violet-200 border-t-violet-600 dark:border-violet-800 dark:border-t-violet-400" />
        </div>
      ) : loans.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-300 dark:border-white/[0.08] py-12 text-center">
          <p className="text-sm text-zinc-400 dark:text-slate-500">
            {hasFilters ? "Không tìm thấy khoản vay nào phù hợp." : t("loans.noData")}
          </p>
        </div>
      ) : viewMode === "table" ? (
        <div className="overflow-x-auto rounded-xl border border-zinc-200 dark:border-white/[0.07] bg-white dark:bg-[#161616] shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-100 dark:border-white/[0.05] text-xs text-zinc-500 dark:text-slate-400">
                <th className={thCls} onClick={() => handleSort("contractNumber")}>
                  <span className="inline-flex items-center gap-1">Số HĐ <SortIcon col="contractNumber" /></span>
                </th>
                <th className={thCls} onClick={() => handleSort("customerName")}>
                  <span className="inline-flex items-center gap-1">Khách hàng <SortIcon col="customerName" /></span>
                </th>
                <th className={`${thCls} text-right`} onClick={() => handleSort("loanAmount")}>
                  <span className="inline-flex items-center gap-1 justify-end">Số tiền vay <SortIcon col="loanAmount" /></span>
                </th>
                <th className="px-4 py-3 text-center font-medium">Lãi suất</th>
                <th className="px-4 py-3 text-center font-medium">Phương thức</th>
                <th className={`${thCls} text-center`} onClick={() => handleSort("startDate")}>
                  <span className="inline-flex items-center gap-1 justify-center">Thời hạn <SortIcon col="startDate" /></span>
                </th>
                <th className={`${thCls} text-center`} onClick={() => handleSort("status")}>
                  <span className="inline-flex items-center gap-1 justify-center">Trạng thái <SortIcon col="status" /></span>
                </th>
                <th className="px-4 py-3 text-right font-medium" />
              </tr>
            </thead>
            <tbody>
              {loans.map((loan) => (
                <tr key={loan.id} className="border-b border-zinc-50 dark:border-white/[0.03] hover:bg-violet-50/30 dark:hover:bg-violet-500/5 transition-colors">
                  <td className="px-4 py-3 font-medium"><Link href={`/report/loans/${loan.id}`} className="text-violet-600 dark:text-violet-400 hover:underline">{loan.contractNumber}</Link></td>
                  <td className="px-4 py-3 text-zinc-600 dark:text-slate-300">
                    <div>{loan.customer.customer_name}</div>
                    {loan.customer.customer_type && (
                      <span className={`mt-0.5 inline-block rounded px-1.5 py-0.5 text-[10px] font-medium ${
                        loan.customer.customer_type === "individual"
                          ? "bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400"
                          : "bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400"
                      }`}>
                        {loan.customer.customer_type === "individual" ? "CN" : "DN"}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold tabular-nums">{fmt(loan.loanAmount)}</td>
                  <td className="px-4 py-3 text-center tabular-nums">{loan.interestRate != null ? `${loan.interestRate}%` : "—"}</td>
                  <td className="px-4 py-3 text-center">{LOAN_METHOD_LABELS[loan.loan_method] ?? loan.loan_method}</td>
                  <td className="px-4 py-3 text-center text-xs text-zinc-500 dark:text-slate-400">{fmtDate(loan.startDate)} — {fmtDate(loan.endDate)}</td>
                  <td className="px-4 py-3 text-center"><LoanStatusBadge status={loan.status} /></td>
                  <td className="px-4 py-3 text-right">
                    <button type="button" onClick={() => handleDelete(loan.id)} className="rounded-md p-1.5 text-zinc-400 hover:text-red-600 hover:bg-red-50 dark:hover:text-red-400 dark:hover:bg-red-500/10 transition-colors cursor-pointer"><Trash2 className="h-3.5 w-3.5" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="grid gap-3">
          {loans.map((loan) => (
            <div key={loan.id}
              className="group relative rounded-xl border border-zinc-200 dark:border-white/[0.07] bg-white dark:bg-[#161616] p-4 shadow-sm transition-all duration-200 hover:shadow-md hover:border-violet-200 dark:hover:border-violet-500/20">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2.5">
                    <h3 className="truncate font-semibold text-zinc-900 dark:text-white">{loan.contractNumber}</h3>
                    <LoanStatusBadge status={loan.status} />
                    {loan.customer.customer_type && (
                      <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${
                        loan.customer.customer_type === "individual"
                          ? "bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400"
                          : "bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400"
                      }`}>
                        {loan.customer.customer_type === "individual" ? "CN" : "DN"}
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 text-sm text-zinc-500 dark:text-slate-400">{loan.customer.customer_name}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-lg font-bold tabular-nums bg-gradient-to-r from-violet-700 to-fuchsia-600 dark:from-violet-400 dark:to-fuchsia-400 bg-clip-text text-transparent">{fmt(loan.loanAmount)}</p>
                  <p className="text-xs text-zinc-400 dark:text-slate-500">VND</p>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-zinc-500 dark:text-slate-400">
                <span className="inline-flex items-center gap-1"><Calendar className="h-3 w-3" />{fmtDate(loan.startDate)} — {fmtDate(loan.endDate)}</span>
                {loan.interestRate != null && <span className="inline-flex items-center gap-1"><Percent className="h-3 w-3" />LS: {loan.interestRate}%/năm</span>}
                <span className="inline-flex items-center gap-1"><Tag className="h-3 w-3" />{LOAN_METHOD_LABELS[loan.loan_method] ?? loan.loan_method}</span>
                {loan.collateralValue != null && loan.collateralValue > 0 && <span className="inline-flex items-center gap-1"><Shield className="h-3 w-3" />TSBD: {fmt(loan.collateralValue)}</span>}
                {loan.purpose && <span className="truncate max-w-[260px]" title={loan.purpose}>{loan.purpose}</span>}
              </div>
              <div className="mt-3 flex items-center gap-2 border-t border-zinc-100 dark:border-white/[0.05] pt-3">
                <Link href={`/report/loans/${loan.id}`} className="inline-flex items-center gap-1 rounded-lg bg-violet-50 dark:bg-violet-500/10 px-3 py-1.5 text-xs font-medium text-violet-700 dark:text-violet-400 transition-colors duration-150 hover:bg-violet-100 dark:hover:bg-violet-500/20">{t("common.view")}<ArrowRight className="h-3 w-3" /></Link>
                <button type="button" onClick={() => handleDelete(loan.id)} className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs text-zinc-500 dark:text-slate-400 transition-colors duration-150 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10 dark:hover:text-red-400 cursor-pointer"><Trash2 className="h-3 w-3" />{t("common.delete")}</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
