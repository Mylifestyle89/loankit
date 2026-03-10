"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { useLanguage } from "@/components/language-provider";

import { CustomerSummaryCards } from "./components/customer-summary-cards";
import { CustomerLoansSection } from "./components/customer-loans-section";
import { CustomerTemplatesSection } from "./components/customer-templates-section";

/* eslint-disable @typescript-eslint/no-explicit-any */
type FullCustomer = {
  id: string;
  customer_code: string;
  customer_name: string;
  address: string | null;
  main_business: string | null;
  charter_capital: number | null;
  legal_representative_name: string | null;
  legal_representative_title: string | null;
  organization_type: string | null;
  loans: any[];
  mapping_instances: any[];
  summary: {
    totalLoans: number;
    activeLoans: number;
    totalLoanAmount: number;
    totalDisbursements: number;
    totalDisbursedAmount: number;
    totalInvoices: number;
    totalInvoiceAmount: number;
    overdueInvoices: number;
    totalMappingInstances: number;
  };
};

const inputCls =
  "mt-1 w-full rounded-md border border-zinc-200 dark:border-white/[0.09] bg-white dark:bg-[#1a1a1a] text-zinc-900 dark:text-slate-100 px-3 py-2 shadow-sm transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/40";

const tabs = [
  { key: "info", label: "Thông tin" },
  { key: "loans", label: "Khoản vay" },
  { key: "templates", label: "Templates" },
] as const;

type TabKey = (typeof tabs)[number]["key"];

