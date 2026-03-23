import type { FinancialRow } from "@/lib/bctc-extractor";
import { fmt } from "./financial-analysis-constants";

// FinancialTable: renders CDKT/KQKD rows with current/prior year columns
export function FinancialTable({
  rows,
  currentLabel,
  priorLabel,
}: {
  rows: FinancialRow[];
  currentLabel: string;
  priorLabel: string;
}) {
  if (!rows.length) return <p className="px-3 py-2 text-xs text-slate-400">Không có dữ liệu</p>;
  return (
    <table className="w-full text-xs">
      <thead>
        <tr className="bg-slate-50/80 dark:bg-white/[0.03] text-left">
          <th className="px-3 py-1.5 font-semibold text-slate-600 dark:text-slate-400">Chỉ tiêu</th>
          <th className="px-2 py-1.5 font-semibold text-slate-600 dark:text-slate-400 w-14 text-center">Mã</th>
          <th className="px-2 py-1.5 font-semibold text-slate-600 dark:text-slate-400 text-right">{currentLabel}</th>
          <th className="px-2 py-1.5 font-semibold text-slate-600 dark:text-slate-400 text-right">{priorLabel}</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.maSo} className="border-t border-slate-100 dark:border-white/[0.04]">
            <td className="px-3 py-1 text-slate-700 dark:text-slate-300 max-w-[220px] truncate" title={r.chiTieu}>
              {r.chiTieu}
            </td>
            <td className="px-2 py-1 text-center text-slate-500 dark:text-slate-400">{r.maSo}</td>
            <td className="px-2 py-1 text-right text-slate-700 dark:text-slate-200 tabular-nums">{fmt(r.current)}</td>
            <td className="px-2 py-1 text-right text-slate-500 dark:text-slate-400 tabular-nums">{fmt(r.prior)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
