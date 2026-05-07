"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowLeft } from "lucide-react";

import { useLanguage } from "@/components/language-provider";
import { SmartField } from "@/components/smart-field";
import { DropdownOptionsProvider } from "@/lib/hooks/dropdown-options-context";
import { useGroupVisibility } from "@/lib/field-visibility/use-field-visibility";

const inputCls =
  "mt-1 w-full rounded-md border border-zinc-200 dark:border-white/[0.09] bg-white dark:bg-[#1a1a1a] text-zinc-900 dark:text-slate-100 px-3 py-2 shadow-sm transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/40";

type CustomerNewFormProps = {
  customerType: "corporate" | "individual";
  basePath: string;
};

export function CustomerNewForm({ customerType, basePath }: CustomerNewFormProps) {
  const { t } = useLanguage();
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    customer_code: "",
    customer_name: "",
    address: "",
    main_business: "",
    charter_capital: "" as string | number,
    legal_representative_name: "",
    legal_representative_title: "",
    organization_type: "",
    cccd: "",
    cccd_old: "",
    date_of_birth: "",
    phone: "",
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      const capital =
        form.charter_capital === ""
          ? undefined
          : Number(String(form.charter_capital).replace(/\./g, "").replace(",", "."));
      const res = await fetch("/api/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer_code: form.customer_code.trim(),
          customer_name: form.customer_name.trim(),
          customer_type: customerType,
          address: form.address.trim() || undefined,
          ...(customerType === "corporate"
            ? {
                main_business: form.main_business.trim() || undefined,
                charter_capital: Number.isFinite(capital) ? capital : undefined,
                legal_representative_name: form.legal_representative_name.trim() || undefined,
                legal_representative_title: form.legal_representative_title.trim() || undefined,
                organization_type: form.organization_type.trim() || undefined,
              }
            : {
                cccd: form.cccd.trim() || undefined,
                cccd_old: form.cccd_old.trim() || undefined,
                date_of_birth: form.date_of_birth.trim() || undefined,
                phone: form.phone.trim() || undefined,
              }),
        }),
      });
      const data = (await res.json()) as { ok: boolean; error?: string };
      if (!data.ok) { setError(data.error ?? "Failed to create."); return; }
      router.push(basePath);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error");
    } finally {
      setSaving(false);
    }
  }

  const visibilityData = { customer_type: customerType };
  const showCorporate = useGroupVisibility("customer.corporate_fields", visibilityData);
  const showIndividual = useGroupVisibility("customer.individual_fields", visibilityData);
  const typeLabel = customerType === "individual" ? "Khách hàng cá nhân" : "Khách hàng doanh nghiệp";

  return (
    <section className="space-y-5">
      <div className="flex items-center gap-4">
        <Link
          href={basePath}
          className="inline-flex items-center gap-1 rounded-lg border border-zinc-200 dark:border-white/[0.09] bg-white dark:bg-[#1a1a1a] px-3 py-1.5 text-sm shadow-sm transition-all duration-150 hover:border-primary-200 dark:hover:border-primary-500/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/40"
        >
          <ArrowLeft className="h-4 w-4" />
          {typeLabel}
        </Link>
        <h2 className="text-lg font-bold tracking-tight text-primary-600 dark:text-primary-400">{t("customers.add")}</h2>
      </div>
      {error ? <p role="alert" className="text-sm text-red-600 dark:text-red-400">{error}</p> : null}
      <DropdownOptionsProvider prefix="customer.">
        <form
          onSubmit={handleSubmit}
          className="max-w-2xl space-y-4 rounded-2xl border border-zinc-200 dark:border-white/[0.07] bg-white dark:bg-[#161616] p-6 shadow-sm"
        >
          {/* Type indicator (read-only) */}
          <div className="flex gap-2">
            <span className="rounded-lg px-4 py-2 text-sm font-medium bg-primary-100 text-primary-600 ring-1 ring-primary-500/30 dark:bg-primary-500/15 dark:text-primary-400">
              {typeLabel}
            </span>
          </div>

          {/* Shared fields */}
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

          {/* Corporate-only fields */}
          {showCorporate && (
            <>
              <label className="block">
                <span className="text-sm font-medium">Ngành nghề SXKD</span>
                <SmartField fieldKey="customer.main_business" value={form.main_business} onChange={(val) => setForm((p) => ({ ...p, main_business: val }))} className={inputCls} />
              </label>
              <label className="block">
                <span className="text-sm font-medium">Vốn điều lệ</span>
                <SmartField fieldKey="customer.charter_capital" value={String(form.charter_capital)} onChange={(val) => setForm((p) => ({ ...p, charter_capital: val }))} className={inputCls} placeholder="VD: 1000000000" />
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

          {/* Individual-only fields */}
          {showIndividual && (
            <>
              <label className="block">
                <span className="text-sm font-medium">CCCD/CMND</span>
                <SmartField fieldKey="customer.cccd" value={form.cccd} onChange={(val) => setForm((p) => ({ ...p, cccd: val }))} className={inputCls} placeholder="Số CCCD/CMND" />
              </label>
              <label className="block">
                <span className="text-sm font-medium">CMND cũ</span>
                <SmartField fieldKey="customer.cccd_old" value={form.cccd_old} onChange={(val) => setForm((p) => ({ ...p, cccd_old: val }))} className={inputCls} placeholder="Số CMND cũ (9 số)" />
              </label>
              <label className="block">
                <span className="text-sm font-medium">Năm sinh</span>
                <SmartField fieldKey="customer.date_of_birth" value={form.date_of_birth} onChange={(val) => setForm((p) => ({ ...p, date_of_birth: val }))} className={inputCls} placeholder="VD: 1990" />
              </label>
              <label className="block">
                <span className="text-sm font-medium">Số điện thoại</span>
                <SmartField fieldKey="customer.phone" value={form.phone} onChange={(val) => setForm((p) => ({ ...p, phone: val }))} className={inputCls} placeholder="VD: 0901234567" />
              </label>
            </>
          )}
          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-primary-500 px-5 py-2 text-sm font-medium text-white shadow-sm shadow-primary-500/25 transition-all duration-200 hover:shadow-md hover:shadow-primary-500/30 hover:brightness-110 disabled:opacity-60"
            >
              {saving ? "..." : t("customers.add")}
            </button>
            <Link
              href={basePath}
              className="rounded-lg border border-zinc-200 dark:border-white/[0.09] px-4 py-2 text-sm dark:text-slate-300 shadow-sm transition-all duration-150 hover:border-primary-200 dark:hover:border-primary-500/20"
            >
              Hủy
            </Link>
          </div>
        </form>
      </DropdownOptionsProvider>
    </section>
  );
}
