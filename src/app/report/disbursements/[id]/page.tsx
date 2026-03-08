"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

import { ArrowLeft, Banknote, Calendar, Plus } from "lucide-react";

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

  if (loading) return (
    <div className="flex items-center justify-center py-16">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-violet-200 border-t-violet-600 dark:border-violet-800 dark:border-t-violet-400" />
    </div>
  );
  if (error || !disbursement) return <p className="p-6 text-sm text-red-600 dark:text-red-400">{error || "Not found"}</p>;

  return (
    <section className="space-y-5">
      {/* Hero card with gradient */}
      <div className="relative overflow-hidden rounded-2xl border border-violet-100 dark:border-violet-500/10 bg-gradient-to-br from-violet-50 via-white to-fuchsia-50 dark:from-violet-950/30 dark:via-[#141414] dark:to-fuchsia-950/20 p-5">
        <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-violet-200/30 blur-2xl dark:bg-violet-500/10" />
        <div className="relative">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-sm text-zinc-400 dark:text-slate-500 mb-3">
            <Link href="/report/loans" className="inline-flex items-center gap-1 hover:text-violet-600 dark:hover:text-violet-400 transition-colors duration-150">
              <ArrowLeft className="h-3 w-3" />
              {t("nav.loans")}
            </Link>
            <span>/</span>
            <Link href={`/report/loans/${disbursement.loan.id}`} className="hover:text-violet-600 dark:hover:text-violet-400 transition-colors duration-150">{disbursement.loan.contractNumber}</Link>
            <span>/</span>
            <span className="text-zinc-700 dark:text-slate-200">{t("disbursements.title")}</span>
          </div>

          <h2 className="text-xl font-bold tracking-tight bg-gradient-to-r from-violet-700 to-fuchsia-600 dark:from-violet-400 dark:to-fuchsia-400 bg-clip-text text-transparent">
            {disbursement.loan.customer.customer_name}
          </h2>

          {/* Detail stats */}
          <div className="mt-3 flex flex-wrap items-center gap-5 text-sm">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-100 dark:bg-violet-500/15">
                <Banknote className="h-4 w-4 text-violet-600 dark:text-violet-400" />
              </div>
              <div>
                <p className="text-xs text-zinc-400 dark:text-slate-500">{t("disbursements.amount")}</p>
                <p className="font-bold tabular-nums">{fmt(disbursement.amount)} VND</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-fuchsia-100 dark:bg-fuchsia-500/15">
                <Calendar className="h-4 w-4 text-fuchsia-600 dark:text-fuchsia-400" />
              </div>
              <div>
                <p className="text-xs text-zinc-400 dark:text-slate-500">{t("disbursements.date")}</p>
                <p className="font-semibold tabular-nums">{fmtDate(disbursement.disbursementDate)}</p>
              </div>
            </div>
            {disbursement.description && (
              <p className="text-sm text-zinc-500 dark:text-slate-400">{disbursement.description}</p>
            )}
          </div>
        </div>
      </div>

      {/* Surplus/deficit banner */}
      {surplusDeficit && <SurplusDeficitBanner {...surplusDeficit} />}

      {/* Invoice section */}
      <div className="flex items-center justify-between">
        <h3 className="text-base font-bold tracking-tight">{t("invoices.title")}</h3>
        <button
          type="button"
          onClick={() => setShowModal(true)}
          className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-violet-600 to-fuchsia-600 px-4 py-2 text-sm font-medium text-white shadow-sm shadow-violet-500/25 transition-all duration-200 hover:shadow-md hover:shadow-violet-500/30 hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/50"
        >
          <Plus className="h-4 w-4" />
          {t("invoices.add")}
        </button>
      </div>

      <div className="rounded-2xl border border-zinc-200 dark:border-white/[0.07] bg-white dark:bg-[#161616] shadow-sm overflow-hidden">
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