export default function EditCustomerPage() {
  const { t } = useLanguage();
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<TabKey>("info");
  const [customer, setCustomer] = useState<FullCustomer | null>(null);
  const [form, setForm] = useState({
    customer_code: "",
    customer_name: "",
    address: "",
    main_business: "",
    charter_capital: "" as string | number,
    legal_representative_name: "",
    legal_representative_title: "",
    organization_type: "",
  });

  const loadCustomer = useCallback(async () => {
    setLoading(true);
    setError("");
    const res = await fetch(`/api/customers/${id}?full=true`, { cache: "no-store" });
    const data = (await res.json()) as { ok: boolean; error?: string; customer?: FullCustomer };
    if (!data.ok || !data.customer) {
      setError(data.error ?? "Not found.");
      setLoading(false);
      return;
    }
    const c = data.customer;
    setCustomer(c);
    setForm({
      customer_code: c.customer_code,
      customer_name: c.customer_name,
      address: c.address ?? "",
      main_business: c.main_business ?? "",
      charter_capital: c.charter_capital ?? "",
      legal_representative_name: c.legal_representative_name ?? "",
      legal_representative_title: c.legal_representative_title ?? "",
      organization_type: c.organization_type ?? "",
    });
    setLoading(false);
  }, [id]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadCustomer();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [loadCustomer]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSaving(true);
    const capital =
      form.charter_capital === ""
        ? null
        : Number(String(form.charter_capital).replace(/\./g, "").replace(",", "."));
    const res = await fetch(`/api/customers/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        customer_code: form.customer_code.trim(),
        customer_name: form.customer_name.trim(),
        address: form.address.trim() || null,
        main_business: form.main_business.trim() || null,
        charter_capital: Number.isFinite(capital) ? capital : null,
        legal_representative_name: form.legal_representative_name.trim() || null,
        legal_representative_title: form.legal_representative_title.trim() || null,
        organization_type: form.organization_type.trim() || null,
      }),
    });
    const data = (await res.json()) as { ok: boolean; error?: string };
    setSaving(false);
    if (!data.ok) {
      setError(data.error ?? "Failed to update.");
      return;
    }
    router.push("/report/customers");
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-violet-200 border-t-violet-600 dark:border-violet-800 dark:border-t-violet-400" />
      </div>
    );
  }

  return (
    <section className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/report/customers"
          className="inline-flex items-center gap-1 rounded-lg border border-zinc-200 dark:border-white/[0.09] bg-white dark:bg-[#1a1a1a] px-3 py-1.5 text-sm shadow-sm transition-all duration-150 hover:border-violet-200 dark:hover:border-violet-500/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/40"
        >
          ← {t("customers.title")}
        </Link>
        <h2 className="text-lg font-bold tracking-tight bg-gradient-to-r from-violet-700 to-fuchsia-600 dark:from-violet-400 dark:to-fuchsia-400 bg-clip-text text-transparent">
          {customer?.customer_name ?? t("customers.edit")}
        </h2>
      </div>

      {error ? <p className="text-sm text-red-600 dark:text-red-400">{error}</p> : null}

      {/* Summary cards */}
      {customer?.summary && <CustomerSummaryCards summary={customer.summary} />}

      {/* Tabs */}
      <div className="flex gap-1 border-b border-zinc-200 dark:border-white/[0.07]">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.key
                ? "border-violet-600 text-violet-700 dark:border-violet-400 dark:text-violet-400"
                : "border-transparent text-zinc-500 dark:text-slate-400 hover:text-zinc-700 dark:hover:text-slate-300"
            }`}
          >
            {tab.label}
            {tab.key === "loans" && customer?.summary ? ` (${customer.summary.totalLoans})` : ""}
            {tab.key === "templates" && customer?.summary ? ` (${customer.summary.totalMappingInstances})` : ""}
          </button>
        ))}
      </div>

      {/* Tab: Info (edit form) */}
      {activeTab === "info" && (
        <form
          onSubmit={handleSubmit}
          className="max-w-2xl space-y-4 rounded-2xl border border-zinc-200 dark:border-white/[0.07] bg-white dark:bg-[#161616] p-6 shadow-sm"
        >
          <label className="block">
            <span className="text-sm font-medium">{t("customers.code")} *</span>
            <input required value={form.customer_code} onChange={(e) => setForm((p) => ({ ...p, customer_code: e.target.value }))} className={inputCls} />
          </label>
          <label className="block">
            <span className="text-sm font-medium">{t("customers.name")} *</span>
            <input required value={form.customer_name} onChange={(e) => setForm((p) => ({ ...p, customer_name: e.target.value }))} className={inputCls} />
          </label>
          <label className="block">
            <span className="text-sm font-medium">{t("customers.address")}</span>
            <input value={form.address} onChange={(e) => setForm((p) => ({ ...p, address: e.target.value }))} className={inputCls} />
          </label>
          <label className="block">
            <span className="text-sm font-medium">Ngành nghề SXKD</span>
            <input value={form.main_business} onChange={(e) => setForm((p) => ({ ...p, main_business: e.target.value }))} className={inputCls} />
          </label>
          <label className="block">
            <span className="text-sm font-medium">Vốn điều lệ</span>
            <input value={form.charter_capital} onChange={(e) => setForm((p) => ({ ...p, charter_capital: e.target.value }))} className={inputCls} />
          </label>
          <label className="block">
            <span className="text-sm font-medium">Người đại diện pháp luật</span>
            <input value={form.legal_representative_name} onChange={(e) => setForm((p) => ({ ...p, legal_representative_name: e.target.value }))} className={inputCls} />
          </label>
          <label className="block">
            <span className="text-sm font-medium">Chức vụ</span>
            <input value={form.legal_representative_title} onChange={(e) => setForm((p) => ({ ...p, legal_representative_title: e.target.value }))} className={inputCls} />
          </label>
          <label className="block">
            <span className="text-sm font-medium">Loại hình tổ chức</span>
            <input value={form.organization_type} onChange={(e) => setForm((p) => ({ ...p, organization_type: e.target.value }))} className={inputCls} />
          </label>
          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-gradient-to-r from-violet-600 to-fuchsia-600 px-5 py-2 text-sm font-medium text-white shadow-sm shadow-violet-500/25 transition-all duration-200 hover:shadow-md hover:shadow-violet-500/30 hover:brightness-110 disabled:opacity-60"
            >
              {saving ? "..." : "Lưu"}
            </button>
            <Link
              href="/report/customers"
              className="rounded-lg border border-zinc-200 dark:border-white/[0.09] px-4 py-2 text-sm dark:text-slate-300 shadow-sm transition-all duration-150 hover:border-violet-200 dark:hover:border-violet-500/20"
            >
              Hủy
            </Link>
          </div>
        </form>
      )}

      {/* Tab: Loans */}
      {activeTab === "loans" && customer && (
        <CustomerLoansSection loans={customer.loans} />
      )}

      {/* Tab: Templates */}
      {activeTab === "templates" && customer && (
        <CustomerTemplatesSection instances={customer.mapping_instances} />
      )}
    </section>
  );
}
