"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { Download, Upload, X } from "lucide-react";

import { useLanguage } from "@/components/language-provider";

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
    <section className="space-y-4">
      <div className="rounded-xl border border-coral-tree-200 dark:border-white/[0.08] bg-white dark:bg-[#141414]/90 p-4">
        <h2 className="text-lg font-semibold">{t("customers.title")}</h2>
        <p className="mt-1 text-sm text-coral-tree-600 dark:text-slate-400">{t("customers.desc")}</p>
        {error ? (
          <p className="mt-2 text-sm text-red-700 dark:text-red-400">{error}</p>
        ) : null}
        {success ? (
          <p className="mt-2 text-sm text-green-700 dark:text-emerald-400">{success}</p>
        ) : null}
      </div>

      <div className="flex justify-between items-center">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={openExportModal}
            className="flex items-center gap-2 rounded-md border border-coral-tree-300 dark:border-white/[0.09] bg-white dark:bg-[#141414]/90 px-4 py-2 text-sm text-coral-tree-700 dark:text-slate-300 hover:bg-coral-tree-50 dark:hover:bg-white/[0.06]"
          >
            <Download className="h-4 w-4" />
            Tải File Cấu Hình (JSON)
          </button>

          <input
            type="file"
            accept=".json"
            className="hidden"
            ref={fileInputRef}
            onChange={handleImport}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={importing}
            className="flex items-center gap-2 rounded-md border border-coral-tree-300 dark:border-white/[0.09] bg-white dark:bg-[#141414]/90 px-4 py-2 text-sm text-coral-tree-700 dark:text-slate-300 hover:bg-coral-tree-50 dark:hover:bg-white/[0.06] disabled:opacity-50"
          >
            <Upload className="h-4 w-4" />
            {importing ? "Đang import..." : "Nạp File Cấu Hình (JSON)"}
          </button>
        </div>

        <Link
          href="/report/customers/new"
          className="rounded-md bg-coral-tree-700 px-4 py-2 text-sm text-white hover:bg-coral-tree-800"
        >
          {t("customers.add")}
        </Link>
      </div>

      <div className="rounded-xl border border-coral-tree-200 dark:border-white/[0.08] bg-white dark:bg-[#141414]/90 overflow-hidden">
        {loading ? (
          <p className="p-6 text-sm text-coral-tree-600 dark:text-slate-400">{t("customers.loading")}</p>
        ) : customers.length === 0 ? (
          <p className="p-6 text-sm text-coral-tree-600 dark:text-slate-400">{t("customers.noCustomers")}</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-coral-tree-200 dark:border-white/[0.07] bg-coral-tree-100 dark:bg-white/[0.05] text-left">
                <th className="px-4 py-2 font-semibold">{t("customers.code")}</th>
                <th className="px-4 py-2 font-semibold">{t("customers.name")}</th>
                <th className="px-4 py-2 font-semibold">{t("customers.address")}</th>
                <th className="px-4 py-2 font-semibold w-28" />
              </tr>
            </thead>
            <tbody>
              {customers.map((c) => (
                <tr key={c.id} className="border-t border-coral-tree-200 dark:border-white/[0.07] hover:bg-coral-tree-50 dark:hover:bg-white/[0.04]">
                  <td className="px-4 py-2">{c.customer_code}</td>
                  <td className="px-4 py-2">{c.customer_name}</td>
                  <td className="px-4 py-2 text-coral-tree-600 dark:text-slate-400">{c.address ?? "—"}</td>
                  <td className="px-4 py-2 flex gap-2">
                    <Link
                      href={`/report/customers/${c.id}`}
                      className="rounded border border-coral-tree-300 dark:border-white/[0.09] px-2 py-1 text-xs hover:bg-coral-tree-100 dark:hover:bg-white/[0.06]"
                    >
                      {t("customers.edit")}
                    </Link>
                    <button
                      type="button"
                      onClick={() => handleDelete(c.id)}
                      className="rounded border border-red-200 dark:border-red-500/30 px-2 py-1 text-xs text-red-700 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10"
                    >
                      {t("customers.delete")}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {exportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-3xl rounded-xl bg-white dark:bg-[#141414]/90 shadow-xl flex flex-col h-[80vh]">
            <div className="flex items-center justify-between border-b border-coral-tree-100 dark:border-white/[0.07] px-6 py-4">
              <h3 className="text-lg font-semibold text-coral-tree-800 dark:text-slate-200">Tùy chọn xuất dữ liệu</h3>
              <button
                onClick={() => setExportModalOpen(false)}
                className="rounded-md p-1.5 text-coral-tree-400 dark:text-slate-500 hover:bg-coral-tree-100 dark:hover:bg-white/[0.06] hover:text-coral-tree-700 dark:hover:text-slate-300"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-4 grid grid-cols-2 gap-8">
              {/* Cột khách hàng */}
              <div className="flex flex-col h-full border border-coral-tree-200 dark:border-white/[0.08] rounded-lg overflow-hidden">
                <div className="bg-coral-tree-100 dark:bg-white/[0.05] px-4 py-2 font-medium flex justify-between items-center border-b border-coral-tree-200 dark:border-white/[0.07]">
                  <span>Khách hàng ({selectedCustomers.size}/{customers.length})</span>
                  <button
                    onClick={() => setSelectedCustomers(selectedCustomers.size === customers.length ? new Set() : new Set(customers.map(c => c.id)))}
                    className="text-xs text-coral-tree-600 dark:text-slate-400 hover:underline"
                  >
                    {selectedCustomers.size === customers.length ? "Bỏ chọn tất cả" : "Chọn tất cả"}
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto p-2">
                  {customers.map(c => (
                    <label key={c.id} className="flex items-center gap-3 p-2 hover:bg-coral-tree-50 dark:hover:bg-white/[0.04] rounded cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedCustomers.has(c.id)}
                        onChange={(e) => {
                          const next = new Set(selectedCustomers);
                          if (e.target.checked) next.add(c.id);
                          else next.delete(c.id);
                          setSelectedCustomers(next);
                        }}
                        className="rounded border-coral-tree-300 h-4 w-4"
                      />
                      <div className="flex flex-col">
                        <span className="text-sm font-medium">{c.customer_name}</span>
                        <span className="text-xs text-coral-tree-500 dark:text-slate-400">{c.customer_code}</span>
                      </div>
                    </label>
                  ))}
                  {customers.length === 0 && <p className="text-sm text-coral-tree-500 dark:text-slate-400 text-center py-4">Không có khách hàng nào</p>}
                </div>
              </div>

              {/* Cột Mẫu (Templates) */}
              <div className="flex flex-col h-full border border-coral-tree-200 dark:border-white/[0.08] rounded-lg overflow-hidden">
                <div className="bg-coral-tree-100 dark:bg-white/[0.05] px-4 py-2 font-medium flex justify-between items-center border-b border-coral-tree-200 dark:border-white/[0.07]">
                  <span>Mẫu Dữ Liệu ({selectedTemplates.size}/{allTemplates.length})</span>
                  <button
                    onClick={() => setSelectedTemplates(selectedTemplates.size === allTemplates.length ? new Set() : new Set(allTemplates.map(t => t.id)))}
                    className="text-xs text-coral-tree-600 dark:text-slate-400 hover:underline"
                  >
                    {selectedTemplates.size === allTemplates.length ? "Bỏ chọn tất cả" : "Chọn tất cả"}
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto p-2">
                  {allTemplates.map(t => (
                    <label key={t.id} className="flex items-center gap-3 p-2 hover:bg-coral-tree-50 dark:hover:bg-white/[0.04] rounded cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedTemplates.has(t.id)}
                        onChange={(e) => {
                          const next = new Set(selectedTemplates);
                          if (e.target.checked) next.add(t.id);
                          else next.delete(t.id);
                          setSelectedTemplates(next);
                        }}
                        className="rounded border-coral-tree-300 h-4 w-4"
                      />
                      <span className="text-sm">{t.name}</span>
                    </label>
                  ))}
                  {allTemplates.length === 0 && <p className="text-sm text-coral-tree-500 dark:text-slate-400 text-center py-4">Chưa có mẫu nào</p>}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 border-t border-coral-tree-100 dark:border-white/[0.07] p-6">
              <button
                onClick={() => setExportModalOpen(false)}
                className="rounded-md px-4 py-2 text-sm font-medium text-coral-tree-600 dark:text-slate-400 hover:bg-coral-tree-100 dark:hover:bg-white/[0.06]"
              >
                Hủy
              </button>
              <button
                onClick={handleExport}
                disabled={exporting || (selectedCustomers.size === 0 && selectedTemplates.size === 0)}
                className="flex items-center gap-2 rounded-md bg-coral-tree-700 px-6 py-2 text-sm font-medium text-white shadow-sm hover:bg-coral-tree-800 disabled:opacity-50"
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
