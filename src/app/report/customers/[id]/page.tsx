"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

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
};

export default function EditCustomerPage() {
  const { t } = useLanguage();
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [loading, setLoading] = useState(true);
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

  const loadCustomer = useCallback(async () => {
    setLoading(true);
    setError("");
    const res = await fetch(`/api/customers/${id}`, { cache: "no-store" });
    const data = (await res.json()) as {
      ok: boolean;
      error?: string;
      customer?: Customer;
    };
    if (!data.ok || !data.customer) {
      setError(data.error ?? "Not found.");
      setLoading(false);
      return;
    }
    const c = data.customer;
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
    return <p className="text-sm text-coral-tree-600 dark:text-slate-400">{t("customers.loading")}</p>;
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
        <h2 className="text-lg font-semibold">{t("customers.edit")}</h2>
      </div>
      {error ? <p className="text-sm text-red-700 dark:text-red-400">{error}</p> : null}
      <form
        onSubmit={handleSubmit}
        className="max-w-2xl space-y-4 rounded-xl border border-coral-tree-200 dark:border-white/[0.08] bg-white dark:bg-[#141414]/90 p-6"
      >
        <label className="block">
          <span className="text-sm font-medium">{t("customers.code")} *</span>
          <input
            required
            value={form.customer_code}
            onChange={(e) => setForm((p) => ({ ...p, customer_code: e.target.value }))}
            className="mt-1 w-full rounded-md border border-coral-tree-300 dark:border-white/[0.09] bg-white dark:bg-[#141414] text-zinc-900 dark:text-slate-100 px-3 py-2"
          />
        </label>
        <label className="block">
          <span className="text-sm font-medium">{t("customers.name")} *</span>
          <input
            required
            value={form.customer_name}
            onChange={(e) => setForm((p) => ({ ...p, customer_name: e.target.value }))}
            className="mt-1 w-full rounded-md border border-coral-tree-300 dark:border-white/[0.09] bg-white dark:bg-[#141414] text-zinc-900 dark:text-slate-100 px-3 py-2"
          />
        </label>
        <label className="block">
          <span className="text-sm font-medium">{t("customers.address")}</span>
          <input
            value={form.address}
            onChange={(e) => setForm((p) => ({ ...p, address: e.target.value }))}
            className="mt-1 w-full rounded-md border border-coral-tree-300 dark:border-white/[0.09] bg-white dark:bg-[#141414] text-zinc-900 dark:text-slate-100 px-3 py-2"
          />
        </label>
        <label className="block">
          <span className="text-sm font-medium">Ngành nghề SXKD</span>
          <input
            value={form.main_business}
            onChange={(e) => setForm((p) => ({ ...p, main_business: e.target.value }))}
            className="mt-1 w-full rounded-md border border-coral-tree-300 dark:border-white/[0.09] bg-white dark:bg-[#141414] text-zinc-900 dark:text-slate-100 px-3 py-2"
          />
        </label>
        <label className="block">
          <span className="text-sm font-medium">Vốn điều lệ</span>
          <input
            value={form.charter_capital}
            onChange={(e) => setForm((p) => ({ ...p, charter_capital: e.target.value }))}
            className="mt-1 w-full rounded-md border border-coral-tree-300 dark:border-white/[0.09] bg-white dark:bg-[#141414] text-zinc-900 dark:text-slate-100 px-3 py-2"
          />
        </label>
        <label className="block">
          <span className="text-sm font-medium">Người đại diện pháp luật</span>
          <input
            value={form.legal_representative_name}
            onChange={(e) =>
              setForm((p) => ({ ...p, legal_representative_name: e.target.value }))
            }
            className="mt-1 w-full rounded-md border border-coral-tree-300 dark:border-white/[0.09] bg-white dark:bg-[#141414] text-zinc-900 dark:text-slate-100 px-3 py-2"
          />
        </label>
        <label className="block">
          <span className="text-sm font-medium">Chức vụ</span>
          <input
            value={form.legal_representative_title}
            onChange={(e) =>
              setForm((p) => ({ ...p, legal_representative_title: e.target.value }))
            }
            className="mt-1 w-full rounded-md border border-coral-tree-300 dark:border-white/[0.09] bg-white dark:bg-[#141414] text-zinc-900 dark:text-slate-100 px-3 py-2"
          />
        </label>
        <label className="block">
          <span className="text-sm font-medium">Loại hình tổ chức</span>
          <input
            value={form.organization_type}
            onChange={(e) =>
              setForm((p) => ({ ...p, organization_type: e.target.value }))
            }
            className="mt-1 w-full rounded-md border border-coral-tree-300 dark:border-white/[0.09] bg-white dark:bg-[#141414] text-zinc-900 dark:text-slate-100 px-3 py-2"
          />
        </label>
        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={saving}
            className="rounded-md bg-coral-tree-700 px-4 py-2 text-sm text-white disabled:opacity-60"
          >
            {saving ? "..." : "Lưu"}
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
