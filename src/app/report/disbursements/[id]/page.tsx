"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

import { useLanguage } from "@/components/language-provider";
import { SurplusDeficitBanner } from "@/components/invoice-tracking/surplus-deficit-banner";
import { InvoiceTable } from "@/components/invoice-tracking/invoice-table";
import { InvoiceFormModal } from "@/components/invoice-tracking/invoice-form-modal";
import { fmtDisplay as fmt, fmtDateDisplay as fmtDate } from "@/lib/invoice-tracking-format-helpers";

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

type SurplusDeficit = {
  disbursementAmount: number;
  totalInvoice: number;
  diff: number;
  label: "surplus" | "deficit" | "balanced";
};

type Disbursement = {
  id: string;
  amount: number;
  disbursementDate: string;
  description: string | null;
  status: string;
  loan: {
    id: string;
    contractNumber: string;
    customer: { id: string; customer_name: string };
  };
  invoices: Invoice[];
};

export default function DisbursementDetailPage() {
  const { t } = useLanguage();
  const { id } = useParams<{ id: string }>();
  const [disbursement, setDisbursement] = useState<Disbursement | null>(null);
  const [surplusDeficit, setSurplusDeficit] = useState<SurplusDeficit | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showModal, setShowModal] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/disbursements/${id}`, { cache: "no-store" });
    const data = await res.json();
    if (!data.ok) { setError(data.error ?? "Failed"); setLoading(false); return; }
    setDisbursement(data.disbursement);
    setSurplusDeficit(data.surplusDeficit);
    setLoading(false);
  }, [id]);

  useEffect(() => { void loadData(); }, [loadData]);

  async function handleMarkPaid(invoiceId: string) {
    await fetch(`/api/invoices/${invoiceId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "paid" }),
    });
    void loadData();
  }

  async function handleDeleteInvoice(invoiceId: string) {
    if (!confirm(t("disbursements.deleteConfirm"))) return;
    await fetch(`/api/invoices/${invoiceId}`, { method: "DELETE" });
    void loadData();
  }

  if (loading) return <p className="p-6 text-sm text-zinc-500 dark:text-slate-400">{t("disbursements.loading")}</p>;
  if (error || !disbursement) return <p className="p-6 text-sm text-red-700 dark:text-red-400">{error || "Not found"}</p>;

  return (
    <section className="space-y-4">
      {/* Breadcrumb info */}
      <div className="rounded-xl border border-coral-tree-200 dark:border-white/[0.08] bg-white dark:bg-[#141414]/90 p-4">
        <div className="flex items-center gap-2 text-sm text-zinc-400 dark:text-slate-500 mb-2">
          <Link href="/report/loans" className="hover:underline transition-colors duration-150">{t("nav.loans")}</Link>
          <span>/</span>
          <Link href={`/report/loans/${disbursement.loan.id}`} className="hover:underline transition-colors duration-150">{disbursement.loan.contractNumber}</Link>
          <span>/</span>
          <span className="text-zinc-700 dark:text-slate-200">{t("disbursements.title")}</span>
        </div>
        <h2 className="text-lg font-semibold">
          {disbursement.loan.customer.customer_name} — {fmt(disbursement.amount)} VND
        </h2>
        <p className="text-sm text-zinc-500 dark:text-slate-400">
          {t("disbursements.date")}: {fmtDate(disbursement.disbursementDate)}
          {disbursement.description && ` — ${disbursement.description}`}
        </p>
      </div>

      {/* Surplus/deficit banner */}
      {surplusDeficit && <SurplusDeficitBanner {...surplusDeficit} />}

      {/* Invoice list */}
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold">{t("invoices.title")}</h3>
        <button
          type="button"
          onClick={() => setShowModal(true)}
          className="rounded-md bg-indigo-600 px-4 py-2 text-sm text-white hover:bg-indigo-700"
        >
          {t("invoices.add")}
        </button>
      </div>

      <div className="rounded-xl border border-coral-tree-200 dark:border-white/[0.08] bg-white dark:bg-[#141414]/90 overflow-hidden">
        <InvoiceTable
          invoices={disbursement.invoices}
          onMarkPaid={handleMarkPaid}
          onDelete={handleDeleteInvoice}
        />
      </div>

      {showModal && (
        <InvoiceFormModal
          disbursementId={disbursement.id}
          onClose={() => setShowModal(false)}
          onCreated={() => void loadData()}
        />
      )}
    </section>
  );
}
