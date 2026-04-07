"use client";

// Bảng trả nợ theo năm — full table cho vay trung dài hạn

import { calcRepaymentSchedule } from "@/lib/loan-plan/loan-plan-calculator";

type RepaymentScheduleTableProps = {
  loanAmount: number;
  termMonths: number;
  standardRate: number;
  preferentialRate: number;
  annualIncome: number;
};

export function RepaymentScheduleTable({
  loanAmount,
  termMonths,
  standardRate,
  preferentialRate,
  annualIncome,
}: RepaymentScheduleTableProps) {
  const rows = calcRepaymentSchedule({
    loanAmount,
    termMonths,
    standardRate,
    preferentialRate: preferentialRate !== standardRate ? preferentialRate : undefined,
    annualIncome,
  });

  if (rows.length === 0) return null;

  const fmt = (n: number) => n.toLocaleString("vi-VN");
  const totalPrincipal = rows.reduce((s, r) => s + r.principal, 0);
  const totalInterest = rows.reduce((s, r) => s + r.interest, 0);

  return (
    <div>
      <h3 className="text-sm font-semibold mb-3">Bảng trả nợ theo năm</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-brand-50 dark:bg-brand-800/20 text-xs text-zinc-600 dark:text-zinc-400">
              <th className="px-3 py-2 text-left font-medium">Năm</th>
              <th className="px-3 py-2 text-right font-medium">Thu nhập trả nợ</th>
              <th className="px-3 py-2 text-right font-medium">Dư nợ đầu kỳ</th>
              <th className="px-3 py-2 text-right font-medium">Gốc trả</th>
              <th className="px-3 py-2 text-right font-medium">Lãi trả</th>
              <th className="px-3 py-2 text-right font-medium">TN còn lại</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr
                key={r.year}
                className="border-t border-zinc-100 dark:border-white/[0.05] hover:bg-zinc-50/50 dark:hover:bg-white/[0.02]"
              >
                <td className="px-3 py-2 font-medium">Năm {r.year}</td>
                <td className="px-3 py-2 text-right tabular-nums">{fmt(r.income)}</td>
                <td className="px-3 py-2 text-right tabular-nums">{fmt(r.balance)}</td>
                <td className="px-3 py-2 text-right tabular-nums">{fmt(r.principal)}</td>
                <td className="px-3 py-2 text-right tabular-nums">{fmt(r.interest)}</td>
                <td
                  className={`px-3 py-2 text-right tabular-nums font-medium ${
                    r.remaining < 0 ? "text-red-600" : "text-emerald-600"
                  }`}
                >
                  {fmt(r.remaining)}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-brand-300 dark:border-brand-600 bg-brand-50/50 dark:bg-brand-800/10 font-semibold text-sm">
              <td className="px-3 py-2">Cộng</td>
              <td className="px-3 py-2"></td>
              <td className="px-3 py-2"></td>
              <td className="px-3 py-2 text-right tabular-nums">{fmt(totalPrincipal)}</td>
              <td className="px-3 py-2 text-right tabular-nums">{fmt(totalInterest)}</td>
              <td className="px-3 py-2"></td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
