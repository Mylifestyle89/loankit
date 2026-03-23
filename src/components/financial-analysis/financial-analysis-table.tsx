// ─── FinancialTable sub-component ────────────────────────────────────────────

import type { BctcExtractResult } from "@/lib/bctc-extractor";
import { BOLD_CODES } from "@/lib/xlsx-table-injector";
import { fmtNum } from "./financial-analysis-utils";

export function FinancialTable({
  rows,
  currentLabel,
  priorLabel,
}: {
  rows: BctcExtractResult["cdkt"]["rows"];
  currentLabel: string;
  priorLabel: string;
}) {
  if (rows.length === 0)
    return (
      <p className="py-2 text-xs text-slate-400 dark:text-slate-500">
        Không có dữ liệu.
      </p>
    );
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-slate-200 dark:border-white/[0.07]">
            <th className="pb-1.5 text-left font-semibold text-slate-600 dark:text-slate-300">
              Chỉ tiêu
            </th>
            <th className="w-12 pb-1.5 text-center font-semibold text-slate-600 dark:text-slate-300">
              Mã
            </th>
            <th className="w-28 pb-1.5 text-right font-semibold text-slate-600 dark:text-slate-300">
              {currentLabel}
            </th>
            <th className="w-28 pb-1.5 text-right font-semibold text-slate-400 dark:text-slate-500">
              {priorLabel}
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr
              key={i}
              className={`border-b border-slate-100 dark:border-white/[0.04] last:border-0 ${
                BOLD_CODES.has(r.maSo)
                  ? "font-semibold text-slate-800 dark:text-slate-100"
                  : "text-slate-600 dark:text-slate-300"
              }`}
            >
              <td className="py-1 pr-2">{r.chiTieu}</td>
              <td className="py-1 text-center text-slate-400 dark:text-slate-500">
                {r.maSo}
              </td>
              <td className="py-1 text-right tabular-nums">{fmtNum(r.current)}</td>
              <td className="py-1 text-right tabular-nums text-slate-400 dark:text-slate-500">
                {fmtNum(r.prior)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
