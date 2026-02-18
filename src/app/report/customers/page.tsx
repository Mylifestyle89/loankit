"use client";

import Link from "next/link";
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

  return (
    <section className="space-y-4">
      <div className="rounded-xl border border-zinc-200 bg-white p-4">
        <h2 className="text-lg font-semibold">{t("customers.title")}</h2>
        <p className="mt-1 text-sm text-zinc-600">{t("customers.desc")}</p>
        {error ? (
          <p className="mt-2 text-sm text-red-700">{error}</p>
        ) : null}
      </div>

      <div className="flex justify-end">
        <Link
          href="/report/customers/new"
          className="rounded-md bg-zinc-900 px-4 py-2 text-sm text-white"
        >
          {t("customers.add")}
        </Link>
      </div>

      <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
        {loading ? (
          <p className="p-6 text-sm text-zinc-600">{t("customers.loading")}</p>
        ) : customers.length === 0 ? (
          <p className="p-6 text-sm text-zinc-600">{t("customers.noCustomers")}</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-200 bg-zinc-100 text-left">
                <th className="px-4 py-2 font-semibold">{t("customers.code")}</th>
                <th className="px-4 py-2 font-semibold">{t("customers.name")}</th>
                <th className="px-4 py-2 font-semibold">{t("customers.address")}</th>
                <th className="px-4 py-2 font-semibold w-28" />
              </tr>
            </thead>
            <tbody>
              {customers.map((c) => (
                <tr key={c.id} className="border-t border-zinc-200 hover:bg-zinc-50">
                  <td className="px-4 py-2">{c.customer_code}</td>
                  <td className="px-4 py-2">{c.customer_name}</td>
                  <td className="px-4 py-2 text-zinc-600">{c.address ?? "—"}</td>
                  <td className="px-4 py-2 flex gap-2">
                    <Link
                      href={`/report/customers/${c.id}`}
                      className="rounded border border-zinc-300 px-2 py-1 text-xs hover:bg-zinc-100"
                    >
                      {t("customers.edit")}
                    </Link>
                    <button
                      type="button"
                      onClick={() => handleDelete(c.id)}
                      className="rounded border border-red-200 px-2 py-1 text-xs text-red-700 hover:bg-red-50"
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
    </section>
  );
}
