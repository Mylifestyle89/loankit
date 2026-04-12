"use client";

/**
 * loan-detail-header.tsx
 *
 * Hero card for the loan detail page: back link, contract number,
 * status badge, action buttons, and loan details grid.
 */

import Link from "next/link";
import { useState, useRef, useEffect } from "react";
import { ArrowLeft, ChevronDown, Pencil, Trash2 } from "lucide-react";
import { fmtDisplay as fmt, fmtDateDisplay as fmtDate } from "@/lib/invoice-tracking-format-helpers";
import { useLanguage } from "@/components/language-provider";

import type { Loan } from "../../types";

const STATUS_OPTIONS = [
  { value: "active", label: "Đang hoạt động", dot: "bg-emerald-500", bg: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400" },
  { value: "completed", label: "Đã hoàn thành", dot: "bg-sky-500", bg: "bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-400" },
  { value: "cancelled", label: "Đã hủy", dot: "bg-zinc-400", bg: "bg-zinc-50 text-zinc-500 dark:bg-zinc-500/10 dark:text-zinc-400" },
];

type Props = {
  loan: Loan;
  onEditLoan: () => void;
  onOpenBeneficiaryModal: () => void;
  onStatusChange?: (status: string) => void;
  onContractNumberChange?: (contractNumber: string) => void;
  onDeleteLoan?: () => void;
  isCard?: boolean;
};

export function LoanDetailHeader({ loan, onEditLoan, onOpenBeneficiaryModal, onStatusChange, onContractNumberChange, onDeleteLoan, isCard }: Props) {
  const { t } = useLanguage();
  const [statusOpen, setStatusOpen] = useState(false);
  const statusRef = useRef<HTMLDivElement>(null);

  // Inline edit for contract number
  const [editingContract, setEditingContract] = useState(false);
  const [contractDraft, setContractDraft] = useState(loan.contractNumber);
  const contractInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingContract) contractInputRef.current?.select();
  }, [editingContract]);

  function commitContract() {
    const trimmed = contractDraft.trim();
    setEditingContract(false);
    if (trimmed && trimmed !== loan.contractNumber) {
      onContractNumberChange?.(trimmed);
    } else {
      setContractDraft(loan.contractNumber);
    }
  }

  // Close dropdown on outside click
  useEffect(() => {
    if (!statusOpen) return;
    function handle(e: MouseEvent) {
      if (statusRef.current && !statusRef.current.contains(e.target as Node)) setStatusOpen(false);
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [statusOpen]);

  const currentStatus = STATUS_OPTIONS.find((s) => s.value === loan.status) ?? STATUS_OPTIONS[0];

  return (
    <div className="relative overflow-hidden rounded-2xl border border-brand-100 dark:border-brand-500/10 bg-gradient-to-br from-brand-50 via-white to-brand-100 dark:from-brand-950/30 dark:via-[#242220] dark:to-brand-900/20 p-5">
      <div className="absolute -right-12 -top-12 h-40 w-40 rounded-full bg-brand-200/30 blur-3xl dark:bg-brand-500/10" />
      <div className="relative">
        {/* Top row: back + title + actions */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
          <div className="flex items-start gap-3 min-w-0">
            <Link
              href={loan.customer?.id ? `/report/customers/${loan.customer.id}?tab=loans` : "/report/loans"}
              className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/80 dark:bg-white/[0.06] border border-zinc-200 dark:border-white/[0.08] text-zinc-500 dark:text-slate-400 transition-colors hover:bg-brand-50 dark:hover:bg-brand-500/10 hover:text-brand-500 dark:hover:text-brand-400"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div className="min-w-0">
              <div className="flex items-center gap-2.5">
                {editingContract ? (
                  <input
                    ref={contractInputRef}
                    value={contractDraft}
                    onChange={(e) => setContractDraft(e.target.value)}
                    onBlur={commitContract}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") commitContract();
                      if (e.key === "Escape") { setContractDraft(loan.contractNumber); setEditingContract(false); }
                    }}
                    className="text-xl font-bold tracking-tight text-brand-600 dark:text-brand-400 bg-transparent border-b-2 border-brand-500 outline-none min-w-[120px] max-w-[320px]"
                  />
                ) : (
                  <button
                    type="button"
                    onClick={() => { setContractDraft(loan.contractNumber); setEditingContract(true); }}
                    className="group flex items-center gap-1.5 truncate text-xl font-bold tracking-tight text-brand-600 dark:text-brand-400 hover:text-brand-700 dark:hover:text-brand-300 transition-colors"
                    title="Nhấn để sửa số hợp đồng"
                  >
                    {loan.contractNumber}
                    <Pencil className="h-3.5 w-3.5 opacity-0 group-hover:opacity-50 transition-opacity shrink-0" />
                  </button>
                )}
                {/* Clickable status badge with dropdown */}
                <div className="relative" ref={statusRef}>
                  <button
                    type="button"
                    onClick={() => setStatusOpen((v) => !v)}
                    className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset cursor-pointer transition-all hover:brightness-95 ${currentStatus.bg} ring-current/20`}
                  >
                    <span className={`h-1.5 w-1.5 rounded-full ${currentStatus.dot}`} />
                    {currentStatus.label}
                    <ChevronDown className="h-3 w-3 opacity-50" />
                  </button>
                  {statusOpen && (
                    <div className="absolute left-0 top-full mt-1 z-20 min-w-[160px] rounded-lg border border-zinc-200 dark:border-white/[0.1] bg-white dark:bg-[#1e1e1e] shadow-lg py-1">
                      {STATUS_OPTIONS.map((opt) => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => {
                            setStatusOpen(false);
                            if (opt.value !== loan.status) onStatusChange?.(opt.value);
                          }}
                          className={`w-full flex items-center gap-2 px-3 py-1.5 text-xs transition-colors hover:bg-zinc-50 dark:hover:bg-white/[0.05] ${
                            opt.value === loan.status ? "font-semibold" : ""
                          }`}
                        >
                          <span className={`h-2 w-2 rounded-full ${opt.dot}`} />
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <p className="mt-0.5 text-sm text-zinc-500 dark:text-slate-400">{loan.customer.customer_name}</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={onEditLoan}
              className="rounded-lg bg-brand-500 px-4 py-1.5 text-xs font-medium text-white shadow-sm shadow-brand-500/25 transition-all hover:shadow-md hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40"
            >
              Thông tin hợp đồng tín dụng
            </button>
            {!isCard && (
              <button
                type="button"
                onClick={onOpenBeneficiaryModal}
                className="rounded-lg border border-zinc-200 dark:border-white/[0.09] bg-white/80 dark:bg-white/[0.05] px-3 py-1.5 text-xs font-medium text-zinc-600 dark:text-slate-300 transition-colors hover:bg-brand-50 dark:hover:bg-brand-500/10 hover:text-brand-600 dark:hover:text-brand-400"
              >
                {t("beneficiaries.title") ?? "Đơn vị thụ hưởng"}
              </button>
            )}
            {!isCard && (
              <Link
                href={`/report/invoices?customerId=${loan.customer.id}`}
                className="rounded-lg border border-zinc-200 dark:border-white/[0.09] bg-white/80 dark:bg-white/[0.05] px-3 py-1.5 text-xs font-medium text-zinc-500 dark:text-slate-400 transition-colors hover:bg-zinc-50 dark:hover:bg-white/[0.06]"
              >
                Hóa đơn
              </Link>
            )}
            {onDeleteLoan && (
              <button
                type="button"
                onClick={onDeleteLoan}
                className="rounded-lg border border-red-200 dark:border-red-500/20 bg-white/80 dark:bg-white/[0.05] px-3 py-1.5 text-xs font-medium text-red-500 dark:text-red-400 transition-colors hover:bg-red-50 dark:hover:bg-red-500/10"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Loan details grid */}
        <div className="relative mt-4 grid grid-cols-2 gap-3 text-sm md:grid-cols-4">
          <div className="rounded-lg bg-white/60 dark:bg-white/[0.04] border border-zinc-100 dark:border-white/[0.05] p-3">
            <span className="text-xs text-zinc-400 dark:text-slate-500">{isCard ? "Hạn mức thẻ" : t("loans.loanAmount")}</span>
            <p className="mt-0.5 font-semibold tabular-nums">{fmt(loan.loanAmount)} VND</p>
          </div>
          <div className="rounded-lg bg-white/60 dark:bg-white/[0.04] border border-zinc-100 dark:border-white/[0.05] p-3">
            <span className="text-xs text-zinc-400 dark:text-slate-500">{t("loans.interestRate")}</span>
            <p className="mt-0.5 font-semibold">{loan.interestRate != null ? `${loan.interestRate}%` : "—"}</p>
          </div>
          <div className="rounded-lg bg-white/60 dark:bg-white/[0.04] border border-zinc-100 dark:border-white/[0.05] p-3">
            <span className="text-xs text-zinc-400 dark:text-slate-500">{isCard ? "Ngày phát hành" : t("loans.startDate")}</span>
            <p className="mt-0.5 font-semibold">{fmtDate(loan.startDate)}</p>
          </div>
          <div className="rounded-lg bg-white/60 dark:bg-white/[0.04] border border-zinc-100 dark:border-white/[0.05] p-3">
            <span className="text-xs text-zinc-400 dark:text-slate-500">{isCard ? "Ngày hết hạn" : t("loans.endDate")}</span>
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
  );
}
