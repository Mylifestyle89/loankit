"use client";

import { useMemo } from "react";
import type { AgricultureItem } from "@/lib/loan-plan/loan-plan-types";
import { calcRepaymentSchedule } from "@/lib/loan-plan/loan-plan-calculator";
import { inputCls } from "@/components/invoice-tracking/form-styles";
import { NumericInput } from "./numeric-input";
import { fmtVND } from "./loan-plan-editor-utils";

type Props = {
  items: AgricultureItem[];
  onItemsChange: (v: AgricultureItem[]) => void;
  livingExpenses: number;
  onLivingExpensesChange: (v: number) => void;
  narrative: string;
  onNarrativeChange: (v: string) => void;
  loanAmount: number;
  termMonths: number;
  interestRate: number;
  preferentialRate?: number;
};

function newItem(isGroupHeader = false): AgricultureItem {
  return { name: "", amount: 0, isGroupHeader };
}

export function LoanPlanAgricultureIncomeForm({
  items, onItemsChange,
  livingExpenses, onLivingExpensesChange,
  narrative, onNarrativeChange,
  loanAmount, termMonths, interestRate, preferentialRate,
}: Props) {
  // Totals: only sum non-header rows; split at group "II" (thu nhập)
  const { totalCost, totalRevenue, profit } = useMemo(() => {
    let cost = 0;
    let revenue = 0;
    let inRevenue = false;
    for (const it of items) {
      if (it.isGroupHeader) {
        if (it.name.includes("II") || it.name.toLowerCase().includes("thu nhập")) inRevenue = true;
        continue;
      }
      if (inRevenue) revenue += Number(it.amount) || 0;
      else cost += Number(it.amount) || 0;
    }
    return { totalCost: cost, totalRevenue: revenue, profit: revenue - cost };
  }, [items]);

  const repaymentIncome = profit - livingExpenses;

  // PA_TRANO preview: only if termMonths > 12
  const repaymentRows = useMemo(() => {
    if (termMonths <= 12 || loanAmount <= 0 || repaymentIncome <= 0) return [];
    return calcRepaymentSchedule({
      loanAmount, termMonths,
      standardRate: interestRate,
      preferentialRate: preferentialRate !== interestRate ? preferentialRate : undefined,
      annualIncome: repaymentIncome,
      repaymentFrequency: 12,
    });
  }, [loanAmount, termMonths, interestRate, preferentialRate, repaymentIncome]);

  function updateItem(idx: number, patch: Partial<AgricultureItem>) {
    const next = items.map((it, i) => {
      if (i !== idx) return it;
      const updated = { ...it, ...patch };
      // Auto-compute amount if both unitPrice and quantity present
      if ("unitPrice" in patch || "quantity" in patch) {
        const p = Number(updated.unitPrice) || 0;
        const q = Number(updated.quantity) || 0;
        if (p > 0 && q > 0) updated.amount = p * q;
      }
      return updated;
    });
    onItemsChange(next);
  }

  function addRow(isGroupHeader: boolean) {
    onItemsChange([...items, newItem(isGroupHeader)]);
  }

  function removeRow(idx: number) {
    onItemsChange(items.filter((_, i) => i !== idx));
  }

  function moveRow(idx: number, dir: -1 | 1) {
    const next = [...items];
    const target = idx + dir;
    if (target < 0 || target >= next.length) return;
    [next[idx], next[target]] = [next[target], next[idx]];
    onItemsChange(next);
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
          placeholder="VD: Từ lợi nhuận hoạt động trồng Cát tường trên 7 sào..."
        />
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-white/[0.07]">
        <table className="w-full text-xs min-w-[620px]">
          <thead>
            <tr className="bg-zinc-50 dark:bg-white/[0.03] text-zinc-500">
              <th className="px-2 py-2 text-left w-12">STT</th>
              <th className="px-2 py-2 text-left">Khoản mục</th>
              <th className="px-2 py-2 text-left w-16">ĐVT</th>
              <th className="px-2 py-2 text-right w-28">Đơn giá</th>
              <th className="px-2 py-2 text-right w-24">Số lượng</th>
              <th className="px-2 py-2 text-right w-32">Thành tiền</th>
              <th className="w-16" />
            </tr>
          </thead>
          <tbody>
            {items.length === 0 && (
              <tr>
                <td colSpan={7} className="px-3 py-4 text-center text-zinc-400">Chưa có mục chi phí</td>
              </tr>
            )}
            {items.map((it, idx) => (
              <tr key={idx} className={`border-t border-zinc-100 dark:border-white/[0.04] ${it.isGroupHeader ? "bg-zinc-50 dark:bg-white/[0.03] font-semibold" : ""}`}>
                <td className="px-2 py-1">
                  <input value={it.order ?? ""} onChange={(e) => updateItem(idx, { order: e.target.value })} className="w-10 bg-transparent border-0 outline-none text-center" placeholder="-" />
                </td>
                <td className="px-2 py-1">
                  <input value={it.name} onChange={(e) => updateItem(idx, { name: e.target.value })} className="w-full bg-transparent border-0 outline-none" placeholder="Tên khoản mục" />
                </td>
                <td className="px-2 py-1">
                  {!it.isGroupHeader && <input value={it.unit ?? ""} onChange={(e) => updateItem(idx, { unit: e.target.value })} className="w-14 bg-transparent border-0 outline-none" placeholder="m2" />}
                </td>
                <td className="px-2 py-1">
                  {!it.isGroupHeader && (
                    <NumericInput value={it.unitPrice ?? 0} onChange={(v) => updateItem(idx, { unitPrice: v })} className="w-full text-right bg-transparent border-0 outline-none" />
                  )}
                </td>
                <td className="px-2 py-1">
                  {!it.isGroupHeader && (
                    <NumericInput value={it.quantity ?? 0} onChange={(v) => updateItem(idx, { quantity: v })} className="w-full text-right bg-transparent border-0 outline-none" />
                  )}
                </td>
                <td className="px-2 py-1 text-right">
                  <NumericInput value={it.amount} onChange={(v) => updateItem(idx, { amount: v })} className="w-full text-right bg-transparent border-0 outline-none" />
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
        <div className="flex justify-between"><span className="text-zinc-500">Tổng chi phí:</span><span className="tabular-nums">{fmtVND(totalCost)}</span></div>
        <div className="flex justify-between"><span className="text-zinc-500">Tổng thu nhập:</span><span className="tabular-nums">{fmtVND(totalRevenue)}</span></div>
        <div className="flex justify-between"><span className="text-zinc-500">Lãi/Lỗ:</span><span className={`tabular-nums font-semibold ${profit < 0 ? "text-red-500" : "text-emerald-600 dark:text-emerald-400"}`}>{fmtVND(profit)}</span></div>
        <div className="flex justify-between">
          <label className="text-zinc-500">Chi phí sinh hoạt/năm:</label>
          <NumericInput value={livingExpenses} onChange={onLivingExpensesChange} className="w-36 text-right text-xs border border-zinc-200 dark:border-white/[0.07] rounded px-2 py-0.5 bg-white dark:bg-[#0f0f0f]" />
        </div>
        <div className="col-span-2 flex justify-between pt-1 border-t border-zinc-100 dark:border-white/[0.05]">
          <span className="text-zinc-500">TN trả nợ/năm:</span>
          <span className={`tabular-nums font-semibold ${repaymentIncome < 0 ? "text-red-500" : "text-emerald-600 dark:text-emerald-400"}`}>{fmtVND(repaymentIncome)}</span>
        </div>
      </div>

      {/* PA_TRANO preview */}
      {repaymentRows.length > 0 && (
        <div>
          <p className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-2">Bảng trả nợ theo năm (PA_TRANO)</p>
          <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-white/[0.07]">
            <table className="w-full text-xs min-w-[500px]">
              <thead>
                <tr className="bg-zinc-50 dark:bg-white/[0.03] text-zinc-500">
                  <th className="px-2 py-2 text-left">Năm</th>
                  <th className="px-2 py-2 text-right">Số tiền vay</th>
                  <th className="px-2 py-2 text-right">Gốc trả</th>
                  <th className="px-2 py-2 text-right">Lãi trả</th>
                  <th className="px-2 py-2 text-right">TN trả nợ</th>
                  <th className="px-2 py-2 text-right">TN còn lại</th>
                </tr>
              </thead>
              <tbody>
                {repaymentRows.map((r, i) => (
                  <tr key={i} className="border-t border-zinc-100 dark:border-white/[0.04]">
                    <td className="px-2 py-1">{r.periodLabel}</td>
                    <td className="px-2 py-1 text-right tabular-nums">{fmtVND(r.balance)}</td>
                    <td className="px-2 py-1 text-right tabular-nums">{fmtVND(r.principal)}</td>
                    <td className="px-2 py-1 text-right tabular-nums">{fmtVND(r.interest)}</td>
                    <td className="px-2 py-1 text-right tabular-nums">{fmtVND(r.income)}</td>
                    <td className="px-2 py-1 text-right tabular-nums">{fmtVND(r.remaining)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
