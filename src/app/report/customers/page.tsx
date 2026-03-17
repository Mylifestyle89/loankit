"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, Check, Download, Plus, Search, Trash2, Upload, Users, X } from "lucide-react";

import { useLanguage } from "@/components/language-provider";
import { useCustomerStore } from "@/stores/use-customer-store";

import { CustomerExportModal } from "./components/customer-export-modal";
import { handleCustomerImport } from "./components/customer-import-handler";

type Customer = {
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
};

type ApiResponse = { ok: boolean; error?: string; customers?: Customer[] };

export default function CustomersPage() {
  const { t } = useLanguage();
  const selectedCustomerId = useCustomerStore((s) => s.selectedCustomerId);
  const setSelectedCustomerId = useCustomerStore((s) => s.setSelectedCustomerId);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [importing, setImporting] = useState(false);
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [typeFilter, setTypeFilter] = useState<"all" | "corporate" | "individual">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadCustomers = useCallback(async () => {
    setLoading(true);
    setError("");
    const url = typeFilter === "all" ? "/api/customers" : `/api/customers?type=${typeFilter}`;
    const res = await fetch(url, { cache: "no-store" });
    const data = (await res.json()) as ApiResponse;
    if (!data.ok) { setError(data.error ?? t("customers.err.load")); setLoading(false); return; }
    setCustomers(data.customers ?? []);
    setLoading(false);
  }, [t, typeFilter]);

  useEffect(() => {
    const timer = window.setTimeout(() => { void loadCustomers(); }, 0);
    return () => window.clearTimeout(timer);
  }, [loadCustomers]);

  /* Client-side search filter */
  const filteredCustomers = useMemo(() => {
    if (!searchQuery.trim()) return customers;
    const q = searchQuery.toLowerCase();
    return customers.filter((c) =>
      c.customer_name.toLowerCase().includes(q) ||
      c.customer_code.toLowerCase().includes(q) ||
      (c.address?.toLowerCase().includes(q))
    );
  }, [customers, searchQuery]);

  /** Toggle customer type between corporate ↔ individual */
  async function handleToggleType(id: string, currentType: string) {
    const newType = currentType === "individual" ? "corporate" : "individual";
    try {
      const res = await fetch(`/api/customers/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customer_type: newType }),
      });
      const data = (await res.json()) as ApiResponse;
      if (data.ok) {
        setCustomers((prev) => prev.map((c) => c.id === id ? { ...c, customer_type: newType } : c));
      } else {
        setError(data.error ?? "Đổi loại KH thất bại.");
      }
    } catch {
      setError("Lỗi kết nối khi đổi loại KH.");
    }
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

  return (
    <section className="space-y-5">
      {/* Header */}
      <CustomerHeader t={t} error={error} success={success} customerCount={customers.length} />

      {/* Search + Filter bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {/* Search */}
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

        {/* Type filter tabs */}
        <div className="flex items-center gap-2">
          {([
            { key: "all", label: "Tất cả" },
            { key: "corporate", label: "Doanh nghiệp" },
            { key: "individual", label: "Cá nhân" },
          ] as const).map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setTypeFilter(tab.key)}
              className={`cursor-pointer rounded-lg px-3 py-1.5 text-sm font-medium transition-colors duration-150 ${
                typeFilter === tab.key
                  ? "bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-400"
                  : "text-zinc-500 dark:text-slate-400 hover:bg-zinc-100 dark:hover:bg-white/[0.06]"
              }`}
            >
              {tab.label}
            </button>
          ))}
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
        <SkeletonCards />
      ) : filteredCustomers.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-300 dark:border-white/[0.08] py-12 text-center">
          <p className="text-sm text-zinc-400 dark:text-slate-500">
            {searchQuery ? `Không tìm thấy khách hàng cho "${searchQuery}"` : t("customers.noCustomers")}
          </p>
        </div>
      ) : (
        <div className="grid gap-3">
          {filteredCustomers.map((c, i) => (
            <CustomerCard
              key={c.id}
              customer={c}
              index={i}
              isSelected={selectedCustomerId === c.id}
              isDeleting={deletingId === c.id}
              onSelect={() => setSelectedCustomerId(selectedCustomerId === c.id ? "" : c.id)}
              onToggleType={() => handleToggleType(c.id, c.customer_type)}
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

/* ── Header sub-component ── */
function CustomerHeader({ t, error, success, customerCount }: {
  t: (k: string) => string; error: string; success: string; customerCount: number;
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-violet-100 dark:border-violet-500/10 bg-gradient-to-br from-violet-50 via-white to-fuchsia-50 dark:from-violet-950/30 dark:via-[#141414] dark:to-fuchsia-950/20 p-5">
      <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-violet-200/30 blur-2xl dark:bg-violet-500/10" />
      <div className="relative flex items-start justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight bg-gradient-to-r from-violet-700 to-fuchsia-600 dark:from-violet-400 dark:to-fuchsia-400 bg-clip-text text-transparent">
            {t("customers.title")}
          </h2>
          <p className="mt-1 text-sm text-zinc-500 dark:text-slate-400">{t("customers.desc")}</p>
          {error && <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>}
          {success && <p className="mt-2 text-sm text-emerald-600 dark:text-emerald-400">{success}</p>}
        </div>
        <Link
          href="/report/customers/new"
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
            <p className="text-xs text-zinc-400 dark:text-slate-500">{t("customers.title")}</p>
            <p className="font-semibold tabular-nums">{customerCount}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Skeleton loading cards ── */
function SkeletonCards() {
  return (
    <div className="grid gap-3">
      {[0, 1, 2].map((i) => (
        <div key={i} className="rounded-xl border border-zinc-200 dark:border-white/[0.07] bg-white dark:bg-[#161616] p-4 animate-pulse" style={{ animationDelay: `${i * 100}ms` }}>
          <div className="flex items-center gap-2.5">
            <div className="h-5 w-40 rounded bg-zinc-200 dark:bg-white/[0.08]" />
            <div className="h-5 w-16 rounded-full bg-violet-100 dark:bg-violet-500/10" />
            <div className="h-5 w-12 rounded-full bg-zinc-100 dark:bg-white/[0.06]" />
          </div>
          <div className="mt-2 h-4 w-64 rounded bg-zinc-100 dark:bg-white/[0.05]" />
          <div className="mt-3 border-t border-zinc-100 dark:border-white/[0.05] pt-3 flex gap-2">
            <div className="h-7 w-20 rounded-lg bg-zinc-100 dark:bg-white/[0.06]" />
            <div className="h-7 w-16 rounded-lg bg-zinc-100 dark:bg-white/[0.06]" />
          </div>
        </div>
      ))}
    </div>
  );
}

/* ── Customer card with stagger animation + inline delete confirm ── */
function CustomerCard({ customer: c, index, isSelected, isDeleting, onSelect, onToggleType, onDeleteRequest, onDeleteConfirm, onDeleteCancel, t }: {
  customer: Customer;
  index: number;
  isSelected: boolean;
  isDeleting: boolean;
  onSelect: () => void;
  onToggleType: () => void;
  onDeleteRequest: () => void;
  onDeleteConfirm: () => void;
  onDeleteCancel: () => void;
  t: (k: string) => string;
}) {
  return (
    <div
      className={`group relative rounded-xl border bg-white dark:bg-[#161616] p-4 shadow-sm transition-all duration-200 hover:shadow-md animate-[fadeSlideIn_0.3s_ease-out_both] ${
        isSelected
          ? "border-violet-400 dark:border-violet-500/40 ring-1 ring-violet-300 dark:ring-violet-500/20"
          : "border-zinc-200 dark:border-white/[0.07] hover:border-violet-200 dark:hover:border-violet-500/20"
      }`}
      style={{ animationDelay: `${index * 50}ms` }}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2.5">
            <h3 className="truncate font-semibold text-zinc-900 dark:text-white">{c.customer_name}</h3>
            <span className="inline-flex items-center rounded-full bg-violet-50 dark:bg-violet-500/10 px-2 py-0.5 text-xs font-medium text-violet-700 dark:text-violet-400 ring-1 ring-violet-500/20">
              {c.customer_code}
            </span>
            <button
              type="button"
              onClick={onToggleType}
              title={`Nhấn để đổi sang ${c.customer_type === "individual" ? "Doanh nghiệp" : "Cá nhân"}`}
              className={`cursor-pointer inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-medium ring-1 transition-all duration-150 hover:ring-2 ${
                c.customer_type === "individual"
                  ? "bg-emerald-50 text-emerald-700 ring-emerald-500/20 hover:ring-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-400"
                  : "bg-blue-50 text-blue-700 ring-blue-500/20 hover:ring-blue-500/40 dark:bg-blue-500/10 dark:text-blue-400"
              }`}
            >
              {c.customer_type === "individual" ? "Cá nhân" : "Doanh nghiệp"}
              <svg className="h-3 w-3 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" /></svg>
            </button>
          </div>
          <p className="mt-0.5 text-sm text-zinc-500 dark:text-slate-400">{c.address ?? "—"}</p>
        </div>
      </div>

      {/* Actions */}
      <div className="mt-3 flex items-center gap-2 border-t border-zinc-100 dark:border-white/[0.05] pt-3">
        <Link
          href={`/report/customers/${c.id}`}
          className="cursor-pointer inline-flex items-center gap-1 rounded-lg bg-violet-50 dark:bg-violet-500/10 px-3 py-1.5 text-xs font-medium text-violet-700 dark:text-violet-400 transition-colors duration-150 hover:bg-violet-100 dark:hover:bg-violet-500/20"
        >
          {t("customers.edit")} <ArrowRight className="h-3 w-3" />
        </Link>
        <button
          type="button"
          onClick={onSelect}
          className={`cursor-pointer inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors duration-150 ${
            isSelected
              ? "bg-violet-600 text-white hover:bg-violet-700"
              : "bg-zinc-100 dark:bg-white/[0.06] text-zinc-600 dark:text-slate-400 hover:bg-violet-50 dark:hover:bg-violet-500/10 hover:text-violet-700 dark:hover:text-violet-400"
          }`}
        >
          {isSelected ? <><Check className="h-3 w-3" /> Đang chọn</> : "Chọn KH"}
        </button>

        {/* Delete with inline confirmation */}
        {isDeleting ? (
          <span className="inline-flex items-center gap-1.5 text-xs">
            <span className="text-red-600 dark:text-red-400 font-medium">Xác nhận xoá?</span>
            <button type="button" onClick={onDeleteConfirm} className="cursor-pointer rounded-lg bg-red-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-red-700 transition-colors duration-150">
              Xoá
            </button>
            <button type="button" onClick={onDeleteCancel} className="cursor-pointer rounded-lg bg-zinc-100 dark:bg-white/[0.06] px-2.5 py-1 text-xs font-medium text-zinc-600 dark:text-slate-400 hover:bg-zinc-200 dark:hover:bg-white/[0.1] transition-colors duration-150">
              Huỷ
            </button>
          </span>
        ) : (
          <button
            type="button"
            onClick={onDeleteRequest}
            className="cursor-pointer inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs text-zinc-500 dark:text-slate-400 transition-colors duration-150 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10 dark:hover:text-red-400"
          >
            <Trash2 className="h-3 w-3" /> {t("customers.delete")}
          </button>
        )}
      </div>
    </div>
  );
}
