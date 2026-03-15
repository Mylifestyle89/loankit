"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";

import { useLanguage } from "@/components/language-provider";
import { LoanStatusBadge } from "@/components/invoice-tracking/loan-status-badge";
import { LoanEditModal } from "@/components/invoice-tracking/loan-edit-modal";
import { DisbursementFormModal } from "@/components/invoice-tracking/disbursement-form-modal";
import { BeneficiaryModal } from "@/components/invoice-tracking/beneficiary-modal";
import { DisbursementReportModal } from "@/components/invoice-tracking/disbursement-report-modal";
import { AddInvoiceFromLoanModal } from "@/components/invoice-tracking/add-invoice-from-loan-modal";
import { PaginationControls } from "@/components/invoice-tracking/pagination-controls";
import { DisbursementTable, type DisbursementRow } from "@/components/invoice-tracking/loan-detail-disbursement-table";
import { ArrowLeft, Banknote, CheckCircle, Layers, Zap } from "lucide-react";
import { fmtDisplay as fmt, fmtDateDisplay as fmtDate } from "@/lib/invoice-tracking-format-helpers";

type DisbursementSummary = {
  totalDisbursed: number;
  disbursementCount: number;
  activeCount: number;
  completedCount: number;
};

type Loan = {
  id: string;
  contractNumber: string;
  loanAmount: number;
  interestRate: number | null;
  startDate: string;
  endDate: string;
  purpose: string | null;
  collateralValue: number | null;
  securedObligation: number | null;
  disbursementLimitByAsset: number | null;
  status: string;
  customer: { id: string; customer_name: string };
};

const PAGE_SIZE = 20;

