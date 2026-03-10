"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowRight, Check, Download, Plus, Trash2, Upload, Users, X } from "lucide-react";

import { useLanguage } from "@/components/language-provider";
import { useCustomerStore } from "@/stores/use-customer-store";

type Customer = {
  id: string;
  customer_code: string;
  customer_name: string;
  address: string | null;
  main_business: string | null;
  charter_capital: number | null;
  legal_representative_name: string | null;
  legal_representative_title: string | null;
  organization_type: string | null;
  updatedAt: string;
};

type ApiResponse = {
  ok: boolean;
  error?: string;
  customers?: Customer[];
};

export default function CustomersPage() {
  const { t } = useLanguage();
  const selectedCustomerId = useCustomerStore((s) => s.selectedCustomerId);
  const setSelectedCustomerId = useCustomerStore((s) => s.setSelectedCustomerId);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Thêm state cho tính năng Export Modal
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [allTemplates, setAllTemplates] = useState<{ id: string; name: string }[]>([]);
  const [selectedCustomers, setSelectedCustomers] = useState<Set<string>>(new Set());
  const [selectedTemplates, setSelectedTemplates] = useState<Set<string>>(new Set());

  const loadCustomers = useCallback(async () => {
    setLoading(true);
    setError("");
    const res = await fetch("/api/customers", { cache: "no-store" });
    const data = (await res.json()) as ApiResponse;
    if (!data.ok) {
      setError(data.error ?? t("customers.err.load"));
      setLoading(false);
      return;
    }
    setCustomers(data.customers ?? []);
    setLoading(false);
  }, [t]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadCustomers();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [loadCustomers]);

  async function handleDelete(id: string) {
    if (!confirm(t("customers.deleteConfirm"))) return;
    const res = await fetch(`/api/customers/${id}`, { method: "DELETE" });
    const data = (await res.json()) as ApiResponse;
    if (data.ok) {
      void loadCustomers();
    } else {
      setError(data.error ?? "Delete failed.");
    }
  }

  async function openExportModal() {
    setExportModalOpen(true);
    setSelectedCustomers(new Set(customers.map(c => c.id)));
    try {
      const res = await fetch("/api/report/field-templates");
      const data = (await res.json()) as {
        ok?: boolean;
        field_templates?: Array<{ id: string; name: string }>;
      };
      if (data.ok) {
        setAllTemplates(data.field_templates || []);
        setSelectedTemplates(new Set((data.field_templates || []).map((t) => t.id)));
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không thể tải danh sách template.");
    }
  }

  async function handleExport() {
    setExporting(true);
    setError("");
    try {
      const res = await fetch("/api/report/export-data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerIds: Array.from(selectedCustomers),
          templateIds: Array.from(selectedTemplates)
        })
      });
      if (!res.ok) throw new Error("Tải file thất bại");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `data_export_${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setExportModalOpen(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Xuất dữ liệu lỗi");
    } finally {
      setExporting(false);
    }
  }

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    setError("");
    setSuccess("");
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);

      const res = await fetch("/api/report/import-data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed),
      });

      const data = await res.json();
      if (!data.ok) {
        throw new Error(data.error || "Import failed");
      }

      setSuccess(`Đã import thành công ${data.imported.customers} khách hàng và ${data.imported.templates} mẫu dữ liệu.`);
      void loadCustomers();
    } catch (err) {
      setError(err instanceof Error ? err.message : "File import không hợp lệ.");
    } finally {
      setImporting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }

  return (
    <section className="space-y-5">
      {/* Header with gradient accent */}
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
          <Link href="/report/customers/new"
            className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-violet-600 to-fuchsia-600 px-4 py-2 text-sm font-medium text-white shadow-sm shadow-violet-500/25 transition-all duration-200 hover:shadow-md hover:shadow-violet-500/30 hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/50">
            <Plus className="h-4 w-4" />
            {t("customers.add")}
          </Link>
        </div>

        {/* Quick stats */}
        <div className="relative mt-4 flex gap-6 text-sm">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-100 dark:bg-violet-500/15">
              <Users className="h-4 w-4 text-violet-600 dark:text-violet-400" />
            </div>
            <div>
              <p className="text-xs text-zinc-400 dark:text-slate-500">{t("customers.title")}</p>
              <p className="font-semibold tabular-nums">{customers.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-3">
        <button type="button" onClick={openExportModal}
          className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 dark:border-white/[0.09] bg-white dark:bg-[#1a1a1a] px-3 py-2 text-sm shadow-sm transition-all duration-150 hover:border-violet-200 dark:hover:border-violet-500/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/40">
          <Download className="h-4 w-4" />
          Tải File Cấu Hình (JSON)
        </button>

        <input type="file" accept=".json" className="hidden" ref={fileInputRef} onChange={handleImport} />
        <button type="button" onClick={() => fileInputRef.current?.click()} disabled={importing}
          className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 dark:border-white/[0.09] bg-white dark:bg-[#1a1a1a] px-3 py-2 text-sm shadow-sm transition-all duration-150 hover:border-violet-200 dark:hover:border-violet-500/20 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/40">
          <Upload className="h-4 w-4" />
          {importing ? "Đang import..." : "Nạp File Cấu Hình (JSON)"}
        </button>
      </div>

      {/* Customer cards */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-violet-200 border-t-violet-600 dark:border-violet-800 dark:border-t-violet-400" />
        </div>
      ) : customers.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-300 dark:border-white/[0.08] py-12 text-center">
          <p className="text-sm text-zinc-400 dark:text-slate-500">{t("customers.noCustomers")}</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {customers.map((c) => (
            <div key={c.id}
              className={`group relative rounded-xl border bg-white dark:bg-[#161616] p-4 shadow-sm transition-all duration-200 hover:shadow-md ${
                selectedCustomerId === c.id
                  ? "border-violet-400 dark:border-violet-500/40 ring-1 ring-violet-300 dark:ring-violet-500/20"
                  : "border-zinc-200 dark:border-white/[0.07] hover:border-violet-200 dark:hover:border-violet-500/20"
              }`}>
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2.5">
                    <h3 className="truncate font-semibold text-zinc-900 dark:text-white">{c.customer_name}</h3>
                    <span className="inline-flex items-center rounded-full bg-violet-50 dark:bg-violet-500/10 px-2 py-0.5 text-xs font-medium text-violet-700 dark:text-violet-400 ring-1 ring-violet-500/20">
                      {c.customer_code}
                    </span>
                  </div>
                  <p className="mt-0.5 text-sm text-zinc-500 dark:text-slate-400">{c.address ?? "—"}</p>
                </div>
              </div>

              {/* Actions */}
              <div className="mt-3 flex items-center gap-2 border-t border-zinc-100 dark:border-white/[0.05] pt-3">
                <Link href={`/report/customers/${c.id}`}
                  className="inline-flex items-center gap-1 rounded-lg bg-violet-50 dark:bg-violet-500/10 px-3 py-1.5 text-xs font-medium text-violet-700 dark:text-violet-400 transition-colors duration-150 hover:bg-violet-100 dark:hover:bg-violet-500/20">
                  {t("customers.edit")}
                  <ArrowRight className="h-3 w-3" />
                </Link>
                <button type="button"
                  onClick={() => setSelectedCustomerId(selectedCustomerId === c.id ? "" : c.id)}
                  className={`inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors duration-150 ${
                    selectedCustomerId === c.id
                      ? "bg-violet-600 text-white hover:bg-violet-700"
                      : "bg-zinc-100 dark:bg-white/[0.06] text-zinc-600 dark:text-slate-400 hover:bg-violet-50 dark:hover:bg-violet-500/10 hover:text-violet-700 dark:hover:text-violet-400"
                  }`}>
                  {selectedCustomerId === c.id ? <><Check className="h-3 w-3" /> Đang chọn</> : "Chọn KH"}
                </button>
                <button type="button" onClick={() => handleDelete(c.id)}
                  className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs text-zinc-500 dark:text-slate-400 transition-colors duration-150 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10 dark:hover:text-red-400">
                  <Trash2 className="h-3 w-3" />
                  {t("customers.delete")}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {exportModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-[95vw] md:max-w-3xl rounded-2xl bg-white dark:bg-[#161616] shadow-xl flex flex-col h-[80vh]">
            <div className="flex items-center justify-between border-b border-zinc-100 dark:border-white/[0.07] px-6 py-4">
              <h3 className="text-lg font-semibold bg-gradient-to-r from-violet-700 to-fuchsia-600 dark:from-violet-400 dark:to-fuchsia-400 bg-clip-text text-transparent">Tùy chọn xuất dữ liệu</h3>
              <button
                onClick={() => setExportModalOpen(false)}
                className="rounded-lg p-1.5 text-zinc-400 dark:text-slate-500 hover:bg-zinc-100 dark:hover:bg-white/[0.06] hover:text-zinc-700 dark:hover:text-slate-300 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-4 grid grid-cols-2 gap-8">
              {/* Cột khách hàng */}
              <div className="flex flex-col h-full border border-zinc-200 dark:border-white/[0.08] rounded-xl overflow-hidden">
                <div className="bg-violet-50 dark:bg-violet-500/5 px-4 py-2 font-medium flex justify-between items-center border-b border-zinc-200 dark:border-white/[0.07]">
                  <span>Khách hàng ({selectedCustomers.size}/{customers.length})</span>
                  <button
                    onClick={() => setSelectedCustomers(selectedCustomers.size === customers.length ? new Set() : new Set(customers.map(c => c.id)))}
                    className="text-xs text-violet-600 dark:text-violet-400 hover:underline"
                  >
                    {selectedCustomers.size === customers.length ? "Bỏ chọn tất cả" : "Chọn tất cả"}
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto p-2">
                  {customers.map(c => (
                    <label key={c.id} className="flex items-center gap-3 p-2 hover:bg-violet-50 dark:hover:bg-white/[0.04] rounded-lg cursor-pointer transition-colors">
                      <input
                        type="checkbox"
                        checked={selectedCustomers.has(c.id)}
                        onChange={(e) => {
                          const next = new Set(selectedCustomers);
                          if (e.target.checked) next.add(c.id);
                          else next.delete(c.id);
                          setSelectedCustomers(next);
                        }}
                        className="rounded border-zinc-300 h-4 w-4 text-violet-600 focus:ring-violet-500/40"
                      />
                      <div className="flex flex-col">
                        <span className="text-sm font-medium">{c.customer_name}</span>
                        <span className="text-xs text-zinc-500 dark:text-slate-400">{c.customer_code}</span>
                      </div>
                    </label>
                  ))}
                  {customers.length === 0 && <p className="text-sm text-zinc-400 dark:text-slate-500 text-center py-4">Không có khách hàng nào</p>}
                </div>
              </div>

              {/* Cột Mẫu (Templates) */}
              <div className="flex flex-col h-full border border-zinc-200 dark:border-white/[0.08] rounded-xl overflow-hidden">
                <div className="bg-violet-50 dark:bg-violet-500/5 px-4 py-2 font-medium flex justify-between items-center border-b border-zinc-200 dark:border-white/[0.07]">
                  <span>Mẫu Dữ Liệu ({selectedTemplates.size}/{allTemplates.length})</span>
                  <button
                    onClick={() => setSelectedTemplates(selectedTemplates.size === allTemplates.length ? new Set() : new Set(allTemplates.map(t => t.id)))}
                    className="text-xs text-violet-600 dark:text-violet-400 hover:underline"
                  >
                    {selectedTemplates.size === allTemplates.length ? "Bỏ chọn tất cả" : "Chọn tất cả"}
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto p-2">
                  {allTemplates.map(t => (
                    <label key={t.id} className="flex items-center gap-3 p-2 hover:bg-violet-50 dark:hover:bg-white/[0.04] rounded-lg cursor-pointer transition-colors">
                      <input
                        type="checkbox"
                        checked={selectedTemplates.has(t.id)}
                        onChange={(e) => {
                          const next = new Set(selectedTemplates);
                          if (e.target.checked) next.add(t.id);
                          else next.delete(t.id);
                          setSelectedTemplates(next);
                        }}
                        className="rounded border-zinc-300 h-4 w-4 text-violet-600 focus:ring-violet-500/40"
                      />
                      <span className="text-sm">{t.name}</span>
                    </label>
                  ))}
                  {allTemplates.length === 0 && <p className="text-sm text-zinc-400 dark:text-slate-500 text-center py-4">Chưa có mẫu nào</p>}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 border-t border-zinc-100 dark:border-white/[0.07] p-6">
              <button
                onClick={() => setExportModalOpen(false)}
                className="rounded-lg px-4 py-2 text-sm font-medium text-zinc-600 dark:text-slate-400 hover:bg-zinc-100 dark:hover:bg-white/[0.06] transition-colors"
              >
                Hủy
              </button>
              <button
                onClick={handleExport}
                disabled={exporting || (selectedCustomers.size === 0 && selectedTemplates.size === 0)}
                className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-violet-600 to-fuchsia-600 px-6 py-2 text-sm font-medium text-white shadow-sm shadow-violet-500/25 hover:shadow-md hover:shadow-violet-500/30 hover:brightness-110 disabled:opacity-50 transition-all duration-200"
              >
                {exporting ? "Đang xử lý..." : "Xuất File"}
                <Download className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
