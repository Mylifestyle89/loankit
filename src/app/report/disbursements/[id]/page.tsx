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
    loanPlanId: string | null;
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

  async function handleDeleteInvoice(invoiceId: string) {
    if (!confirm(t("disbursements.deleteConfirm"))) return;
    await fetch(`/api/invoices/${invoiceId}`, { method: "DELETE" });
    void loadData();
  }

  if (loading) return (
    <div className="flex items-center justify-center py-16">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand-200 border-t-brand-500 dark:border-brand-700 dark:border-t-brand-400" />
    </div>
  );
  if (error || !disbursement) return <p className="p-6 text-sm text-red-600 dark:text-red-400">{error || "Not found"}</p>;

  return (
    <section className="space-y-5">
      {/* Hero card with gradient */}
      <div className="relative overflow-hidden rounded-2xl border border-brand-100 dark:border-brand-500/10 bg-gradient-to-br from-brand-50 via-white to-brand-100 dark:from-brand-950/30 dark:via-[#242220] dark:to-brand-900/20 p-5">
        <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-brand-200/30 blur-2xl dark:bg-brand-500/10" />
        <div className="relative">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-sm text-zinc-400 dark:text-slate-500 mb-3">
            <Link href="/report/loans" className="inline-flex items-center gap-1 hover:text-brand-500 dark:hover:text-brand-400 transition-colors duration-150">
              <ArrowLeft className="h-3 w-3" />
              {t("nav.loans")}
            </Link>
            <span>/</span>
            <Link href={`/report/loans/${disbursement.loan.id}`} className="hover:text-brand-500 dark:hover:text-brand-400 transition-colors duration-150">{disbursement.loan.contractNumber}</Link>
            <span>/</span>
            <span className="text-zinc-700 dark:text-slate-200">{t("disbursements.title")}</span>
          </div>

          <h2 className="text-xl font-bold tracking-tight text-brand-600 dark:text-brand-400">
            {disbursement.loan.customer.customer_name}
          </h2>

          {/* Detail stats */}
          <div className="mt-3 flex flex-wrap items-center gap-5 text-sm">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-100 dark:bg-brand-500/15">
                <Banknote className="h-4 w-4 text-brand-500 dark:text-brand-400" />
              </div>
              <div>
                <p className="text-xs text-zinc-400 dark:text-slate-500">{t("disbursements.amount")}</p>
                <p className="font-bold tabular-nums">{fmt(disbursement.amount)} VND</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-100 dark:bg-brand-400/15">
                <Calendar className="h-4 w-4 text-brand-500 dark:text-brand-400" />
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
          className="inline-flex items-center gap-1.5 rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white shadow-sm shadow-brand-500/25 transition-all duration-200 hover:shadow-md hover:shadow-brand-500/30 hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/50"
        >
          <Plus className="h-4 w-4" />
          {t("invoices.add")}
        </button>
      </div>

      <div className="rounded-2xl border border-zinc-200 dark:border-white/[0.07] bg-white dark:bg-[#161616] shadow-sm overflow-hidden">
        <InvoiceTable
          invoices={disbursement.invoices}
          onDelete={handleDeleteInvoice}
          loanPlanId={disbursement.loan.loanPlanId}
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
