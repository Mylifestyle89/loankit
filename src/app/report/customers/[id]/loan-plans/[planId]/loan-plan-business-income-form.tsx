"use client";

import { useMemo } from "react";
import type { BusinessRevenueRow } from "@/lib/loan-plan/loan-plan-types";
import { inputCls } from "@/components/invoice-tracking/form-styles";
import { NumericInput } from "./numeric-input";
import { fmtVND } from "./loan-plan-editor-utils";

type Props = {
  rows: BusinessRevenueRow[];
  onRowsChange: (v: BusinessRevenueRow[]) => void;
  otherCosts: number;
  onOtherCostsChange: (v: number) => void;
  livingExpenses: number;
  onLivingExpensesChange: (v: number) => void;
  narrative: string;
  onNarrativeChange: (v: string) => void;
};

function newRow(isGroupHeader = false): BusinessRevenueRow {
  return { name: "", isGroupHeader };
}

export function LoanPlanBusinessIncomeForm({
  rows, onRowsChange,
  otherCosts, onOtherCostsChange,
  livingExpenses, onLivingExpensesChange,
  narrative, onNarrativeChange,
}: Props) {
  const { totalImport, totalRevenue, grossProfit } = useMemo(() => {
    let imp = 0;
    let rev = 0;
    for (const r of rows) {
      if (r.isGroupHeader) continue;
      imp += Number(r.importValue) || 0;
      rev += Number(r.revenue) || 0;
    }
    return { totalImport: imp, totalRevenue: rev, grossProfit: rev - imp };
  }, [rows]);

  const monthlyIncome = Math.round((grossProfit - otherCosts) / 12);
  const monthlyRepayment = monthlyIncome - livingExpenses;

  function updateRow(idx: number, patch: Partial<BusinessRevenueRow>) {
    onRowsChange(rows.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  }

  function addRow(isGroupHeader: boolean) {
    onRowsChange([...rows, newRow(isGroupHeader)]);
  }

  function removeRow(idx: number) {
    onRowsChange(rows.filter((_, i) => i !== idx));
  }

  function moveRow(idx: number, dir: -1 | 1) {
    const next = [...rows];
    const target = idx + dir;
    if (target < 0 || target >= next.length) return;
    [next[idx], next[target]] = [next[target], next[idx]];
    onRowsChange(next);
  }

  return (
    <div className="space-y-4">
      {/* Narrative */}
      <div>
        <label className="block text-xs text-zinc-500 mb-1">Mô tả nguồn trả nợ (tùy chọn)</label>
        <textarea
          value={narrative}
          onChange={(e) => onNarrativeChange(e.target.value)}
          className={`${inputCls} resize-none h-16`}
          placeholder="VD: Từ hoạt động kinh doanh bán lẻ thuốc tại 2 địa điểm..."
        />
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-white/[0.07]">
        <table className="w-full text-xs min-w-[560px]">
          <thead>
            <tr className="bg-zinc-50 dark:bg-white/[0.03] text-zinc-500">
              <th className="px-2 py-2 text-left w-12">STT</th>
              <th className="px-2 py-2 text-left">Nhóm Hàng</th>
              <th className="px-2 py-2 text-right w-24">Số lượng</th>
              <th className="px-2 py-2 text-right w-36">Giá trị nhập hàng</th>
              <th className="px-2 py-2 text-right w-36">Doanh thu dự kiến</th>
              <th className="w-16" />
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} className="px-3 py-4 text-center text-zinc-400">Chưa có dòng doanh thu</td>
              </tr>
            )}
            {rows.map((r, idx) => (
              <tr key={idx} className={`border-t border-zinc-100 dark:border-white/[0.04] ${r.isGroupHeader ? "bg-zinc-50 dark:bg-white/[0.03] font-semibold" : ""}`}>
                <td className="px-2 py-1">
                  <input value={r.order ?? ""} onChange={(e) => updateRow(idx, { order: e.target.value })} className="w-10 bg-transparent border-0 outline-none text-center" placeholder="-" />
                </td>
                <td className="px-2 py-1">
                  <input value={r.name} onChange={(e) => updateRow(idx, { name: e.target.value })} className="w-full bg-transparent border-0 outline-none" placeholder="Tên nhóm hàng" />
                </td>
                <td className="px-2 py-1">
                  {!r.isGroupHeader && (
                    <NumericInput value={r.quantity ?? 0} onChange={(v) => updateRow(idx, { quantity: v })} className="w-full text-right bg-transparent border-0 outline-none" />
                  )}
                </td>
                <td className="px-2 py-1">
                  {!r.isGroupHeader && (
                    <NumericInput value={r.importValue ?? 0} onChange={(v) => updateRow(idx, { importValue: v })} className="w-full text-right bg-transparent border-0 outline-none" />
                  )}
                </td>
                <td className="px-2 py-1">
                  <NumericInput value={r.revenue ?? 0} onChange={(v) => updateRow(idx, { revenue: v })} className="w-full text-right bg-transparent border-0 outline-none" />
                </td>
                <td className="px-1 py-1">
                  <div className="flex items-center gap-0.5">
                    <button onClick={() => moveRow(idx, -1)} className="p-0.5 text-zinc-400 hover:text-zinc-600" title="Lên">↑</button>
                    <button onClick={() => moveRow(idx, 1)} className="p-0.5 text-zinc-400 hover:text-zinc-600" title="Xuống">↓</button>
                    <button onClick={() => removeRow(idx)} className="p-0.5 text-red-400 hover:text-red-600" title="Xóa">×</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add row buttons */}
      <div className="flex gap-2">
        <button onClick={() => addRow(false)} className="text-xs px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-white/[0.07] hover:bg-zinc-50 dark:hover:bg-white/[0.04]">+ Thêm dòng</button>
        <button onClick={() => addRow(true)} className="text-xs px-3 py-1.5 rounded-lg border border-brand-200 text-brand-600 dark:border-brand-500/30 dark:text-brand-400 hover:bg-brand-50 dark:hover:bg-brand-500/10">+ Thêm nhóm (I/II...)</button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 gap-2 text-sm bg-zinc-50 dark:bg-white/[0.02] rounded-lg p-3">
        <div className="flex justify-between"><span className="text-zinc-500">Tổng giá trị nhập:</span><span className="tabular-nums">{fmtVND(totalImport)}</span></div>
        <div className="flex justify-between"><span className="text-zinc-500">Tổng doanh thu:</span><span className="tabular-nums">{fmtVND(totalRevenue)}</span></div>
        <div className="flex justify-between"><span className="text-zinc-500">Lợi nhuận gộp/năm:</span><span className={`tabular-nums ${grossProfit < 0 ? "text-red-500" : "text-emerald-600 dark:text-emerald-400"}`}>{fmtVND(grossProfit)}</span></div>
        <div className="flex justify-between">
          <label className="text-zinc-500">CP khác (MB/NC/thuế)/năm:</label>
          <NumericInput value={otherCosts} onChange={onOtherCostsChange} className="w-36 text-right text-xs border border-zinc-200 dark:border-white/[0.07] rounded px-2 py-0.5 bg-white dark:bg-[#0f0f0f]" />
        </div>
        <div className="flex justify-between">
          <span className="text-zinc-500">TN bình quân/tháng:</span>
          <span className={`tabular-nums font-semibold ${monthlyIncome < 0 ? "text-red-500" : ""}`}>{fmtVND(monthlyIncome)}</span>
        </div>
        <div className="flex justify-between">
          <label className="text-zinc-500">Chi phí sinh hoạt/tháng:</label>
          <NumericInput value={livingExpenses} onChange={onLivingExpensesChange} className="w-36 text-right text-xs border border-zinc-200 dark:border-white/[0.07] rounded px-2 py-0.5 bg-white dark:bg-[#0f0f0f]" />
        </div>
        <div className="col-span-2 flex justify-between pt-1 border-t border-zinc-100 dark:border-white/[0.05]">
          <span className="text-zinc-500">TN trả nợ/tháng:</span>
          <span className={`tabular-nums font-semibold ${monthlyRepayment < 0 ? "text-red-500" : "text-emerald-600 dark:text-emerald-400"}`}>{fmtVND(monthlyRepayment)}</span>
        </div>
      </div>
    </div>
  );
}
