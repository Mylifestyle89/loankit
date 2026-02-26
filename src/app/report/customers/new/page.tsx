"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { useLanguage } from "@/components/language-provider";

export default function NewCustomerPage() {
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
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSaving(true);
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
        address: form.address.trim() || undefined,
        main_business: form.main_business.trim() || undefined,
        charter_capital: Number.isFinite(capital) ? capital : undefined,
        legal_representative_name: form.legal_representative_name.trim() || undefined,
        legal_representative_title: form.legal_representative_title.trim() || undefined,
        organization_type: form.organization_type.trim() || undefined,
      }),
    });
    const data = (await res.json()) as { ok: boolean; error?: string };
    setSaving(false);
    if (!data.ok) {
      setError(data.error ?? "Failed to create.");
      return;
    }
    router.push("/report/customers");
  }

  return (
    <section className="space-y-4">
      <div className="flex items-center gap-4">
        <Link
          href="/report/customers"
          className="rounded border border-coral-tree-300 dark:border-white/[0.09] px-3 py-1.5 text-sm hover:bg-coral-tree-100 dark:hover:bg-white/[0.06] dark:text-slate-300"
        >
          ← {t("customers.title")}
        </Link>
        <h2 className="text-lg font-semibold">{t("customers.add")}</h2>
      </div>
      {error ? <p className="text-sm text-red-700 dark:text-red-400">{error}</p> : null}
      <form
        onSubmit={handleSubmit}
        className="max-w-2xl space-y-4 rounded-xl border border-coral-tree-200 dark:border-white/[0.08] bg-white dark:bg-[#0f1629]/90 p-6"
      >
        <label className="block">
          <span className="text-sm font-medium">{t("customers.code")} *</span>
          <input
            required
            value={form.customer_code}
            onChange={(e) => setForm((p) => ({ ...p, customer_code: e.target.value }))}
            className="mt-1 w-full rounded-md border border-coral-tree-300 dark:border-white/[0.09] bg-white dark:bg-[#0f1629] text-zinc-900 dark:text-slate-100 px-3 py-2"
          />
        </label>
        <label className="block">
          <span className="text-sm font-medium">{t("customers.name")} *</span>
          <input
            required
            value={form.customer_name}
            onChange={(e) => setForm((p) => ({ ...p, customer_name: e.target.value }))}
            className="mt-1 w-full rounded-md border border-coral-tree-300 dark:border-white/[0.09] bg-white dark:bg-[#0f1629] text-zinc-900 dark:text-slate-100 px-3 py-2"
          />
        </label>
        <label className="block">
          <span className="text-sm font-medium">{t("customers.address")}</span>
          <input
            value={form.address}
            onChange={(e) => setForm((p) => ({ ...p, address: e.target.value }))}
            className="mt-1 w-full rounded-md border border-coral-tree-300 dark:border-white/[0.09] bg-white dark:bg-[#0f1629] text-zinc-900 dark:text-slate-100 px-3 py-2"
          />
        </label>
        <label className="block">
          <span className="text-sm font-medium">Ngành nghề SXKD</span>
          <input
            value={form.main_business}
            onChange={(e) => setForm((p) => ({ ...p, main_business: e.target.value }))}
            className="mt-1 w-full rounded-md border border-coral-tree-300 dark:border-white/[0.09] bg-white dark:bg-[#0f1629] text-zinc-900 dark:text-slate-100 px-3 py-2"
          />
        </label>
        <label className="block">
          <span className="text-sm font-medium">Vốn điều lệ</span>
          <input
            value={form.charter_capital}
            onChange={(e) => setForm((p) => ({ ...p, charter_capital: e.target.value }))}
            className="mt-1 w-full rounded-md border border-coral-tree-300 dark:border-white/[0.09] bg-white dark:bg-[#0f1629] text-zinc-900 dark:text-slate-100 px-3 py-2"
            placeholder="VD: 1000000000"
          />
        </label>
        <label className="block">
          <span className="text-sm font-medium">Người đại diện pháp luật</span>
          <input
            value={form.legal_representative_name}
            onChange={(e) =>
              setForm((p) => ({ ...p, legal_representative_name: e.target.value }))
            }
            className="mt-1 w-full rounded-md border border-coral-tree-300 dark:border-white/[0.09] bg-white dark:bg-[#0f1629] text-zinc-900 dark:text-slate-100 px-3 py-2"
          />
        </label>
        <label className="block">
          <span className="text-sm font-medium">Chức vụ</span>
          <input
            value={form.legal_representative_title}
            onChange={(e) =>
              setForm((p) => ({ ...p, legal_representative_title: e.target.value }))
            }
            className="mt-1 w-full rounded-md border border-coral-tree-300 dark:border-white/[0.09] bg-white dark:bg-[#0f1629] text-zinc-900 dark:text-slate-100 px-3 py-2"
          />
        </label>
        <label className="block">
          <span className="text-sm font-medium">Loại hình tổ chức</span>
          <input
            value={form.organization_type}
            onChange={(e) =>
              setForm((p) => ({ ...p, organization_type: e.target.value }))
            }
            className="mt-1 w-full rounded-md border border-coral-tree-300 dark:border-white/[0.09] bg-white dark:bg-[#0f1629] text-zinc-900 dark:text-slate-100 px-3 py-2"
          />
        </label>
        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={saving}
            className="rounded-md bg-coral-tree-700 px-4 py-2 text-sm text-white disabled:opacity-60"
          >
            {saving ? "..." : t("customers.add")}
          </button>
          <Link
            href="/report/customers"
            className="rounded-md border border-coral-tree-300 dark:border-white/[0.09] px-4 py-2 text-sm dark:text-slate-300 hover:bg-coral-tree-50 dark:hover:bg-white/[0.06]"
          >
            Hủy
          </Link>
        </div>
      </form>
    </section>
  );
}
