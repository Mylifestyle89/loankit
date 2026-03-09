"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ArrowRight, Calendar, Layers, Plus, Trash2 } from "lucide-react";

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

  const totalAmount = loans.reduce((s, l) => s + l.loanAmount, 0);
  const activeCount = loans.filter((l) => l.status === "active").length;

  return (
    <section className="space-y-5">
      {/* Header with gradient accent */}
      <div className="relative overflow-hidden rounded-2xl border border-violet-100 dark:border-violet-500/10 bg-gradient-to-br from-violet-50 via-white to-fuchsia-50 dark:from-violet-950/30 dark:via-[#141414] dark:to-fuchsia-950/20 p-5">
        <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-violet-200/30 blur-2xl dark:bg-violet-500/10" />
        <div className="relative flex items-start justify-between">
          <div>
            <h2 className="text-xl font-bold tracking-tight bg-gradient-to-r from-violet-700 to-fuchsia-600 dark:from-violet-400 dark:to-fuchsia-400 bg-clip-text text-transparent">
              {t("loans.title")}
            </h2>
            <p className="mt-1 text-sm text-zinc-500 dark:text-slate-400">{t("loans.desc")}</p>
            {error && <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>}
          </div>
          <Link href="/report/loans/new"
            className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-violet-600 to-fuchsia-600 px-4 py-2 text-sm font-medium text-white shadow-sm shadow-violet-500/25 transition-all duration-200 hover:shadow-md hover:shadow-violet-500/30 hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/50">
            <Plus className="h-4 w-4" />
            {t("loans.add")}
          </Link>
        </div>

        {/* Quick stats */}
        <div className="relative mt-4 flex gap-6 text-sm">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-100 dark:bg-violet-500/15">
              <Layers className="h-4 w-4 text-violet-600 dark:text-violet-400" />
            </div>
            <div>
              <p className="text-xs text-zinc-400 dark:text-slate-500">{t("loans.title")}</p>
              <p className="font-semibold tabular-nums">{loans.length}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-500/15">
              <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{activeCount}</span>
            </div>
            <div>
              <p className="text-xs text-zinc-400 dark:text-slate-500">{t("loans.status.active")}</p>
              <p className="font-semibold tabular-nums">{fmt(totalAmount)} VND</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filter bar */}
      <div className="flex items-center gap-3">
        <select
          value={customerId}
          onChange={(e) => setCustomerId(e.target.value)}
          className="cursor-pointer rounded-lg border border-zinc-200 dark:border-white/[0.09] bg-white dark:bg-[#1a1a1a] px-3 py-2 text-sm shadow-sm transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/40"
        >
          <option value="">{t("invoices.all")}</option>
          {customers.map((c) => (
            <option key={c.id} value={c.id}>{c.customer_name}</option>
          ))}
        </select>
      </div>

      {/* Loan cards */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-violet-200 border-t-violet-600 dark:border-violet-800 dark:border-t-violet-400" />
        </div>
      ) : loans.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-300 dark:border-white/[0.08] py-12 text-center">
          <p className="text-sm text-zinc-400 dark:text-slate-500">{t("loans.noData")}</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {loans.map((loan) => (
            <div key={loan.id}
              className="group relative rounded-xl border border-zinc-200 dark:border-white/[0.07] bg-white dark:bg-[#161616] p-4 shadow-sm transition-all duration-200 hover:shadow-md hover:border-violet-200 dark:hover:border-violet-500/20">
              <div className="flex items-start justify-between gap-4">
                {/* Left: main info */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2.5">
                    <h3 className="truncate font-semibold text-zinc-900 dark:text-white">
                      {loan.contractNumber}
                    </h3>
                    <LoanStatusBadge status={loan.status} />
                  </div>
                  <p className="mt-0.5 text-sm text-zinc-500 dark:text-slate-400">{loan.customer.customer_name}</p>
                </div>

                {/* Right: amount */}
                <div className="text-right shrink-0">
                  <p className="text-lg font-bold tabular-nums bg-gradient-to-r from-violet-700 to-fuchsia-600 dark:from-violet-400 dark:to-fuchsia-400 bg-clip-text text-transparent">
                    {fmt(loan.loanAmount)}
                  </p>
                  <p className="text-xs text-zinc-400 dark:text-slate-500">VND</p>
                </div>
              </div>

              {/* Meta row */}
              <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-zinc-500 dark:text-slate-400">
                <span className="inline-flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {fmtDate(loan.startDate)} — {fmtDate(loan.endDate)}
                </span>
                <span className="inline-flex items-center gap-1">
                  <Layers className="h-3 w-3" />
                  {loan._count.disbursements} {t("loans.disbursementCount")?.toLowerCase()}
                </span>
                {loan.purpose && (
                  <span className="truncate max-w-[200px]" title={loan.purpose}>{loan.purpose}</span>
                )}
              </div>

              {/* Actions */}
              <div className="mt-3 flex items-center gap-2 border-t border-zinc-100 dark:border-white/[0.05] pt-3">
                <Link href={`/report/loans/${loan.id}`}
                  className="inline-flex items-center gap-1 rounded-lg bg-violet-50 dark:bg-violet-500/10 px-3 py-1.5 text-xs font-medium text-violet-700 dark:text-violet-400 transition-colors duration-150 hover:bg-violet-100 dark:hover:bg-violet-500/20">
                  {t("common.view")}
                  <ArrowRight className="h-3 w-3" />
                </Link>
                <button type="button" onClick={() => handleDelete(loan.id)}
                  className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs text-zinc-500 dark:text-slate-400 transition-colors duration-150 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10 dark:hover:text-red-400">
                  <Trash2 className="h-3 w-3" />
                  {t("common.delete")}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
