"use client";

import Link from "next/link";
import { useState } from "react";
import { ChevronDown, ChevronRight, Plus } from "lucide-react";

type Loan = {
  id: string;
  contractNumber: string;
  loanAmount: number;
  interestRate: number | null;
  startDate: string;
  endDate: string;
  status: string;
  purpose: string | null;
  disbursements: Disbursement[];
  beneficiaries: Beneficiary[];
};

type Disbursement = {
  id: string;
  amount: number;
  disbursementDate: string;
  status: string;
  description: string | null;
  invoices: Invoice[];
};

type Invoice = {
  id: string;
  invoiceNumber: string;
  supplierName: string;
  amount: number;
  dueDate: string;
  status: string;
};

type Beneficiary = {
  id: string;
  name: string;
  accountNumber: string | null;
  bankName: string | null;
};

function formatVND(amount: number): string {
  return new Intl.NumberFormat("vi-VN").format(amount);
}

function formatDate(d: string): string {
  return new Date(d).toLocaleDateString("vi-VN");
}

const statusColors: Record<string, string> = {
  active: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400",
  completed: "bg-zinc-100 text-zinc-600 dark:bg-zinc-500/10 dark:text-zinc-400",
  cancelled: "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400",
  pending: "bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400",
  paid: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400",
  overdue: "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400",
};

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${statusColors[status] ?? "bg-zinc-100 text-zinc-600"}`}>
      {status}
    </span>
  );
}

function LoanRow({ loan }: { loan: Loan }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className={`rounded-xl border-2 overflow-hidden transition-all duration-200 ${
      expanded
        ? "border-brand-300 dark:border-brand-500/30 shadow-md shadow-brand-500/5"
        : "border-zinc-200 dark:border-white/[0.07] hover:border-brand-200 dark:hover:border-brand-500/20"
    }`}>
      {/* Loan header */}
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className={`w-full flex items-center gap-3 px-4 py-3.5 text-left cursor-pointer transition-colors ${
          expanded ? "bg-brand-50/50 dark:bg-brand-500/5" : "hover:bg-zinc-50 dark:hover:bg-white/[0.03]"
        }`}
      >
        {expanded ? <ChevronDown className="h-4 w-4 text-brand-500 shrink-0" /> : <ChevronRight className="h-4 w-4 text-zinc-400 shrink-0" />}
        <div className="flex-1 min-w-0 grid grid-cols-5 gap-2 items-center text-sm">
          <span className="font-semibold truncate text-zinc-800 dark:text-slate-200">{loan.contractNumber}</span>
          <span className="tabular-nums font-medium">{formatVND(loan.loanAmount)} đ</span>
          <span className="text-zinc-500 dark:text-slate-400">{formatDate(loan.startDate)}</span>
          <span className="text-zinc-500 dark:text-slate-400">{formatDate(loan.endDate)}</span>
          <StatusBadge status={loan.status} />
        </div>
      </button>

      {/* Expanded: Disbursements + Beneficiaries */}
      {expanded && (
        <div className="border-t border-zinc-100 dark:border-white/[0.05] bg-zinc-50/50 dark:bg-white/[0.02] px-4 py-3 space-y-3">
          {loan.purpose && (
            <p className="text-xs text-zinc-500 dark:text-slate-400">Mục đích: {loan.purpose}</p>
          )}

          {/* Beneficiaries */}
          {loan.beneficiaries.length > 0 && (
            <div>
              <p className="text-xs font-medium text-zinc-600 dark:text-slate-300 mb-1">Đơn vị thụ hưởng ({loan.beneficiaries.length})</p>
              <div className="space-y-1">
                {loan.beneficiaries.map((b) => (
                  <div key={b.id} className="flex gap-3 text-xs text-zinc-500 dark:text-slate-400">
                    <span className="font-medium">{b.name}</span>
                    {b.accountNumber && <span>TK: {b.accountNumber}</span>}
                    {b.bankName && <span>NH: {b.bankName}</span>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Disbursements */}
          {loan.disbursements.length > 0 ? (
            <div>
              <p className="text-xs font-medium text-zinc-600 dark:text-slate-300 mb-2">Giải ngân ({loan.disbursements.length})</p>
              <div className="space-y-2">
                {loan.disbursements.map((d) => (
                  <div key={d.id} className="rounded-lg border border-zinc-200 dark:border-white/[0.06] bg-white dark:bg-[#161616] p-3">
                    <div className="flex items-center gap-3 text-sm">
                      <span className="font-medium tabular-nums">{formatVND(d.amount)} đ</span>
                      <span className="text-zinc-500 dark:text-slate-400">{formatDate(d.disbursementDate)}</span>
                      <StatusBadge status={d.status} />
                    </div>
                    {d.description && <p className="text-xs text-zinc-400 mt-1">{d.description}</p>}

                    {/* Invoices under disbursement */}
                    {d.invoices.length > 0 && (
                      <div className="mt-2 border-t border-zinc-100 dark:border-white/[0.05] pt-2">
                        <p className="text-xs text-zinc-400 mb-1">Hoá đơn ({d.invoices.length})</p>
                        <div className="space-y-1">
                          {d.invoices.map((inv) => (
                            <div key={inv.id} className="flex items-center gap-3 text-xs">
                              <span className="font-medium">{inv.invoiceNumber}</span>
                              <span className="text-zinc-500 dark:text-slate-400">{inv.supplierName}</span>
                              <span className="tabular-nums">{formatVND(inv.amount)} đ</span>
                              <span className="text-zinc-400">{formatDate(inv.dueDate)}</span>
                              <StatusBadge status={inv.status} />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-xs text-zinc-400 dark:text-slate-500">Chưa có giải ngân</p>
          )}

          <div className="flex items-center gap-4 pt-1">
            <Link
              href={`/report/loans/${loan.id}`}
              className="inline-flex items-center gap-1.5 rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white shadow-sm shadow-brand-500/25 hover:brightness-110 transition-all cursor-pointer"
            >
              Xem chi tiết khoản vay →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

export function CustomerLoansSection({ loans, customerId }: { loans: Loan[]; customerId?: string }) {
  const addLoanHref = customerId
    ? `/report/loans/new?customerId=${customerId}`
    : "/report/loans/new";

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
          Khoản vay ({loans.length})
        </h3>
        <Link
          href={addLoanHref}
          className="rounded-lg px-4 py-2 text-sm font-medium inline-flex items-center gap-1.5 bg-brand-500 text-white shadow-sm shadow-brand-500/25 hover:brightness-110 transition-all duration-150"
        >
          <Plus className="h-3.5 w-3.5" /> Thêm khoản vay
        </Link>
      </div>

      {loans.length === 0 ? (
        <div className="rounded-xl border border-dashed border-zinc-300 dark:border-white/[0.08] py-8 text-center">
          <p className="text-sm text-zinc-400 dark:text-slate-500">Chưa có khoản vay nào</p>
        </div>
      ) : (
        <div className="space-y-2">
          {/* Header */}
          <div className="grid grid-cols-5 gap-2 px-4 py-2 text-xs font-medium text-zinc-500 dark:text-slate-400">
            <span>Số hợp đồng</span>
            <span>Số tiền vay</span>
            <span>Ngày bắt đầu</span>
            <span>Ngày kết thúc</span>
            <span>Trạng thái</span>
          </div>
          {loans.map((loan) => (
            <LoanRow
              key={loan.id}
              loan={loan}
            />
          ))}
        </div>
      )}
    </div>
  );
}
