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

  if (loading) return <p className="p-6 text-sm text-zinc-500 dark:text-slate-400">{t("loans.loading")}</p>;
  if (error || !loan) return <p className="p-6 text-sm text-red-700 dark:text-red-400">{error || "Not found"}</p>;

  return (
    <section className="space-y-4">
      {/* Loan info card */}
      <div className="rounded-xl border border-coral-tree-200 dark:border-white/[0.08] bg-white dark:bg-[#141414]/90 p-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">{loan.contractNumber}</h2>
            <p className="text-sm text-zinc-500 dark:text-slate-400">{loan.customer.customer_name}</p>
          </div>
          <div className="flex items-center gap-2">
            <LoanStatusBadge status={loan.status} />
            <button
              type="button"
              onClick={() => setShowBeneficiaryModal(true)}
              className="cursor-pointer rounded-md border border-coral-tree-300 dark:border-white/[0.09] px-3 py-1 text-xs transition-colors duration-150 hover:bg-coral-tree-100 dark:hover:bg-white/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50"
            >
              {t("beneficiaries.title") ?? "Đơn vị thụ hưởng"}
            </button>
            <button
              type="button"
              onClick={() => setShowEditModal(true)}
              className="cursor-pointer rounded-md border border-coral-tree-300 dark:border-white/[0.09] px-3 py-1 text-xs transition-colors duration-150 hover:bg-coral-tree-100 dark:hover:bg-white/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50"
            >
              {t("common.edit")}
            </button>
            <Link
              href={`/report/invoices?customerId=${loan.customer.id}`}
              className="rounded-md border border-coral-tree-300 dark:border-white/[0.09] px-3 py-1 text-xs transition-colors duration-150 hover:bg-coral-tree-100 dark:hover:bg-white/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50"
            >
              {t("invoices.manage") ?? "Quản lý hóa đơn"}
            </Link>
          </div>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-4 text-sm md:grid-cols-4">
          <div>
            <span className="text-zinc-400 dark:text-slate-500">{t("loans.loanAmount")}</span>
            <p className="font-medium">{fmt(loan.loanAmount)} VND</p>
          </div>
          <div>
            <span className="text-zinc-400 dark:text-slate-500">{t("loans.interestRate")}</span>
            <p className="font-medium">{loan.interestRate != null ? `${loan.interestRate}%` : "—"}</p>
          </div>
          <div>
            <span className="text-zinc-400 dark:text-slate-500">{t("loans.startDate")}</span>
            <p className="font-medium">{fmtDate(loan.startDate)}</p>
          </div>
          <div>
            <span className="text-zinc-400 dark:text-slate-500">{t("loans.endDate")}</span>
            <p className="font-medium">{fmtDate(loan.endDate)}</p>
          </div>
        </div>
        {(loan.collateralValue != null || loan.securedObligation != null || loan.disbursementLimitByAsset != null) && (
          <div className="mt-3 grid grid-cols-2 gap-4 text-sm md:grid-cols-4">
            <div>
              <span className="text-zinc-400 dark:text-slate-500">{t("loans.collateralValue")}</span>
              <p className="font-medium">{loan.collateralValue != null ? `${fmt(loan.collateralValue)} VND` : "—"}</p>
            </div>
            <div>
              <span className="text-zinc-400 dark:text-slate-500">{t("loans.securedObligation")}</span>
              <p className="font-medium">{loan.securedObligation != null ? `${fmt(loan.securedObligation)} VND` : "—"}</p>
            </div>
            <div>
              <span className="text-zinc-400 dark:text-slate-500">{t("loans.disbursementLimitByAsset")}</span>
              <p className="font-medium">{loan.disbursementLimitByAsset != null ? `${fmt(loan.disbursementLimitByAsset)} VND` : "—"}</p>
            </div>
          </div>
        )}
        {loan.purpose && (
          <p className="mt-2 text-sm text-zinc-500 dark:text-slate-400">{t("loans.purpose")}: {loan.purpose}</p>
        )}
      </div>

      {/* Summary bar */}
      {summary && (
        <div className="flex flex-wrap gap-4 rounded-xl border border-coral-tree-200 dark:border-white/[0.08] bg-white dark:bg-[#141414]/90 px-4 py-3 text-sm">
          <div>
            <span className="text-zinc-400 dark:text-slate-500">{t("disbursements.totalDisbursed") ?? "Tổng giải ngân"}</span>
            <p className="font-medium tabular-nums">{fmt(summary.totalDisbursed)} VND</p>
          </div>
          <div>
            <span className="text-zinc-400 dark:text-slate-500">{t("disbursements.count") ?? "Số lượng"}</span>
            <p className="font-medium tabular-nums">{summary.disbursementCount}</p>
          </div>
          <div>
            <span className="text-zinc-400 dark:text-slate-500">{t("disbursements.active") ?? "Đang hoạt động"}</span>
            <p className="font-medium tabular-nums">{summary.activeCount}</p>
          </div>
          <div>
            <span className="text-zinc-400 dark:text-slate-500">{t("disbursements.completed") ?? "Đã hoàn thành"}</span>
            <p className="font-medium tabular-nums">{summary.completedCount}</p>
          </div>
        </div>
      )}

      {/* Toolbar: search + filter + add */}
      <div className="flex flex-wrap items-center gap-3">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t("disbursements.searchPlaceholder") ?? "Tìm kiếm mô tả..."}
          className="flex-1 min-w-[200px] rounded-md border border-zinc-300 dark:border-white/[0.09] bg-white dark:bg-[#1a1a1a] px-3 py-2 text-sm transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="cursor-pointer rounded-md border border-zinc-300 dark:border-white/[0.09] bg-white dark:bg-[#1a1a1a] px-3 py-2 text-sm transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50"
        >
          <option value="">{t("invoices.all") ?? "Tất cả"}</option>
          <option value="active">{t("disbursements.active") ?? "Đang hoạt động"}</option>
          <option value="completed">{t("disbursements.completed") ?? "Đã hoàn thành"}</option>
          <option value="cancelled">{t("disbursements.cancelled") ?? "Đã hủy"}</option>
        </select>
        <button
          type="button"
          onClick={() => setShowModal(true)}
          className="cursor-pointer rounded-md bg-indigo-600 px-4 py-2 text-sm text-white transition-colors duration-150 hover:bg-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50"
        >
          {t("disbursements.add")}
        </button>
      </div>

      {/* Disbursement table */}
      <div className="rounded-xl border border-coral-tree-200 dark:border-white/[0.08] bg-white dark:bg-[#141414]/90 overflow-hidden">
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
