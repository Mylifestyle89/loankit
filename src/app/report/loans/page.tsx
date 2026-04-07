"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { Layers, Plus } from "lucide-react";

import { useLanguage } from "@/components/language-provider";
import { fmtDisplay as fmt } from "@/lib/invoice-tracking-format-helpers";
import { LoanListFilters } from "./components/loan-list-filters";
import { LoanListTable } from "./components/loan-list-table";
import type { SortKey } from "./components/loan-list-filters";

import type { Loan } from "./types";

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

  return (
    <section className="space-y-5">
      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl border border-brand-100 dark:border-brand-500/10 bg-gradient-to-br from-brand-50 via-white to-brand-100 dark:from-brand-950/30 dark:via-[#242220] dark:to-brand-900/20 p-5">
        <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-brand-200/30 blur-2xl dark:bg-brand-500/10" />
        <div className="relative flex items-start justify-between">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-brand-600 dark:text-brand-400">
              {t("loans.title")}
            </h2>
            <p className="mt-1 text-sm text-zinc-500 dark:text-slate-400">{t("loans.desc")}</p>
            {error && <p className="mt-2 text-sm text-red-600 dark:text-red-400" role="alert">{error}</p>}
          </div>
          <Link href="/report/loans/new"
            className="inline-flex items-center gap-1.5 rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white shadow-sm shadow-brand-500/25 transition-all duration-200 hover:shadow-md hover:shadow-brand-500/30 hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/50">
            <Plus className="h-4 w-4" />
            {t("loans.add")}
          </Link>
        </div>

        {/* Quick stats */}
        <div className="relative mt-4 flex gap-6 text-sm">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-100 dark:bg-brand-500/15">
              <Layers className="h-4 w-4 text-brand-500 dark:text-brand-400" />
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
      <LoanListFilters
        search={search}
        onSearchChange={handleSearchChange}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        customerTypeFilter={customerTypeFilter}
        onCustomerTypeFilterChange={setCustomerTypeFilter}

        viewMode={viewMode}
        onViewModeChange={setViewMode}
        hasFilters={!!hasFilters}
        onClearFilters={clearFilters}
      />

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand-200 border-t-brand-500 dark:border-brand-700 dark:border-t-brand-400" />
        </div>
      ) : loans.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-300 dark:border-white/[0.08] py-12 text-center">
          <p className="text-sm text-zinc-400 dark:text-slate-500">
            {hasFilters ? "Không tìm thấy khoản vay nào phù hợp." : t("loans.noData")}
          </p>
        </div>
      ) : (
        <LoanListTable
          loans={loans}
          viewMode={viewMode}
          sortBy={sortBy}
          sortOrder={sortOrder}
          onSort={handleSort}
          onDelete={handleDelete}
        />
      )}
    </section>
  );
}
