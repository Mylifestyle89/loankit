"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { useLanguage } from "@/components/language-provider";
import { LoanStatusBadge } from "@/components/invoice-tracking/loan-status-badge";
import { fmtDisplay as fmt, fmtDateDisplay as fmtDate } from "@/lib/invoice-tracking-format-helpers";

type Customer = { id: string; customer_name: string };
type Loan = {
  id: string;
  contractNumber: string;
  loanAmount: number;
  startDate: string;
  endDate: string;
  status: string;
  purpose: string | null;
  customer: { id: string; customer_name: string };
  _count: { disbursements: number };
};

export default function LoansPage() {
  const { t } = useLanguage();
  const [loans, setLoans] = useState<Loan[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customerId, setCustomerId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadLoans = useCallback(async () => {
    setLoading(true);
    setError("");
    const qs = customerId ? `?customerId=${customerId}` : "";
    const res = await fetch(`/api/loans${qs}`, { cache: "no-store" });
    const data = await res.json();
    if (!data.ok) { setError(data.error ?? "Failed"); setLoading(false); return; }
    setLoans(data.loans ?? []);
    setLoading(false);
  }, [customerId]);

  useEffect(() => {
    fetch("/api/customers").then((r) => r.json()).then((d) => {
      if (d.ok) setCustomers(d.customers ?? []);
    });
  }, []);

  useEffect(() => { void loadLoans(); }, [loadLoans]);

  async function handleDelete(id: string) {
    if (!confirm(t("loans.deleteConfirm"))) return;
    const res = await fetch(`/api/loans/${id}`, { method: "DELETE" });
    const data = await res.json();
    if (data.ok) void loadLoans();
    else setError(data.error ?? "Delete failed.");
  }

  return (
    <section className="space-y-4">
      <div className="rounded-xl border border-coral-tree-200 dark:border-white/[0.08] bg-white dark:bg-[#141414]/90 p-4">
        <h2 className="text-lg font-semibold">{t("loans.title")}</h2>
        <p className="mt-1 text-sm text-zinc-500 dark:text-slate-400">{t("loans.desc")}</p>
        {error && <p className="mt-2 text-sm text-red-700 dark:text-red-400">{error}</p>}
      </div>

      <div className="flex justify-between items-center">
        <select
          value={customerId}
          onChange={(e) => setCustomerId(e.target.value)}
          className="cursor-pointer rounded-md border border-zinc-300 dark:border-white/[0.09] bg-white dark:bg-[#1a1a1a] px-3 py-2 text-sm transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50"
        >
          <option value="">{t("invoices.all")}</option>
          {customers.map((c) => (
            <option key={c.id} value={c.id}>{c.customer_name}</option>
          ))}
        </select>
        <Link href="/report/loans/new" className="cursor-pointer rounded-md bg-indigo-600 px-4 py-2 text-sm text-white transition-colors duration-150 hover:bg-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50">
          {t("loans.add")}
        </Link>
      </div>

      <div className="rounded-xl border border-coral-tree-200 dark:border-white/[0.08] bg-white dark:bg-[#141414]/90 overflow-hidden">
        {loading ? (
          <p className="p-6 text-sm text-zinc-500 dark:text-slate-400">{t("loans.loading")}</p>
        ) : loans.length === 0 ? (
          <p className="p-6 text-sm text-zinc-500 dark:text-slate-400">{t("loans.noData")}</p>
        ) : (
          <div className="overflow-x-auto"><table className="w-full text-sm">
            <thead>
              <tr className="border-b border-coral-tree-200 dark:border-white/[0.07] bg-coral-tree-100 dark:bg-white/[0.05] text-left">
                <th className="px-4 py-2 font-semibold">{t("loans.customer")}</th>
                <th className="px-4 py-2 font-semibold">{t("loans.contractNumber")}</th>
                <th className="px-4 py-2 font-semibold text-right">{t("loans.loanAmount")}</th>
                <th className="px-4 py-2 font-semibold">{t("loans.startDate")}</th>
                <th className="px-4 py-2 font-semibold">{t("loans.endDate")}</th>
                <th className="px-4 py-2 font-semibold">{t("loans.status")}</th>
                <th className="px-4 py-2 font-semibold">{t("loans.disbursementCount")}</th>
                <th className="px-4 py-2 font-semibold w-28" />
              </tr>
            </thead>
            <tbody>
              {loans.map((loan) => (
                <tr key={loan.id} className="border-t border-coral-tree-200 dark:border-white/[0.07] transition-colors duration-150 hover:bg-coral-tree-50 dark:hover:bg-white/[0.04]">
                  <td className="px-4 py-2">{loan.customer.customer_name}</td>
                  <td className="px-4 py-2 font-medium">{loan.contractNumber}</td>
                  <td className="px-4 py-2 text-right tabular-nums">{fmt(loan.loanAmount)}</td>
                  <td className="px-4 py-2">{fmtDate(loan.startDate)}</td>
                  <td className="px-4 py-2">{fmtDate(loan.endDate)}</td>
                  <td className="px-4 py-2"><LoanStatusBadge status={loan.status} /></td>
                  <td className="px-4 py-2 text-center">{loan._count.disbursements}</td>
                  <td className="px-4 py-2 flex gap-2">
                    <Link href={`/report/loans/${loan.id}`}
                      className="cursor-pointer rounded border border-coral-tree-300 dark:border-white/[0.09] px-2 py-1 text-xs transition-colors duration-150 hover:bg-coral-tree-100 dark:hover:bg-white/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50">
                      {t("common.view")}
                    </Link>
                    <button type="button" onClick={() => handleDelete(loan.id)}
                      className="cursor-pointer rounded border border-red-200 dark:border-red-500/30 px-2 py-1 text-xs text-red-700 dark:text-red-400 transition-colors duration-150 hover:bg-red-50 dark:hover:bg-red-500/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500/50">
                      {t("common.delete")}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table></div>
        )}
      </div>
    </section>
  );
}
