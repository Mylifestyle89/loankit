"use client";

import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { useLanguage } from "@/components/language-provider";
import { SmartField } from "@/components/smart-field";
import { DropdownOptionsProvider } from "@/lib/hooks/dropdown-options-context";

import { CustomerSummaryCards } from "./components/customer-summary-cards";
import { CustomerLoansSection } from "./components/customer-loans-section";
import { CustomerTemplatesSection } from "./components/customer-templates-section";
import { KhcnDocChecklist } from "./components/khcn-doc-checklist";
import { CustomerCollateralSection } from "./components/customer-collateral-section";
import { CustomerCoBorrowerSection } from "./components/customer-co-borrower-section";
import { CustomerRelatedPersonSection } from "./components/customer-related-person-section";
import { CustomerBranchStaffSection } from "./components/customer-branch-staff-section";
import { CustomerCreditInfoSection } from "./components/customer-credit-info-section";
import { KhcnProfileCard } from "./components/khcn-profile-card";
import { CustomerDisbursementSection } from "./components/customer-disbursement-section";

type FullCustomer = {
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
  cccd: string | null;
  cccd_old: string | null;
  cccd_issued_date: string | null;
  cccd_issued_place: string | null;
  date_of_birth: string | null;
  phone: string | null;
  bank_account: string | null;
  bank_name: string | null;
  active_branch_id: string | null;
  relationship_officer: string | null;
  appraiser: string | null;
  approver_name: string | null;
  approver_title: string | null;
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
    debtGroup: string | null;
    nearestMaturity: string | null;
    coBorrowerCount: number;
    outstandingBalance: number;
  };
};

const inputCls =
  "mt-1 w-full rounded-md border border-zinc-200 dark:border-white/[0.09] bg-white dark:bg-[#1a1a1a] text-zinc-900 dark:text-slate-100 px-3 py-2 shadow-sm transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/40";

