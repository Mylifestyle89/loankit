"use client";

/**
 * loan-plan-review-36-section.tsx
 *
 * Section đánh giá lại hạn mức 36 tháng — hiển thị cho phương án hạn mức.
 * Bao gồm: tick bật/tắt, và bảng nhập kết quả thực hiện vs kế hoạch.
 */

import { NumericInput } from "./numeric-input";
import { fmtVND } from "./loan-plan-editor-utils";

type Review36Props = {
  enabled: boolean;
  onEnabledChange: (v: boolean) => void;
  actualRevenue: number;
  onActualRevenueChange: (v: number) => void;
  actualCost: number;
  onActualCostChange: (v: number) => void;
  plannedRevenue: number;
  plannedCost: number;
  plannedProfit: number;
};

function pctStr(actual: number, planned: number): string {
  if (!planned) return "—";
  return `${((actual / planned) * 100).toFixed(1)}%`;
}

export function LoanPlanReview36Section({
  enabled, onEnabledChange,
  actualRevenue, onActualRevenueChange,
  actualCost, onActualCostChange,
  plannedRevenue, plannedCost, plannedProfit,
}: Review36Props) {
  const autoProfit = actualRevenue - actualCost;

  return (
    <div className="rounded-2xl border border-amber-200 dark:border-amber-500/20 bg-white dark:bg-[#161616] p-5 shadow-sm">
      {/* Header + toggle */}
      <div className="flex items-center gap-3 mb-4">
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => onEnabledChange(e.target.checked)}
            className="h-4 w-4 rounded border-zinc-300 dark:border-white/20 accent-amber-500"
          />
          <span className="text-sm font-semibold text-amber-600 dark:text-amber-400">
            Đánh giá lại hạn mức 36 tháng
          </span>
        </label>
        <span className="text-xs text-zinc-400">(Mẫu 20/HMTD-CN)</span>
      </div>

      {enabled && (
        <>
          <p className="text-xs text-zinc-500 mb-4">
            Nhập kết quả <strong>thực hiện</strong> trong năm đánh giá để so sánh với kế hoạch đã phê duyệt.
          </p>

          <div className="overflow-x-auto mb-4">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-zinc-50 dark:bg-white/[0.03] text-xs text-zinc-500">
                  <th className="px-3 py-1.5 border border-zinc-200 dark:border-white/[0.07] text-left w-[35%]">Chỉ tiêu</th>
                  <th className="px-3 py-1.5 border border-zinc-200 dark:border-white/[0.07] text-right w-[22%]">Kế hoạch</th>
                  <th className="px-3 py-1.5 border border-zinc-200 dark:border-white/[0.07] text-right w-[25%]">Thực hiện</th>
                  <th className="px-3 py-1.5 border border-zinc-200 dark:border-white/[0.07] text-right w-[18%]">TL HT (%)<br/><span className="font-normal text-zinc-400">= TH/KH</span></th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="px-3 py-2 border border-zinc-200 dark:border-white/[0.07] font-medium">Doanh thu</td>
                  <td className="px-3 py-2 border border-zinc-200 dark:border-white/[0.07] text-right tabular-nums text-zinc-500">
                    {fmtVND(plannedRevenue)}
                  </td>
                  <td className="px-3 py-2 border border-zinc-200 dark:border-white/[0.07]">
                    <NumericInput
                      value={actualRevenue}
                      onChange={onActualRevenueChange}
                      className="w-full bg-transparent outline-none text-right tabular-nums"
                      placeholder="0"
                    />
                  </td>
                  <td className={`px-3 py-2 border border-zinc-200 dark:border-white/[0.07] text-right tabular-nums font-medium ${
                    plannedRevenue > 0 && actualRevenue >= plannedRevenue ? "text-emerald-600" : "text-amber-600"
                  }`}>
                    {pctStr(actualRevenue, plannedRevenue)}
                  </td>
                </tr>
                <tr>
                  <td className="px-3 py-2 border border-zinc-200 dark:border-white/[0.07] font-medium">Chi phí</td>
                  <td className="px-3 py-2 border border-zinc-200 dark:border-white/[0.07] text-right tabular-nums text-zinc-500">
                    {fmtVND(plannedCost)}
                  </td>
                  <td className="px-3 py-2 border border-zinc-200 dark:border-white/[0.07]">
                    <NumericInput
                      value={actualCost}
                      onChange={onActualCostChange}
                      className="w-full bg-transparent outline-none text-right tabular-nums"
                      placeholder="0"
                    />
                  </td>
                  <td className={`px-3 py-2 border border-zinc-200 dark:border-white/[0.07] text-right tabular-nums font-medium ${
                    plannedCost > 0 && actualCost <= plannedCost ? "text-emerald-600" : "text-amber-600"
                  }`}>
                    {pctStr(actualCost, plannedCost)}
                  </td>
                </tr>
                <tr className="bg-brand-50/30 dark:bg-brand-500/5">
                  <td className="px-3 py-2 border border-zinc-200 dark:border-white/[0.07] font-medium">
                    Lợi nhuận
                    <span className="ml-1 text-xs text-zinc-400">(tự tính)</span>
                  </td>
                  <td className="px-3 py-2 border border-zinc-200 dark:border-white/[0.07] text-right tabular-nums text-zinc-500">
                    {fmtVND(plannedProfit)}
                  </td>
                  <td className="px-3 py-2 border border-zinc-200 dark:border-white/[0.07]">
                    <input
                      type="text"
                      value={autoProfit.toLocaleString("vi-VN")}
                      readOnly
                      className="w-full bg-transparent outline-none text-right tabular-nums text-zinc-400 italic"
                      title="Tự động = Doanh thu − Chi phí"
                    />
                  </td>
                  <td className={`px-3 py-2 border border-zinc-200 dark:border-white/[0.07] text-right tabular-nums font-medium ${
                    plannedProfit > 0 && autoProfit >= plannedProfit ? "text-emerald-600" : "text-amber-600"
                  }`}>
                    {pctStr(autoProfit, plannedProfit)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <p className="text-xs text-zinc-400">
            Lợi nhuận thực hiện = Doanh thu − Chi phí (tự động). Tỷ lệ hoàn thành sẽ được điền vào template DOCX.
          </p>
        </>
      )}
    </div>
  );
}
