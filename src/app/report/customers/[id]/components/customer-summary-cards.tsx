"use client";

type SummaryProps = {
  summary: {
    totalLoans: number;
    activeLoans: number;
    totalLoanAmount: number;
    totalDisbursements: number;
    totalDisbursedAmount: number;
    totalInvoices: number;
    totalInvoiceAmount: number;
    overdueInvoices: number;
    totalMappingInstances: number;
  };
};

function formatVND(amount: number): string {
  return new Intl.NumberFormat("vi-VN").format(amount);
}

const cards = [
  { key: "totalLoans", label: "Khoản vay", color: "violet" },
  { key: "activeLoans", label: "Đang hoạt động", color: "emerald" },
  { key: "totalDisbursements", label: "Giải ngân", color: "blue" },
  { key: "totalInvoices", label: "Hoá đơn", color: "amber" },
  { key: "overdueInvoices", label: "Quá hạn", color: "red" },
] as const;

const amountCards = [
  { key: "totalLoanAmount", label: "Tổng giá trị vay" },
  { key: "totalDisbursedAmount", label: "Tổng giải ngân" },
  { key: "totalInvoiceAmount", label: "Tổng hoá đơn" },
] as const;

export function CustomerSummaryCards({ summary }: SummaryProps) {
  return (
    <div className="space-y-3">
      {/* Count cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {cards.map((c) => (
          <div
            key={c.key}
            className="rounded-xl border border-zinc-200 dark:border-white/[0.07] bg-white dark:bg-[#161616] p-3 shadow-sm"
          >
            <p className="text-xs text-zinc-500 dark:text-slate-400">{c.label}</p>
            <p className="text-xl font-bold tabular-nums mt-1">{summary[c.key]}</p>
          </div>
        ))}
      </div>
      {/* Amount cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {amountCards.map((c) => (
          <div
            key={c.key}
            className="rounded-xl border border-zinc-200 dark:border-white/[0.07] bg-white dark:bg-[#161616] p-3 shadow-sm"
          >
            <p className="text-xs text-zinc-500 dark:text-slate-400">{c.label}</p>
            <p className="text-lg font-bold tabular-nums mt-1">{formatVND(summary[c.key])} đ</p>
          </div>
        ))}
      </div>
    </div>
  );
}