/** Auto-insert "/" separators as user types a date in dd/mm/yyyy format */
function formatDateInput(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

const allTabs = [
  { key: "branch", label: "Nơi cho vay" },
  { key: "info", label: "Người vay" },
  { key: "credit", label: "Thông tin tín dụng" },
  { key: "loans", label: "Khoản vay" },
  { key: "collateral", label: "TSBĐ" },
  { key: "templates", label: "In mẫu biểu" },
] as const;

const khcnTabs = [
  { key: "branch", label: "Nơi cho vay" },
  { key: "info", label: "Thông tin" },
  { key: "loans-credit", label: "Khoản vay & Tín dụng" },
  { key: "collateral", label: "TSBĐ" },
  { key: "templates", label: "In mẫu biểu" },
] as const;

type TabKey = (typeof allTabs)[number]["key"] | (typeof khcnTabs)[number]["key"];

export default function EditCustomerPage() {
  const { t } = useLanguage();
  const params = useParams();
  const searchParams = useSearchParams();
  const id = params.id as string;
  const rawTab = (searchParams.get("tab") as TabKey) || "info";
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<TabKey>(rawTab);
  const [infoSubTab, setInfoSubTab] = useState<"general" | "co-borrower" | "related">("general");
  const [loansCreditSubTab, setLoansCreditSubTab] = useState<"loans" | "credit" | "disbursement">(rawTab === "credit" ? "credit" : "loans");
  const [customer, setCustomer] = useState<FullCustomer | null>(null);
  const [form, setForm] = useState({
    customer_code: "",
    customer_name: "",
    customer_type: "corporate",
    address: "",
    main_business: "",
    charter_capital: "" as string | number,
    legal_representative_name: "",
    legal_representative_title: "",
    organization_type: "",
    cccd: "",
    cccd_old: "",
    cccd_issued_date: "",
    cccd_issued_place: "",
    date_of_birth: "",
    phone: "",
    bank_account: "",
    bank_name: "",
  });

  const loadCustomer = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
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
      customer_type: c.customer_type ?? "corporate",
      address: c.address ?? "",
      main_business: c.main_business ?? "",
      charter_capital: c.charter_capital ?? "",
      legal_representative_name: c.legal_representative_name ?? "",
      legal_representative_title: c.legal_representative_title ?? "",
      organization_type: c.organization_type ?? "",
      cccd: c.cccd ?? "",
      cccd_old: c.cccd_old ?? "",
      cccd_issued_date: c.cccd_issued_date ?? "",
      cccd_issued_place: c.cccd_issued_place ?? "",
      date_of_birth: c.date_of_birth ?? "",
      phone: c.phone ?? "",
      bank_account: c.bank_account ?? "",
      bank_name: c.bank_name ?? "",
    });
    setLoading(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error");
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadCustomer();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [loadCustomer]);

  // Remap old tab keys for KHCN after customer loads
  const isIndividual = customer?.customer_type === "individual";
  useEffect(() => {
    if (isIndividual && (activeTab === "loans" || activeTab === "credit")) {
      if (activeTab === "credit") setLoansCreditSubTab("credit");
      setActiveTab("loans-credit");
    }
  }, [isIndividual, activeTab]);

  const tabs = isIndividual ? khcnTabs : allTabs;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSaving(true);
    const capital =
      form.charter_capital === ""
        ? null
        : Number(String(form.charter_capital).replace(/\./g, "").replace(",", "."));
    try {
    const res = await fetch(`/api/customers/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        customer_code: form.customer_code.trim(),
        customer_name: form.customer_name.trim(),
        customer_type: form.customer_type,
        address: form.address.trim() || null,
        main_business: form.main_business.trim() || null,
        charter_capital: Number.isFinite(capital) ? capital : null,
        legal_representative_name: form.legal_representative_name.trim() || null,
        legal_representative_title: form.legal_representative_title.trim() || null,
        organization_type: form.organization_type.trim() || null,
        cccd: form.cccd.trim() || null,
        cccd_old: form.cccd_old.trim() || null,
        cccd_issued_date: form.cccd_issued_date.trim() || null,
        cccd_issued_place: form.cccd_issued_place.trim() || null,
        date_of_birth: form.date_of_birth.trim() || null,
        phone: form.phone.trim() || null,
        bank_account: form.bank_account.trim() || null,
        bank_name: form.bank_name.trim() || null,
      }),
    });
    const data = (await res.json()) as { ok: boolean; error?: string };
    setSaving(false);
    if (!data.ok) {
      setError(data.error ?? "Failed to update.");
      return;
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    void loadCustomer();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error");
      setSaving(false);
    }
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

      {/* Summary / Profile card — conditional by customer type */}
      {customer?.summary && (
        isIndividual
          ? <KhcnProfileCard customer={customer} summary={customer.summary} />
          : <CustomerSummaryCards summary={customer.summary} />
      )}

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
            {(tab.key === "loans" || tab.key === "loans-credit") && customer?.summary ? ` (${customer.summary.totalLoans})` : ""}
          </button>
        ))}
      </div>

      {/* Tab: Thông tin CN (branch & staff) — global config, syncs all customers */}
      {activeTab === "branch" && <CustomerBranchStaffSection />}

      {/* Tab: Thông tin tín dụng (DN only — KHCN uses merged tab) */}
      {activeTab === "credit" && !isIndividual && <CustomerCreditInfoSection customerId={id} />}

      {/* Tab: Info (with subtabs) */}
      {activeTab === "info" && (
        <div className="space-y-4">
          {/* Info subtabs */}
          <div className="flex gap-1">
            {([
              { key: "general", label: "Thông tin chung" },
              { key: "co-borrower", label: "Người đồng vay" },
              { key: "related", label: "Người liên quan" },
            ] as const).map((st) => (
              <button
                key={st.key}
                type="button"
                onClick={() => setInfoSubTab(st.key)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                  infoSubTab === st.key
                    ? "bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-400"
                    : "text-zinc-500 dark:text-slate-400 hover:bg-zinc-100 dark:hover:bg-white/[0.05]"
                }`}
              >
                {st.label}
              </button>
            ))}
          </div>

          {/* Subtab: Thông tin chung */}
          {infoSubTab === "general" && (
            <DropdownOptionsProvider prefix="customer.">
            <form
              onSubmit={handleSubmit}
              className="max-w-2xl space-y-4 rounded-2xl border border-zinc-200 dark:border-white/[0.07] bg-white dark:bg-[#161616] p-6 shadow-sm"
            >
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Loại KH:</span>
                <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ${
                  form.customer_type === "individual"
                    ? "bg-emerald-50 text-emerald-700 ring-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-400"
                    : "bg-blue-50 text-blue-700 ring-blue-500/20 dark:bg-blue-500/10 dark:text-blue-400"
                }`}>
                  {form.customer_type === "individual" ? "Cá nhân" : "Doanh nghiệp"}
                </span>
              </div>
              <label className="block">
                <span className="text-sm font-medium">{t("customers.code")} *</span>
                <SmartField fieldKey="customer.customer_code" value={form.customer_code} onChange={(val) => setForm((p) => ({ ...p, customer_code: val }))} className={inputCls} />
              </label>
              <label className="block">
                <span className="text-sm font-medium">{t("customers.name")} *</span>
                <SmartField fieldKey="customer.customer_name" value={form.customer_name} onChange={(val) => setForm((p) => ({ ...p, customer_name: val }))} className={inputCls} />
              </label>
              <label className="block">
                <span className="text-sm font-medium">{t("customers.address")}</span>
                <SmartField fieldKey="customer.address" value={form.address} onChange={(val) => setForm((p) => ({ ...p, address: val }))} className={inputCls} />
              </label>
              {form.customer_type === "corporate" && (
                <>
                  <label className="block">
                    <span className="text-sm font-medium">Ngành nghề SXKD</span>
                    <SmartField fieldKey="customer.main_business" value={form.main_business} onChange={(val) => setForm((p) => ({ ...p, main_business: val }))} className={inputCls} />
                  </label>
                  <label className="block">
                    <span className="text-sm font-medium">Vốn điều lệ</span>
                    <SmartField fieldKey="customer.charter_capital" value={String(form.charter_capital)} onChange={(val) => setForm((p) => ({ ...p, charter_capital: val }))} className={inputCls} />
                  </label>
                  <label className="block">
                    <span className="text-sm font-medium">Người đại diện pháp luật</span>
                    <SmartField fieldKey="customer.legal_representative_name" value={form.legal_representative_name} onChange={(val) => setForm((p) => ({ ...p, legal_representative_name: val }))} className={inputCls} />
                  </label>
                  <label className="block">
                    <span className="text-sm font-medium">Chức vụ</span>
                    <SmartField fieldKey="customer.legal_representative_title" value={form.legal_representative_title} onChange={(val) => setForm((p) => ({ ...p, legal_representative_title: val }))} className={inputCls} />
                  </label>
                  <label className="block">
                    <span className="text-sm font-medium">Loại hình tổ chức</span>
                    <SmartField fieldKey="customer.organization_type" value={form.organization_type} onChange={(val) => setForm((p) => ({ ...p, organization_type: val }))} className={inputCls} />
                  </label>
                </>
              )}
              {form.customer_type === "individual" && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <label className="block">
                      <span className="text-sm font-medium">CCCD/CMND</span>
                      <SmartField fieldKey="customer.cccd" value={form.cccd} onChange={(val) => setForm((p) => ({ ...p, cccd: val }))} className={inputCls} />
                    </label>
                    <label className="block">
                      <span className="text-sm font-medium">Năm sinh</span>
                      <input
                        value={form.date_of_birth}
                        onChange={(e) => setForm((p) => ({ ...p, date_of_birth: e.target.value }))}
                        placeholder="VD: 1990 hoặc 15/03/1990"
                        className={inputCls}
                      />
                    </label>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <label className="block">
                      <span className="text-sm font-medium">Ngày cấp CCCD</span>
                      <input
                        value={form.cccd_issued_date}
                        onChange={(e) => setForm((p) => ({ ...p, cccd_issued_date: formatDateInput(e.target.value) }))}
                        placeholder="dd/mm/yyyy"
                        maxLength={10}
                        className={inputCls}
                      />
                    </label>
                    <label className="block">
                      <span className="text-sm font-medium">Nơi cấp CCCD</span>
                      <SmartField fieldKey="customer.cccd_issued_place" value={form.cccd_issued_place} onChange={(val) => setForm((p) => ({ ...p, cccd_issued_place: val }))} className={inputCls} />
                    </label>
                  </div>
                  <label className="block">
                    <span className="text-sm font-medium">CMND cũ</span>
                    <SmartField fieldKey="customer.cccd_old" value={form.cccd_old} onChange={(val) => setForm((p) => ({ ...p, cccd_old: val }))} className={inputCls} />
                  </label>
                  <label className="block">
                    <span className="text-sm font-medium">Số điện thoại</span>
                    <SmartField fieldKey="customer.phone" value={form.phone} onChange={(val) => setForm((p) => ({ ...p, phone: val }))} className={inputCls} />
                  </label>
                  <div className="grid grid-cols-2 gap-4">
                    <label className="block">
                      <span className="text-sm font-medium">Số tài khoản</span>
                      <SmartField fieldKey="customer.bank_account" value={form.bank_account} onChange={(val) => setForm((p) => ({ ...p, bank_account: val }))} className={inputCls} />
                    </label>
                    <label className="block">
                      <span className="text-sm font-medium">Nơi mở tài khoản</span>
                      <SmartField fieldKey="customer.bank_name" value={form.bank_name} onChange={(val) => setForm((p) => ({ ...p, bank_name: val }))} className={inputCls} />
                    </label>
                  </div>
                </>
              )}
              <div className="flex items-center gap-3 pt-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="cursor-pointer rounded-lg bg-gradient-to-r from-violet-600 to-fuchsia-600 px-5 py-2 text-sm font-medium text-white shadow-sm shadow-violet-500/25 transition-all duration-200 hover:shadow-md hover:shadow-violet-500/30 hover:brightness-110 disabled:opacity-60"
                >
                  {saving ? "Đang lưu..." : "Lưu"}
                </button>
                {saved && <span className="text-sm text-emerald-600 dark:text-emerald-400">Đã lưu thành công</span>}
              </div>
            </form>
            </DropdownOptionsProvider>
          )}

          {/* Subtab: Người đồng vay */}
          {infoSubTab === "co-borrower" && <CustomerCoBorrowerSection customerId={id} />}

          {/* Subtab: Người liên quan */}
          {infoSubTab === "related" && <CustomerRelatedPersonSection customerId={id} />}
        </div>
      )}

      {/* Tab: Loans (DN only — KHCN uses merged tab) */}
      {activeTab === "loans" && !isIndividual && customer && (
        <CustomerLoansSection loans={customer.loans} customerId={id} />
      )}

      {/* Tab: Khoản vay & Tín dụng (KHCN merged tab) */}
      {activeTab === "loans-credit" && customer && (
        <div className="space-y-4">
          <div className="flex gap-1">
            {([
              { key: "loans" as const, label: "Khoản vay" },
              { key: "credit" as const, label: "Thông tin tín dụng" },
              { key: "disbursement" as const, label: "Giải ngân" },
            ]).map((st) => (
              <button
                key={st.key}
                type="button"
                onClick={() => setLoansCreditSubTab(st.key)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                  loansCreditSubTab === st.key
                    ? "bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-400"
                    : "text-zinc-500 dark:text-slate-400 hover:bg-zinc-100 dark:hover:bg-white/[0.05]"
                }`}
              >
                {st.label}
              </button>
            ))}
          </div>
          {loansCreditSubTab === "loans" && <CustomerLoansSection loans={customer.loans} customerId={id} />}
          {loansCreditSubTab === "credit" && <CustomerCreditInfoSection customerId={id} />}
          {loansCreditSubTab === "disbursement" && (
            <CustomerDisbursementSection
              customerId={id}
              loanId={customer.loans?.[0]?.id ?? null}
            />
          )}
        </div>
      )}

      {/* Tab: Tài sản bảo đảm */}
      {activeTab === "collateral" && customer && (
        <CustomerCollateralSection customerId={id} />
      )}

      {/* Tab: Mẫu biểu — render by customer type */}
      {activeTab === "templates" && customer && (
        <div className="space-y-6">
          {form.customer_type === "individual" ? (
            <KhcnDocChecklist
              loanMethod={customer.loans?.[0]?.loan_method}
              customerId={id}
              loanId={customer.loans?.[0]?.id}
            />
          ) : (
            <CustomerTemplatesSection instances={customer.mapping_instances} />
          )}
        </div>
      )}
    </section>
  );
}
