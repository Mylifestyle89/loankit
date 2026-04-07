"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";

import { useLanguage } from "@/components/language-provider";
import { LoanStatusBadge } from "@/components/invoice-tracking/loan-status-badge";
import { LoanEditModal } from "@/components/invoice-tracking/loan-edit-modal";
import { DisbursementFormModal } from "@/components/invoice-tracking/disbursement-form-modal";
import { BeneficiaryModal } from "@/components/invoice-tracking/beneficiary-modal";
import { DisbursementReportModal } from "@/components/invoice-tracking/disbursement-report-modal";
import { KhcnDisbursementReportModal } from "@/components/invoice-tracking/khcn-disbursement-report-modal";
import { InvoiceFormModal } from "@/components/invoice-tracking/invoice-form-modal";
import { PaginationControls } from "@/components/invoice-tracking/pagination-controls";
import { DisbursementTable, type DisbursementRow } from "@/components/invoice-tracking/loan-detail-disbursement-table";
import { LoanCollateralPicker, type PickerCollateral } from "./components/loan-collateral-picker";
import { LoanDetailHeader } from "./components/loan-detail-header";
import { LoanDisbursementSummaryCards } from "./components/loan-disbursement-summary-cards";

type DisbursementSummary = {
  totalDisbursed: number;
  disbursementCount: number;
  activeCount: number;
  completedCount: number;
};

import type { Loan } from "../types";


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

  // Collateral picker
  const [collaterals, setCollaterals] = useState<PickerCollateral[]>([]);

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

  // Fetch customer collaterals for picker (after loan loads)
  useEffect(() => {
    if (!loan?.customer?.id) return;
    fetch(`/api/customers/${loan.customer.id}/collaterals`)
      .then((r) => r.json())
      .then((d) => {
        setCollaterals((d.collaterals ?? []).map((c: any) => ({
          id: c.id, name: c.name, collateral_type: c.collateral_type,
          total_value: c.total_value, obligation: c.obligation,
        })));
      })
      .catch(() => {});
  }, [loan?.customer?.id]);

  const selectedCollateralIds = useMemo(() => {
    try { return JSON.parse(loan?.selectedCollateralIds || "[]") as string[]; }
    catch { return [] as string[]; }
  }, [loan?.selectedCollateralIds]);

  function handleCreated() {
    void loadDisbursements();
  }

  if (loading) return (
    <div className="flex items-center justify-center py-16">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand-200 border-t-brand-500 dark:border-brand-700 dark:border-t-brand-400" />
    </div>
  );
  if (error || !loan) return <p className="p-6 text-sm text-red-700 dark:text-red-400">{error || "Not found"}</p>;

  return (
    <section className="space-y-5">
      {/* Hero card */}
      <LoanDetailHeader
        loan={loan}
        onEditLoan={() => setShowEditModal(true)}
        onOpenBeneficiaryModal={() => setShowBeneficiaryModal(true)}
      />

      {/* Collateral picker */}
      {collaterals.length > 0 && loan && (
        <LoanCollateralPicker
          collaterals={collaterals}
          initialSelectedIds={selectedCollateralIds}
          onSave={async (ids) => {
            const res = await fetch(`/api/loans/${loan.id}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ selectedCollateralIds: JSON.stringify(ids) }),
            });
            if (!res.ok) throw new Error("Lưu thất bại");
            void loadLoan();
          }}
        />
      )}

      {/* Summary cards */}
      {summary && <LoanDisbursementSummaryCards summary={summary} />}

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t("disbursements.searchPlaceholder") ?? "Tìm kiếm mô tả..."}
          className="flex-1 min-w-[200px] rounded-lg border border-zinc-200 dark:border-white/[0.09] bg-white dark:bg-[#1a1a1a] px-3 py-2 text-sm shadow-sm transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="cursor-pointer rounded-lg border border-zinc-200 dark:border-white/[0.09] bg-white dark:bg-[#1a1a1a] px-3 py-2 text-sm shadow-sm transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40"
        >
          <option value="">{t("invoices.all") ?? "Tất cả"}</option>
          <option value="active">{t("disbursements.active") ?? "Đang hoạt động"}</option>
          <option value="completed">{t("disbursements.completed") ?? "Đã hoàn thành"}</option>
          <option value="cancelled">{t("disbursements.cancelled") ?? "Đã hủy"}</option>
        </select>
        <button
          type="button"
          onClick={() => setShowModal(true)}
          className="inline-flex items-center gap-1.5 rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white shadow-sm shadow-brand-500/25 transition-all hover:shadow-md hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/50"
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
        loan.isKhcn ? (
          <KhcnDisbursementReportModal
            loanId={loan.id}
            disbursementId={reportDisbursementId}
            onClose={() => setReportDisbursementId(null)}
          />
        ) : (
          <DisbursementReportModal
            loanId={loan.id}
            disbursementId={reportDisbursementId}
            onClose={() => setReportDisbursementId(null)}
          />
        )
      )}

      {invoiceTarget && (
        <InvoiceFormModal
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
