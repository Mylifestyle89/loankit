"use client";

import { useCallback, useEffect, useState } from "react";

import { useLanguage } from "@/components/language-provider";
import { InvoiceTable } from "@/components/invoice-tracking/invoice-table";
import { fmtDisplay as fmt } from "@/lib/invoice-tracking-format-helpers";

type Customer = { id: string; customer_name: string };

type SummaryItem = {
  customerId: string;
  customerName: string;
  totalLoans: number;
  totalDisbursements: number;
  totalInvoices: number;
  totalAmount: number;
  pendingCount: number;
  overdueCount: number;
};

type Invoice = {
  id: string;
  invoiceNumber: string;
  supplierName: string;
  amount: number;
  issueDate: string;
  dueDate: string;
  customDeadline: string | null;
  status: string;
  notes: string | null;
};

export default function InvoicesOverviewPage() {
  const { t } = useLanguage();
  const [summary, setSummary] = useState<SummaryItem[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [statusFilter, setStatusFilter] = useState("");
  const [customerFilter, setCustomerFilter] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/customers").then((r) => r.json()).then((d) => {
      if (d.ok) setCustomers(d.customers ?? []);
    });
    fetch("/api/invoices/summary").then((r) => r.json()).then((d) => {
      if (d.ok) setSummary(d.summary ?? []);
    });
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (statusFilter) params.set("status", statusFilter);
    if (customerFilter) params.set("customerId", customerFilter);
    const qs = params.toString() ? `?${params}` : "";

    const [invRes, sumRes] = await Promise.all([
      fetch(`/api/invoices${qs}`, { cache: "no-store" }),
      fetch("/api/invoices/summary", { cache: "no-store" }),
    ]);
    const [invData, sumData] = await Promise.all([invRes.json(), sumRes.json()]);
    if (invData.ok) setInvoices(invData.invoices ?? []);
    if (sumData.ok) setSummary(sumData.summary ?? []);
    setLoading(false);
  }, [statusFilter, customerFilter]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  async function handleMarkPaid(invoiceId: string) {
    await fetch(`/api/invoices/${invoiceId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "paid" }),
    });
    void loadData();
  }

  const totalPending = summary.reduce((s, c) => s + c.pendingCount, 0);
  const totalOverdue = summary.reduce((s, c) => s + c.overdueCount, 0);
  const totalAmount = summary.reduce((s, c) => s + c.totalAmount, 0);

  return (
    <section className="space-y-4">
      <div className="rounded-xl border border-coral-tree-200 dark:border-white/[0.08] bg-white dark:bg-[#141414]/90 p-4">
        <h2 className="text-lg font-semibold">{t("invoices.title")}</h2>
        <p className="mt-1 text-sm text-zinc-500 dark:text-slate-400">{t("invoices.desc")}</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-yellow-200 dark:border-yellow-500/20 bg-yellow-50 dark:bg-yellow-500/5 p-4">
          <p className="text-xs text-yellow-700 dark:text-yellow-400">{t("invoices.totalPending")}</p>
          <p className="text-2xl font-bold text-yellow-800 dark:text-yellow-300">{totalPending}</p>
        </div>
        <div className="rounded-xl border border-red-200 dark:border-red-500/20 bg-red-50 dark:bg-red-500/5 p-4">
          <p className="text-xs text-red-700 dark:text-red-400">{t("invoices.totalOverdue")}</p>
          <p className="text-2xl font-bold text-red-800 dark:text-red-300">{totalOverdue}</p>
        </div>
        <div className="rounded-xl border border-blue-200 dark:border-blue-500/20 bg-blue-50 dark:bg-blue-500/5 p-4">
          <p className="text-xs text-blue-700 dark:text-blue-400">{t("invoices.totalAmount")}</p>
          <p className="text-2xl font-bold text-blue-800 dark:text-blue-300">{fmt(totalAmount)} VND</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
          className="cursor-pointer rounded-md border border-zinc-300 dark:border-white/[0.09] bg-white dark:bg-[#1a1a1a] px-3 py-2 text-sm transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50">
          <option value="">{t("invoices.all")}</option>
          <option value="pending">{t("invoices.status.pending")}</option>
          <option value="paid">{t("invoices.status.paid")}</option>
          <option value="overdue">{t("invoices.status.overdue")}</option>
        </select>
        <select value={customerFilter} onChange={(e) => setCustomerFilter(e.target.value)}
          className="cursor-pointer rounded-md border border-zinc-300 dark:border-white/[0.09] bg-white dark:bg-[#1a1a1a] px-3 py-2 text-sm transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50">
          <option value="">{t("invoices.filterCustomer")}</option>
          {customers.map((c) => <option key={c.id} value={c.id}>{c.customer_name}</option>)}
        </select>
      </div>

      {/* Invoice table */}
      <div className="rounded-xl border border-coral-tree-200 dark:border-white/[0.08] bg-white dark:bg-[#141414]/90 overflow-hidden">
        {loading ? (
          <p className="p-6 text-sm text-zinc-500 dark:text-slate-400">{t("loans.loading")}</p>
        ) : (
          <InvoiceTable invoices={invoices} onMarkPaid={handleMarkPaid} />
        )}
      </div>
    </section>
  );
}
