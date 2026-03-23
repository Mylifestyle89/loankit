"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Download, LayoutGrid, List, Plus, Search, Upload, Users, X } from "lucide-react";

import { useLanguage } from "@/components/language-provider";
import { useCustomerStore } from "@/stores/use-customer-store";
import { CustomerExportModal } from "@/app/report/customers/components/customer-export-modal";
import { handleCustomerImport } from "@/app/report/customers/components/customer-import-handler";

import { SkeletonTable, SkeletonCards } from "./customer-list-skeleton";
import { CustomerTable, type Customer, type SortKey } from "./customer-list-table";
import { CustomerCard } from "./customer-list-card";

type ApiResponse = { ok: boolean; error?: string; customers?: Customer[] };

type CustomerListViewProps = {
  customerType: "corporate" | "individual";
  basePath: string;
  /** Show "Chọn" button for selecting active customer (KHDN needs this for mapping) */
  showSelect?: boolean;
};

export function CustomerListView({ customerType, basePath, showSelect = false }: CustomerListViewProps) {
  const { t } = useLanguage();
  const selectedCustomerId = useCustomerStore((s) => s.selectedCustomerId);
  const setSelectedCustomerId = useCustomerStore((s) => s.setSelectedCustomerId);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [importing, setImporting] = useState(false);
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"table" | "card">("table");
  const [sortKey, setSortKey] = useState<SortKey>("updatedAt");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadCustomers = useCallback(async () => {
    setLoading(true);
    setError("");
    const res = await fetch(`/api/customers?type=${customerType}`, { cache: "no-store" });
    const data = (await res.json()) as ApiResponse;
    if (!data.ok) { setError(data.error ?? t("customers.err.load")); setLoading(false); return; }
    setCustomers(data.customers ?? []);
    setLoading(false);
  }, [t, customerType]);

  useEffect(() => {
    const timer = window.setTimeout(() => { void loadCustomers(); }, 0);
    return () => window.clearTimeout(timer);
  }, [loadCustomers]);

  const filteredCustomers = useMemo(() => {
    if (!searchQuery.trim()) return customers;
    const q = searchQuery.toLowerCase();
    return customers.filter((c) =>
      c.customer_name.toLowerCase().includes(q) ||
      c.customer_code.toLowerCase().includes(q) ||
      (c.address?.toLowerCase().includes(q))
    );
  }, [customers, searchQuery]);

  const sortedCustomers = useMemo(() => {
    const list = [...filteredCustomers];
    list.sort((a, b) => {
      const av = a[sortKey] ?? "";
      const bv = b[sortKey] ?? "";
      const cmp = String(av).localeCompare(String(bv), "vi");
      return sortDir === "asc" ? cmp : -cmp;
    });
    return list;
  }, [filteredCustomers, sortKey, sortDir]);

  function handleSort(key: SortKey) {
    if (sortKey === key) setSortDir((d) => d === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("asc"); }
  }

  async function handleDelete(id: string) {
    const res = await fetch(`/api/customers/${id}`, { method: "DELETE" });
    const data = (await res.json()) as ApiResponse;
    setDeletingId(null);
    if (data.ok) { void loadCustomers(); }
    else { setError(data.error ?? "Delete failed."); }
  }

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    setError("");
    setSuccess("");
    try {
      const result = await handleCustomerImport(file);
      if ("error" in result) { setError(result.error); }
      else { setSuccess(result.success); void loadCustomers(); }
    } catch (err) {
      setError(err instanceof Error ? err.message : "File import không hợp lệ.");
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  const typeLabel = customerType === "individual" ? "Khách hàng cá nhân" : "Khách hàng doanh nghiệp";

  return (
    <section className="space-y-5">
      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl border border-violet-100 dark:border-violet-500/10 bg-gradient-to-br from-violet-50 via-white to-fuchsia-50 dark:from-violet-950/30 dark:via-[#141414] dark:to-fuchsia-950/20 p-5">
        <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-violet-200/30 blur-2xl dark:bg-violet-500/10" />
        <div className="relative flex items-start justify-between">
          <div>
            <h2 className="text-xl font-bold tracking-tight bg-gradient-to-r from-violet-700 to-fuchsia-600 dark:from-violet-400 dark:to-fuchsia-400 bg-clip-text text-transparent">
              {typeLabel}
            </h2>
            <p className="mt-1 text-sm text-zinc-500 dark:text-slate-400">{t("customers.desc")}</p>
            {showSelect && !selectedCustomerId && (
              <p className="mt-2 text-sm text-amber-600 dark:text-amber-400">
                Vui lòng bấm &quot;Chọn&quot; để chọn khách hàng trước khi sử dụng Mapping / Template.
              </p>
            )}
            {error && <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>}
            {success && <p className="mt-2 text-sm text-emerald-600 dark:text-emerald-400">{success}</p>}
          </div>
          <Link
            href={`${basePath}/new`}
            className="cursor-pointer inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-violet-600 to-fuchsia-600 px-4 py-2 text-sm font-medium text-white shadow-sm shadow-violet-500/25 transition-all duration-200 hover:shadow-md hover:shadow-violet-500/30 hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/50"
          >
            <Plus className="h-4 w-4" /> {t("customers.add")}
          </Link>
        </div>
        <div className="relative mt-4 flex gap-6 text-sm">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-100 dark:bg-violet-500/15">
              <Users className="h-4 w-4 text-violet-600 dark:text-violet-400" />
            </div>
            <div>
              <p className="text-xs text-zinc-400 dark:text-slate-500">{typeLabel}</p>
              <p className="font-semibold tabular-nums">{customers.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Search + View toggle */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400 dark:text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm theo tên, mã KH, địa chỉ..."
            className="w-full rounded-lg border border-zinc-200 dark:border-white/[0.09] bg-white dark:bg-[#1a1a1a] py-2 pl-9 pr-8 text-sm outline-none transition-colors duration-150 placeholder:text-zinc-400 dark:placeholder:text-slate-500 focus:border-violet-300 dark:focus:border-violet-500/30 focus:ring-2 focus:ring-violet-500/20"
          />
          {searchQuery && (
            <button type="button" onClick={() => setSearchQuery("")} className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-slate-300 cursor-pointer">
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center rounded-lg border border-zinc-200 dark:border-white/[0.09] p-0.5">
            <button type="button" onClick={() => setViewMode("table")} className={`cursor-pointer rounded-md p-1.5 transition-colors ${viewMode === "table" ? "bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-400" : "text-zinc-400 hover:text-zinc-600 dark:hover:text-slate-300"}`} title="Dạng bảng"><List className="h-4 w-4" /></button>
            <button type="button" onClick={() => setViewMode("card")} className={`cursor-pointer rounded-md p-1.5 transition-colors ${viewMode === "card" ? "bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-400" : "text-zinc-400 hover:text-zinc-600 dark:hover:text-slate-300"}`} title="Dạng thẻ"><LayoutGrid className="h-4 w-4" /></button>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-3">
        <button type="button" onClick={() => setExportModalOpen(true)} className="cursor-pointer inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 dark:border-white/[0.09] bg-white dark:bg-[#1a1a1a] px-3 py-2 text-sm shadow-sm transition-all duration-150 hover:border-violet-200 dark:hover:border-violet-500/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/40">
          <Download className="h-4 w-4" /> Xuất Dữ Liệu
        </button>
        <input type="file" accept=".json,.xlsx,.xls,.bk" className="hidden" ref={fileInputRef} onChange={handleImport} />
        <button type="button" onClick={() => fileInputRef.current?.click()} disabled={importing} className="cursor-pointer inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 dark:border-white/[0.09] bg-white dark:bg-[#1a1a1a] px-3 py-2 text-sm shadow-sm transition-all duration-150 hover:border-violet-200 dark:hover:border-violet-500/20 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/40">
          <Upload className="h-4 w-4" />
          {importing ? "Đang import..." : "Nhập Dữ Liệu (JSON/XLSX/BK)"}
        </button>
      </div>

      {/* Customer list */}
      {loading ? (
        viewMode === "table" ? <SkeletonTable /> : <SkeletonCards />
      ) : sortedCustomers.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-300 dark:border-white/[0.08] py-12 text-center">
          <p className="text-sm text-zinc-400 dark:text-slate-500">
            {searchQuery ? `Không tìm thấy khách hàng cho "${searchQuery}"` : t("customers.noCustomers")}
          </p>
        </div>
      ) : viewMode === "table" ? (
        <CustomerTable
          customers={sortedCustomers}
          sortKey={sortKey}
          sortDir={sortDir}
          onSort={handleSort}
          selectedCustomerId={selectedCustomerId}
          deletingId={deletingId}
          basePath={basePath}
          showSelect={showSelect}
          onSelect={(id) => setSelectedCustomerId(selectedCustomerId === id ? "" : id)}
          onDeleteRequest={(id) => setDeletingId(id)}
          onDeleteConfirm={(id) => handleDelete(id)}
          onDeleteCancel={() => setDeletingId(null)}
          t={t}
        />
      ) : (
        <div className="grid gap-3">
          {sortedCustomers.map((c, i) => (
            <CustomerCard
              key={c.id}
              customer={c}
              index={i}
              isSelected={selectedCustomerId === c.id}
              isDeleting={deletingId === c.id}
              basePath={basePath}
              showSelect={showSelect}
              onSelect={() => setSelectedCustomerId(selectedCustomerId === c.id ? "" : c.id)}
              onDeleteRequest={() => setDeletingId(c.id)}
              onDeleteConfirm={() => handleDelete(c.id)}
              onDeleteCancel={() => setDeletingId(null)}
              t={t}
            />
          ))}
        </div>
      )}

      {exportModalOpen && (
        <CustomerExportModal customers={customers} onClose={() => setExportModalOpen(false)} onError={setError} />
      )}
    </section>
  );
}
