"use client";

/**
 * loan-detail-header.tsx
 *
 * Hero card for the loan detail page: back link, contract number,
 * status badge, action buttons, and loan details grid.
 */

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { LoanStatusBadge } from "@/components/invoice-tracking/loan-status-badge";
import { fmtDisplay as fmt, fmtDateDisplay as fmtDate } from "@/lib/invoice-tracking-format-helpers";
import { useLanguage } from "@/components/language-provider";

import type { Loan } from "../../types";

type Props = {
  loan: Loan;
  onEditLoan: () => void;
  onOpenBeneficiaryModal: () => void;
};

export function LoanDetailHeader({ loan, onEditLoan, onOpenBeneficiaryModal }: Props) {
  const { t } = useLanguage();

  return (
    <div className="relative overflow-hidden rounded-2xl border border-violet-100 dark:border-violet-500/10 bg-gradient-to-br from-violet-50 via-white to-fuchsia-50 dark:from-violet-950/30 dark:via-[#141414] dark:to-fuchsia-950/20 p-5">
      <div className="absolute -right-12 -top-12 h-40 w-40 rounded-full bg-violet-200/30 blur-3xl dark:bg-violet-500/10" />
      <div className="relative">
        {/* Top row: back + title + actions */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
          <div className="flex items-start gap-3 min-w-0">
            <Link
              href={loan.customer?.id ? `/report/customers/${loan.customer.id}?tab=loans` : "/report/loans"}
              className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/80 dark:bg-white/[0.06] border border-zinc-200 dark:border-white/[0.08] text-zinc-500 dark:text-slate-400 transition-colors hover:bg-violet-50 dark:hover:bg-violet-500/10 hover:text-violet-600 dark:hover:text-violet-400"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div className="min-w-0">
              <div className="flex items-center gap-2.5">
                <h2 className="truncate text-xl font-bold tracking-tight bg-gradient-to-r from-violet-700 to-fuchsia-600 dark:from-violet-400 dark:to-fuchsia-400 bg-clip-text text-transparent">
                  {loan.contractNumber}
                </h2>
                <LoanStatusBadge status={loan.status} />
              </div>
              <p className="mt-0.5 text-sm text-zinc-500 dark:text-slate-400">{loan.customer.customer_name}</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={onEditLoan}
              className="rounded-lg bg-gradient-to-r from-violet-600 to-fuchsia-600 px-4 py-1.5 text-xs font-medium text-white shadow-sm shadow-violet-500/25 transition-all hover:shadow-md hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/40"
            >
              Thông tin hợp đồng tín dụng
            </button>
            {loan.customer?.id && (
              <Link
                href={`/report/customers/${loan.customer.id}/loan-plans`}
                className="rounded-lg border border-zinc-200 dark:border-white/[0.09] bg-white/80 dark:bg-white/[0.05] px-3 py-1.5 text-xs font-medium text-fuchsia-600 dark:text-fuchsia-400 transition-colors hover:bg-fuchsia-50 dark:hover:bg-fuchsia-500/10"
              >
                Phương án vay vốn
              </Link>
            )}
            <button
              type="button"
              onClick={onOpenBeneficiaryModal}
              className="rounded-lg border border-zinc-200 dark:border-white/[0.09] bg-white/80 dark:bg-white/[0.05] px-3 py-1.5 text-xs font-medium text-zinc-600 dark:text-slate-300 transition-colors hover:bg-violet-50 dark:hover:bg-violet-500/10 hover:text-violet-700 dark:hover:text-violet-400"
            >
              {t("beneficiaries.title") ?? "Đơn vị thụ hưởng"}
            </button>
            <Link
              href={`/report/invoices?customerId=${loan.customer.id}`}
              className="rounded-lg border border-zinc-200 dark:border-white/[0.09] bg-white/80 dark:bg-white/[0.05] px-3 py-1.5 text-xs font-medium text-zinc-500 dark:text-slate-400 transition-colors hover:bg-zinc-50 dark:hover:bg-white/[0.06]"
            >
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
  );
}