export default function LoanDetailPage() {
  const { t } = useLanguage();
  const { id } = useParams<{ id: string }>();

  // Loan info
  const [loan, setLoan] = useState<Loan | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Disbursements (paginated)
  const [disbursements, setDisbursements] = useState<DisbursementRow[]>([]);
  const [summary, setSummary] = useState<DisbursementSummary | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [disbLoading, setDisbLoading] = useState(false);

  const [showModal, setShowModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showBeneficiaryModal, setShowBeneficiaryModal] = useState(false);
  const [editingDisbursementId, setEditingDisbursementId] = useState<string | null>(null);
  const [reportDisbursementId, setReportDisbursementId] = useState<string | null>(null);
  const [invoiceTarget, setInvoiceTarget] = useState<{ disbursementId: string; lineId: string; name: string; amount: number } | null>(null);

  // Debounce search input (400ms)
  const searchTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => {
    searchTimer.current = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(searchTimer.current);
  }, [search]);

  // Reset page khi thay doi filter (truoc khi fetch)
  const prevFilter = useRef({ status: statusFilter, search: debouncedSearch });
  useEffect(() => {
    const prev = prevFilter.current;
    if (prev.status !== statusFilter || prev.search !== debouncedSearch) {
      prevFilter.current = { status: statusFilter, search: debouncedSearch };
      setPage(1);
    }
  }, [statusFilter, debouncedSearch]);

  // Load loan info (once)
  const loadLoan = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/loans/${id}`, { cache: "no-store" });
      const data = await res.json();
      if (!data.ok) { setError(data.error ?? "Failed"); return; }
      setLoan(data.loan);
    } catch {
      setError("Không thể tải thông tin khoản vay");
    } finally {
      setLoading(false);
    }
  }, [id]);

  // Load disbursements (paginated)
  const loadDisbursements = useCallback(async () => {
    setDisbLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("pageSize", String(PAGE_SIZE));
      if (statusFilter) params.set("status", statusFilter);
      if (debouncedSearch.trim()) params.set("search", debouncedSearch.trim());

      const res = await fetch(`/api/loans/${id}/disbursements?${params}`, { cache: "no-store" });
      const data = await res.json();
      if (data.ok) {
        setDisbursements(data.disbursements ?? []);
        setTotal(data.total ?? 0);
        setSummary(data.summary ?? null);
      }
    } catch {
      // Network error — keep existing data, silently fail
    } finally {
      setDisbLoading(false);
    }
  }, [id, page, statusFilter, debouncedSearch]);

  useEffect(() => { void loadLoan(); }, [loadLoan]);
  useEffect(() => { void loadDisbursements(); }, [loadDisbursements]);

  function handleCreated() {
    void loadDisbursements();
  }

  if (loading) return (
    <div className="flex items-center justify-center py-16">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-violet-200 border-t-violet-600 dark:border-violet-800 dark:border-t-violet-400" />
    </div>
  );
  if (error || !loan) return <p className="p-6 text-sm text-red-700 dark:text-red-400">{error || "Not found"}</p>;

  return (
    <section className="space-y-5">
      {/* Hero card */}
      <div className="relative overflow-hidden rounded-2xl border border-violet-100 dark:border-violet-500/10 bg-gradient-to-br from-violet-50 via-white to-fuchsia-50 dark:from-violet-950/30 dark:via-[#141414] dark:to-fuchsia-950/20 p-5">
        <div className="absolute -right-12 -top-12 h-40 w-40 rounded-full bg-violet-200/30 blur-3xl dark:bg-violet-500/10" />
        <div className="relative">
          {/* Top row: back + title + actions */}
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <Link href={loan.customer?.id ? `/report/customers/${loan.customer.id}?tab=loans` : "/report/loans"}
                className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/80 dark:bg-white/[0.06] border border-zinc-200 dark:border-white/[0.08] text-zinc-500 dark:text-slate-400 transition-colors hover:bg-violet-50 dark:hover:bg-violet-500/10 hover:text-violet-600 dark:hover:text-violet-400">
                <ArrowLeft className="h-4 w-4" />
              </Link>
              <div>
                <div className="flex items-center gap-2.5">
                  <h2 className="text-xl font-bold tracking-tight bg-gradient-to-r from-violet-700 to-fuchsia-600 dark:from-violet-400 dark:to-fuchsia-400 bg-clip-text text-transparent">
                    {loan.contractNumber}
                  </h2>
                  <LoanStatusBadge status={loan.status} />
                </div>
                <p className="mt-0.5 text-sm text-zinc-500 dark:text-slate-400">{loan.customer.customer_name}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => setShowEditModal(true)}
                className="rounded-lg bg-gradient-to-r from-violet-600 to-fuchsia-600 px-4 py-1.5 text-xs font-medium text-white shadow-sm shadow-violet-500/25 transition-all hover:shadow-md hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/40">
                Thông tin hợp đồng tín dụng
              </button>
              <button type="button" onClick={() => setShowBeneficiaryModal(true)}
                className="rounded-lg border border-zinc-200 dark:border-white/[0.09] bg-white/80 dark:bg-white/[0.05] px-3 py-1.5 text-xs font-medium text-zinc-600 dark:text-slate-300 transition-colors hover:bg-violet-50 dark:hover:bg-violet-500/10 hover:text-violet-700 dark:hover:text-violet-400">
                {t("beneficiaries.title") ?? "Đơn vị thụ hưởng"}
              </button>
              <Link href={`/report/invoices?customerId=${loan.customer.id}`}
                className="rounded-lg border border-zinc-200 dark:border-white/[0.09] bg-white/80 dark:bg-white/[0.05] px-3 py-1.5 text-xs font-medium text-zinc-500 dark:text-slate-400 transition-colors hover:bg-zinc-50 dark:hover:bg-white/[0.06]">
                Hóa đơn
              </Link>
            </div>
          </div>

          {/* Loan details grid */}
          <div className="relative mt-4 grid grid-cols-2 gap-3 text-sm md:grid-cols-4">
            <div className="rounded-lg bg-white/60 dark:bg-white/[0.04] border border-zinc-100 dark:border-white/[0.05] p-3">
              <span className="text-xs text-zinc-400 dark:text-slate-500">{t("loans.loanAmount")}</span>
              <p className="mt-0.5 font-semibold tabular-nums">{fmt(loan.loanAmount)} VND</p>
            </div>
            <div className="rounded-lg bg-white/60 dark:bg-white/[0.04] border border-zinc-100 dark:border-white/[0.05] p-3">
              <span className="text-xs text-zinc-400 dark:text-slate-500">{t("loans.interestRate")}</span>
              <p className="mt-0.5 font-semibold">{loan.interestRate != null ? `${loan.interestRate}%` : "—"}</p>
            </div>
            <div className="rounded-lg bg-white/60 dark:bg-white/[0.04] border border-zinc-100 dark:border-white/[0.05] p-3">
              <span className="text-xs text-zinc-400 dark:text-slate-500">{t("loans.startDate")}</span>
              <p className="mt-0.5 font-semibold">{fmtDate(loan.startDate)}</p>
            </div>
            <div className="rounded-lg bg-white/60 dark:bg-white/[0.04] border border-zinc-100 dark:border-white/[0.05] p-3">
              <span className="text-xs text-zinc-400 dark:text-slate-500">{t("loans.endDate")}</span>
              <p className="mt-0.5 font-semibold">{fmtDate(loan.endDate)}</p>
            </div>
          </div>
          {(loan.collateralValue != null || loan.securedObligation != null || loan.disbursementLimitByAsset != null) && (
            <div className="mt-2 grid grid-cols-2 gap-3 text-sm md:grid-cols-4">
              <div className="rounded-lg bg-white/60 dark:bg-white/[0.04] border border-zinc-100 dark:border-white/[0.05] p-3">
                <span className="text-xs text-zinc-400 dark:text-slate-500">{t("loans.collateralValue")}</span>
                <p className="mt-0.5 font-semibold tabular-nums">{loan.collateralValue != null ? `${fmt(loan.collateralValue)} VND` : "—"}</p>
              </div>
              <div className="rounded-lg bg-white/60 dark:bg-white/[0.04] border border-zinc-100 dark:border-white/[0.05] p-3">
                <span className="text-xs text-zinc-400 dark:text-slate-500">{t("loans.securedObligation")}</span>
                <p className="mt-0.5 font-semibold tabular-nums">{loan.securedObligation != null ? `${fmt(loan.securedObligation)} VND` : "—"}</p>
              </div>
              <div className="rounded-lg bg-white/60 dark:bg-white/[0.04] border border-zinc-100 dark:border-white/[0.05] p-3">
                <span className="text-xs text-zinc-400 dark:text-slate-500">{t("loans.disbursementLimitByAsset")}</span>
                <p className="mt-0.5 font-semibold tabular-nums">{loan.disbursementLimitByAsset != null ? `${fmt(loan.disbursementLimitByAsset)} VND` : "—"}</p>
              </div>
            </div>
          )}
          {loan.purpose && (
            <p className="mt-3 text-sm text-zinc-500 dark:text-slate-400">{t("loans.purpose")}: {loan.purpose}</p>
          )}
        </div>
      </div>

      {/* Summary cards */}
      {summary && (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <div className="flex items-center gap-3 rounded-xl border border-zinc-200 dark:border-white/[0.07] bg-white dark:bg-[#161616] p-3.5 shadow-sm">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-100 dark:bg-violet-500/15">
              <Banknote className="h-5 w-5 text-violet-600 dark:text-violet-400" />
            </div>
            <div>
              <p className="text-xs text-zinc-400 dark:text-slate-500">{t("disbursements.totalDisbursed") ?? "Tổng giải ngân"}</p>
              <p className="font-bold tabular-nums text-sm">{fmt(summary.totalDisbursed)}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-xl border border-zinc-200 dark:border-white/[0.07] bg-white dark:bg-[#161616] p-3.5 shadow-sm">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-100 dark:bg-sky-500/15">
              <Layers className="h-5 w-5 text-sky-600 dark:text-sky-400" />
            </div>
            <div>
              <p className="text-xs text-zinc-400 dark:text-slate-500">{t("disbursements.count") ?? "Số lượng"}</p>
              <p className="font-bold tabular-nums text-sm">{summary.disbursementCount}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-xl border border-zinc-200 dark:border-white/[0.07] bg-white dark:bg-[#161616] p-3.5 shadow-sm">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100 dark:bg-emerald-500/15">
              <Zap className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <p className="text-xs text-zinc-400 dark:text-slate-500">{t("disbursements.active") ?? "Đang hoạt động"}</p>
              <p className="font-bold tabular-nums text-sm">{summary.activeCount}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-xl border border-zinc-200 dark:border-white/[0.07] bg-white dark:bg-[#161616] p-3.5 shadow-sm">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-fuchsia-100 dark:bg-fuchsia-500/15">
              <CheckCircle className="h-5 w-5 text-fuchsia-600 dark:text-fuchsia-400" />
            </div>
            <div>
              <p className="text-xs text-zinc-400 dark:text-slate-500">{t("disbursements.completed") ?? "Đã hoàn thành"}</p>
              <p className="font-bold tabular-nums text-sm">{summary.completedCount}</p>
            </div>
          </div>
        </div>
      )}

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t("disbursements.searchPlaceholder") ?? "Tìm kiếm mô tả..."}
          className="flex-1 min-w-[200px] rounded-lg border border-zinc-200 dark:border-white/[0.09] bg-white dark:bg-[#1a1a1a] px-3 py-2 text-sm shadow-sm transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/40"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="cursor-pointer rounded-lg border border-zinc-200 dark:border-white/[0.09] bg-white dark:bg-[#1a1a1a] px-3 py-2 text-sm shadow-sm transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/40"
        >
          <option value="">{t("invoices.all") ?? "Tất cả"}</option>
          <option value="active">{t("disbursements.active") ?? "Đang hoạt động"}</option>
          <option value="completed">{t("disbursements.completed") ?? "Đã hoàn thành"}</option>
          <option value="cancelled">{t("disbursements.cancelled") ?? "Đã hủy"}</option>
        </select>
        <button
          type="button"
          onClick={() => setShowModal(true)}
          className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-violet-600 to-fuchsia-600 px-4 py-2 text-sm font-medium text-white shadow-sm shadow-violet-500/25 transition-all hover:shadow-md hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/50"
        >
          {t("disbursements.add")}
        </button>
      </div>

      {/* Disbursement table */}
      <div className="rounded-xl border border-zinc-200 dark:border-white/[0.07] bg-white dark:bg-[#161616] overflow-hidden shadow-sm">
        <DisbursementTable
          disbursements={disbursements}
          loading={disbLoading}
          t={t}
          onEdit={setEditingDisbursementId}
          onReport={setReportDisbursementId}
          onAddInvoice={setInvoiceTarget}
        />
        <PaginationControls page={page} pageSize={PAGE_SIZE} total={total} onPageChange={setPage} />
      </div>

      {showModal && (
        <DisbursementFormModal
          loanId={loan.id}
          loanAmount={loan.loanAmount}
          onClose={() => setShowModal(false)}
          onCreated={handleCreated}
        />
      )}

      {showEditModal && (
        <LoanEditModal
          loan={loan}
          customerId={loan.customer?.id}
          onClose={() => setShowEditModal(false)}
          onUpdated={() => void loadLoan()}
        />
      )}

      {showBeneficiaryModal && (
        <BeneficiaryModal
          loanId={loan.id}
          contractNumber={loan.contractNumber}
          onClose={() => setShowBeneficiaryModal(false)}
        />
      )}

      {editingDisbursementId && (
        <DisbursementFormModal
          loanId={loan.id}
          loanAmount={loan.loanAmount}
          editDisbursementId={editingDisbursementId}
          onClose={() => setEditingDisbursementId(null)}
          onCreated={handleCreated}
        />
      )}

      {reportDisbursementId && (
        <DisbursementReportModal
          loanId={loan.id}
          disbursementId={reportDisbursementId}
          onClose={() => setReportDisbursementId(null)}
        />
      )}

      {invoiceTarget && (
        <AddInvoiceFromLoanModal
          disbursementId={invoiceTarget.disbursementId}
          beneficiaryLineId={invoiceTarget.lineId}
          beneficiaryName={invoiceTarget.name}
          defaultAmount={invoiceTarget.amount}
          onClose={() => setInvoiceTarget(null)}
          onCreated={handleCreated}
        />
      )}
    </section>
  );
}
