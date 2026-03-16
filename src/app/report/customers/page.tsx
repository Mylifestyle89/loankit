"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowRight, Check, Download, Plus, Trash2, Upload, Users } from "lucide-react";

import { useLanguage } from "@/components/language-provider";
import { useCustomerStore } from "@/stores/use-customer-store";

import { CustomerExportModal } from "./components/customer-export-modal";

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

type ApiResponse = {
  ok: boolean;
  error?: string;
  customers?: Customer[];
};

type ImportResult = {
  customers: number;
  templates: number;
  loans?: number;
  disbursements?: number;
  invoices?: number;
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
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [typeFilter, setTypeFilter] = useState<"all" | "corporate" | "individual">("all");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadCustomers = useCallback(async () => {
    setLoading(true);
    setError("");
    const url = typeFilter === "all" ? "/api/customers" : `/api/customers?type=${typeFilter}`;
    const res = await fetch(url, { cache: "no-store" });
    const data = (await res.json()) as ApiResponse;
    if (!data.ok) {
      setError(data.error ?? t("customers.err.load"));
      setLoading(false);
      return;
    }
    setCustomers(data.customers ?? []);
    setLoading(false);
  }, [t, typeFilter]);

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

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    setError("");
    setSuccess("");
    try {
      const isBk = file.name.endsWith(".bk");
      const isXlsx = file.name.endsWith(".xlsx") || file.name.endsWith(".xls");

      if (isBk) {
        // .BK: parse all clients → save each
        const formData = new FormData();
        formData.append("bkFile", file);
        const bkRes = await fetch("/api/report/import/bk", { method: "POST", body: formData });
        const bkData = (await bkRes.json()) as {
          status: string; message?: string;
          clients?: { status: string; values: Record<string, unknown>; assetGroups?: Record<string, Record<string, string>[]> }[];
          totalClients?: number;
        };
        if (bkData.status === "error") throw new Error(bkData.message || "Import .bk failed");

        const clientList = (bkData.clients ?? []).filter((c) => c.status !== "error");

        if (clientList.length === 0) throw new Error("Không tìm thấy khách hàng hợp lệ trong file .bk");

        let created = 0;
        let updated = 0;
        const errors: string[] = [];
        const names: string[] = [];

        for (const client of clientList) {
          const name = (client.values?.["A.general.customer_name"] as string) || "Không rõ tên";
          try {
            const saveRes = await fetch("/api/customers/from-draft", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ values: client.values, assetGroups: client.assetGroups }),
            });
            const saveData = (await saveRes.json()) as { ok: boolean; error?: string; created?: boolean };
            if (!saveData.ok) {
              errors.push(saveData.error || "Lưu thất bại");
              continue;
            }
            if (saveData.created) created++; else updated++;
            names.push(name);
          } catch {
            errors.push(`Lỗi lưu khách hàng`);
          }
        }

        const parts: string[] = [];
        if (created > 0) parts.push(`tạo mới ${created}`);
        if (updated > 0) parts.push(`cập nhật ${updated}`);
        if (errors.length > 0) parts.push(`${errors.length} lỗi`);
        const nameInfo = names.length <= 5 ? `: ${names.join(", ")}` : "";
        setSuccess(`Import .bk: ${parts.join(", ")} (tổng ${clientList.length} khách hàng${nameInfo}).`);
      } else {
        let res: Response;
        if (isXlsx) {
          const formData = new FormData();
          formData.append("file", file);
          res = await fetch("/api/report/import-data", { method: "POST", body: formData });
        } else {
          const text = await file.text();
          const parsed = JSON.parse(text);
          res = await fetch("/api/report/import-data", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(parsed),
          });
        }

        const data = (await res.json()) as { ok: boolean; error?: string; imported?: ImportResult };
        if (!data.ok) throw new Error(data.error || "Import failed");

        const imp = data.imported!;
        const parts = [`${imp.customers} khách hàng`, `${imp.templates} mẫu dữ liệu`];
        if (imp.loans) parts.push(`${imp.loans} khoản vay`);
        if (imp.disbursements) parts.push(`${imp.disbursements} giải ngân`);
        if (imp.invoices) parts.push(`${imp.invoices} hoá đơn`);
        setSuccess(`Đã import thành công: ${parts.join(", ")}.`);
      }
      void loadCustomers();
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
            className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-violet-600 to-fuchsia-600 px-4 py-2 text-sm font-medium text-white shadow-sm shadow-violet-500/25 transition-all duration-200 hover:shadow-md hover:shadow-violet-500/30 hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/50"
          >
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
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors duration-150 ${
              typeFilter === tab.key
                ? "bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-400"
                : "text-zinc-500 dark:text-slate-400 hover:bg-zinc-100 dark:hover:bg-white/[0.06]"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => setExportModalOpen(true)}
          className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 dark:border-white/[0.09] bg-white dark:bg-[#1a1a1a] px-3 py-2 text-sm shadow-sm transition-all duration-150 hover:border-violet-200 dark:hover:border-violet-500/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/40"
        >
          <Download className="h-4 w-4" />
          Xuất Dữ Liệu
        </button>

        <input type="file" accept=".json,.xlsx,.xls,.bk" className="hidden" ref={fileInputRef} onChange={handleImport} />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={importing}
          className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 dark:border-white/[0.09] bg-white dark:bg-[#1a1a1a] px-3 py-2 text-sm shadow-sm transition-all duration-150 hover:border-violet-200 dark:hover:border-violet-500/20 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/40"
        >
          <Upload className="h-4 w-4" />
          {importing ? "Đang import..." : "Nhập Dữ Liệu (JSON/XLSX/BK)"}
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
            <div
              key={c.id}
              className={`group relative rounded-xl border bg-white dark:bg-[#161616] p-4 shadow-sm transition-all duration-200 hover:shadow-md ${
                selectedCustomerId === c.id
                  ? "border-violet-400 dark:border-violet-500/40 ring-1 ring-violet-300 dark:ring-violet-500/20"
                  : "border-zinc-200 dark:border-white/[0.07] hover:border-violet-200 dark:hover:border-violet-500/20"
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2.5">
                    <h3 className="truncate font-semibold text-zinc-900 dark:text-white">{c.customer_name}</h3>
                    <span className="inline-flex items-center rounded-full bg-violet-50 dark:bg-violet-500/10 px-2 py-0.5 text-xs font-medium text-violet-700 dark:text-violet-400 ring-1 ring-violet-500/20">
                      {c.customer_code}
                    </span>
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ${
                      c.customer_type === "individual"
                        ? "bg-emerald-50 text-emerald-700 ring-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-400"
                        : "bg-blue-50 text-blue-700 ring-blue-500/20 dark:bg-blue-500/10 dark:text-blue-400"
                    }`}>
                      {c.customer_type === "individual" ? "Cá nhân" : "DN"}
                    </span>
                  </div>
                  <p className="mt-0.5 text-sm text-zinc-500 dark:text-slate-400">{c.address ?? "—"}</p>
                </div>
              </div>

              {/* Actions */}
              <div className="mt-3 flex items-center gap-2 border-t border-zinc-100 dark:border-white/[0.05] pt-3">
                <Link
                  href={`/report/customers/${c.id}`}
                  className="inline-flex items-center gap-1 rounded-lg bg-violet-50 dark:bg-violet-500/10 px-3 py-1.5 text-xs font-medium text-violet-700 dark:text-violet-400 transition-colors duration-150 hover:bg-violet-100 dark:hover:bg-violet-500/20"
                >
                  {t("customers.edit")}
                  <ArrowRight className="h-3 w-3" />
                </Link>
                <button
                  type="button"
                  onClick={() => setSelectedCustomerId(selectedCustomerId === c.id ? "" : c.id)}
                  className={`inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors duration-150 ${
                    selectedCustomerId === c.id
                      ? "bg-violet-600 text-white hover:bg-violet-700"
                      : "bg-zinc-100 dark:bg-white/[0.06] text-zinc-600 dark:text-slate-400 hover:bg-violet-50 dark:hover:bg-violet-500/10 hover:text-violet-700 dark:hover:text-violet-400"
                  }`}
                >
                  {selectedCustomerId === c.id ? <><Check className="h-3 w-3" /> Đang chọn</> : "Chọn KH"}
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(c.id)}
                  className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs text-zinc-500 dark:text-slate-400 transition-colors duration-150 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10 dark:hover:text-red-400"
                >
                  <Trash2 className="h-3 w-3" />
                  {t("customers.delete")}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Export Modal */}
      {exportModalOpen && (
        <CustomerExportModal
          customers={customers}
          onClose={() => setExportModalOpen(false)}
          onError={setError}
        />
      )}
    </section>
  );
}
