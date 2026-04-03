"use client";

/**
 * loan-list-filters.tsx
 *
 * Search input, customer-type filter buttons, status select,
 * clear-filters button, and view-mode toggle for the loans list page.
 */

import { LayoutGrid, List, Search, X } from "lucide-react";
import { useLanguage } from "@/components/language-provider";

type SortKey = "contractNumber" | "customerName" | "loanAmount" | "startDate" | "status" | "";

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

type Props = {
  search: string;
  onSearchChange: (value: string) => void;
  statusFilter: string;
  onStatusFilterChange: (value: string) => void;
  customerTypeFilter: string;
  onCustomerTypeFilterChange: (value: string) => void;

  viewMode: "table" | "card";
  onViewModeChange: (mode: "table" | "card") => void;
  hasFilters: boolean;
  onClearFilters: () => void;
};

export function LoanListFilters({
  search, onSearchChange,
  statusFilter, onStatusFilterChange,
  customerTypeFilter, onCustomerTypeFilterChange,

  viewMode, onViewModeChange,
  hasFilters, onClearFilters,
}: Props) {
  const { t } = useLanguage();

  const filterBtnCls = (active: boolean) =>
    `cursor-pointer px-3 py-1.5 text-xs font-medium transition-all duration-150 ${
      active
        ? "bg-indigo-600 text-white shadow-sm dark:bg-indigo-500"
        : "bg-white text-zinc-500 hover:text-zinc-800 dark:bg-[#1a1a1a] dark:text-slate-400 dark:hover:text-slate-200"
    }`;



  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* Search input */}
      <div className="relative flex-1 min-w-[240px]">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400 dark:text-slate-500" />
        <input
          type="text"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Tìm theo số HĐ hoặc tên khách hàng..."
          className="w-full rounded-lg border border-zinc-200 dark:border-white/[0.09] bg-white dark:bg-[#1a1a1a] pl-9 pr-9 py-2 text-sm shadow-sm transition-all duration-150 placeholder:text-zinc-400 dark:placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/40"
        />
        {search && (
          <button
            type="button"
            onClick={() => onSearchChange("")}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md p-0.5 text-zinc-400 hover:text-zinc-600 dark:text-slate-500 dark:hover:text-slate-300 transition-colors cursor-pointer"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Customer type filter — segmented control */}
      <div className="flex items-center rounded-lg border border-zinc-200 dark:border-white/[0.09] overflow-hidden">
        {CUSTOMER_TYPE_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => onCustomerTypeFilterChange(opt.value)}
            className={filterBtnCls(customerTypeFilter === opt.value)}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Status filter */}
      <select
        value={statusFilter}
        onChange={(e) => onStatusFilterChange(e.target.value)}
        className="cursor-pointer rounded-lg border border-zinc-200 dark:border-white/[0.09] bg-white dark:bg-[#1a1a1a] px-3 py-1.5 text-xs font-medium shadow-sm transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/40"
      >
        {STATUS_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>

      {/* Clear filters */}
      {hasFilters && (
        <button
          type="button"
          onClick={onClearFilters}
          className="cursor-pointer inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs text-zinc-500 hover:text-red-600 hover:bg-red-50 dark:text-slate-400 dark:hover:text-red-400 dark:hover:bg-red-500/10 transition-colors"
        >
          <X className="h-3 w-3" /> Xóa bộ lọc
        </button>
      )}

      {/* View mode toggle */}
      <div className="ml-auto flex items-center gap-1 rounded-lg border border-zinc-200 dark:border-white/[0.09] bg-white dark:bg-[#1a1a1a] p-0.5">
        <button
          type="button"
          onClick={() => onViewModeChange("table")}
          className={`cursor-pointer rounded-md p-1.5 transition-colors ${viewMode === "table" ? "bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-400" : "text-zinc-400 hover:text-zinc-600 dark:hover:text-slate-300"}`}
          title="Dạng bảng"
        >
          <List className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => onViewModeChange("card")}
          className={`cursor-pointer rounded-md p-1.5 transition-colors ${viewMode === "card" ? "bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-400" : "text-zinc-400 hover:text-zinc-600 dark:hover:text-slate-300"}`}
          title="Dạng thẻ"
        >
          <LayoutGrid className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

// Re-export types needed by the page
export type { SortKey };
