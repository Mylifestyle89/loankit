"use client";

import { useMemo, useRef } from "react";
import type { AgricultureItem, ExpenseItem } from "@/lib/loan-plan/loan-plan-types";
import { calcRepaymentSchedule } from "@/lib/loan-plan/loan-plan-calculator";
import { inputCls } from "@/components/invoice-tracking/form-styles";
import { parseTsvToAgricultureItems } from "@/lib/import/tsv-paste-parser";
import { NumericInput } from "./numeric-input";
import { fmtVND } from "./loan-plan-editor-utils";

type Props = {
  items: AgricultureItem[];
  onItemsChange: (v: AgricultureItem[]) => void;
  expenseItems: ExpenseItem[];
  onExpenseItemsChange: (v: ExpenseItem[]) => void;
  narrative: string;
  onNarrativeChange: (v: string) => void;
  loanAmount: number;
  termMonths: number;
  interestRate: number;
  preferentialRate?: number;
};

function newAgriItem(isGroupHeader = false): AgricultureItem {
  return { name: "", amount: 0, isGroupHeader };
}

/**
 * Tìm "Nguồn trả nợ" từ bảng dán vào:
 * 1. Ưu tiên dòng có tên chứa "lợi nhuận" (Excel thường pre-compute sẵn)
 * 2. Fallback: doanh thu (nhóm II) - chi phí (nhóm I) theo group header split
 */
function extractNguonTraNo(items: AgricultureItem[]): number {
  // Pass 1: tìm dòng lợi nhuận (case-insensitive, bao gồm không dấu)
  const profitRow = items.find((it) => {
    const name = it.name.toLowerCase();
    return name.includes("lợi nhuận") || name.includes("loi nhuan") || name.includes("profit");
  });
  if (profitRow) return Number(profitRow.amount) || 0;

  // Pass 2: group split fallback (I = chi phí, II = thu nhập/doanh thu)
  let cost = 0;
  let revenue = 0;
  let inRevenue = false;
  for (const it of items) {
    if (it.isGroupHeader) {
      if (it.name.includes("II") || it.name.toLowerCase().includes("thu nhập") || it.name.toLowerCase().includes("doanh thu")) inRevenue = true;
      continue;
    }
    if (inRevenue) revenue += Number(it.amount) || 0;
    else cost += Number(it.amount) || 0;
  }
  return revenue - cost;
}

export function LoanPlanAgricultureIncomeForm({
  items, onItemsChange,
  expenseItems, onExpenseItemsChange,
  narrative, onNarrativeChange,
  loanAmount, termMonths, interestRate, preferentialRate,
}: Props) {
  // Nguồn trả nợ = dòng "Lợi nhuận" trong bảng (Excel thường pre-compute sẵn).
  // Fallback: revenue (nhóm II) - cost (nhóm I) nếu không tìm thấy dòng lợi nhuận.
  const nguonTraNo = useMemo(() => extractNguonTraNo(items), [items]);

  const totalExpenses = useMemo(
    () => expenseItems.reduce((s, e) => s + (Number(e.amount) || 0), 0),
    [expenseItems],
  );

  const repaymentIncome = nguonTraNo - totalExpenses;

  // PA_TRANO preview (yearly grouping — max 10 rows cho vay 10 năm)
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

  // ── Agri table row handlers ──
  function updateItem(idx: number, patch: Partial<AgricultureItem>) {
    const next = items.map((it, i) => {
      if (i !== idx) return it;
      const updated = { ...it, ...patch };
      if ("unitPrice" in patch || "quantity" in patch) {
        const p = Number(updated.unitPrice) || 0;
        const q = Number(updated.quantity) || 0;
        if (p > 0 && q > 0) updated.amount = p * q;
      }
      return updated;
    });
    onItemsChange(next);
  }
  function addAgriRow(isGroupHeader: boolean) { onItemsChange([...items, newAgriItem(isGroupHeader)]); }
  function removeAgriRow(idx: number) { onItemsChange(items.filter((_, i) => i !== idx)); }
  function moveAgriRow(idx: number, dir: -1 | 1) {
    const next = [...items];
    const target = idx + dir;
    if (target < 0 || target >= next.length) return;
    [next[idx], next[target]] = [next[target], next[idx]];
    onItemsChange(next);
  }

  // ── Expense deduction row handlers ──
  function updateExpense(idx: number, patch: Partial<ExpenseItem>) {
    onExpenseItemsChange(expenseItems.map((e, i) => i === idx ? { ...e, ...patch } : e));
  }
  function addExpenseRow() { onExpenseItemsChange([...expenseItems, { name: "", amount: 0 }]); }
  function removeExpenseRow(idx: number) { onExpenseItemsChange(expenseItems.filter((_, i) => i !== idx)); }

  const pasteRef = useRef<HTMLTextAreaElement>(null);
  function handlePaste(e: React.ClipboardEvent<HTMLTextAreaElement>) {
    e.preventDefault();
    const parsed = parseTsvToAgricultureItems(e.clipboardData.getData("text/plain"));
    if (parsed.length > 0) onItemsChange(parsed);
  }

  return (
    <div className="space-y-4">
      {/* Paste zone */}
      <div>
        <label className="block text-xs text-zinc-500 mb-1">Dán từ Excel (Ctrl+V vào đây để thay thế bảng)</label>
        <textarea
          ref={pasteRef}
          onPaste={handlePaste}
          readOnly
          rows={2}
          className="w-full rounded-lg border border-dashed border-zinc-300 dark:border-white/10 bg-zinc-50 dark:bg-white/[0.02] px-3 py-2 text-xs text-zinc-400 placeholder:text-zinc-300 resize-none focus:outline-none focus:border-brand-400"
          placeholder="Click vào đây rồi Ctrl+V để dán bảng từ Excel / Google Sheets"
        />
      </div>

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

      {/* Agri table */}
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
                <td colSpan={7} className="px-3 py-4 text-center text-zinc-400">Chưa có mục — dán từ Excel hoặc thêm thủ công</td>
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
                  {!it.isGroupHeader && <NumericInput value={it.unitPrice ?? 0} onChange={(v) => updateItem(idx, { unitPrice: v })} className="w-full text-right bg-transparent border-0 outline-none" />}
                </td>
                <td className="px-2 py-1">
                  {!it.isGroupHeader && <NumericInput value={it.quantity ?? 0} onChange={(v) => updateItem(idx, { quantity: v })} className="w-full text-right bg-transparent border-0 outline-none" />}
                </td>
                <td className="px-2 py-1 text-right">
                  <NumericInput value={it.amount} onChange={(v) => updateItem(idx, { amount: v })} className="w-full text-right bg-transparent border-0 outline-none" />
                </td>
                <td className="px-1 py-1">
                  <div className="flex items-center gap-0.5">
                    <button onClick={() => moveAgriRow(idx, -1)} className="p-0.5 text-zinc-400 hover:text-zinc-600" title="Lên">↑</button>
                    <button onClick={() => moveAgriRow(idx, 1)} className="p-0.5 text-zinc-400 hover:text-zinc-600" title="Xuống">↓</button>
                    <button onClick={() => removeAgriRow(idx)} className="p-0.5 text-red-400 hover:text-red-600" title="Xóa">×</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex gap-2">
        <button onClick={() => addAgriRow(false)} className="text-xs px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-white/[0.07] hover:bg-zinc-50 dark:hover:bg-white/[0.04]">+ Thêm dòng</button>
        <button onClick={() => addAgriRow(true)} className="text-xs px-3 py-1.5 rounded-lg border border-brand-200 text-brand-600 dark:border-brand-500/30 dark:text-brand-400 hover:bg-brand-50 dark:hover:bg-brand-500/10">+ Thêm nhóm (I/II...)</button>
      </div>

      {/* ── Phần tính toán nguồn trả nợ ── */}
      <div className="rounded-lg border border-zinc-200 dark:border-white/[0.07] bg-zinc-50 dark:bg-white/[0.02] p-4 space-y-3">
        {/* Nguồn trả nợ (từ bảng) */}
        <div className="flex justify-between items-center text-sm">
          <span className="font-medium">Nguồn trả nợ (lợi nhuận từ bảng)</span>
          <span className={`tabular-nums font-semibold ${nguonTraNo < 0 ? "text-red-500" : "text-emerald-600 dark:text-emerald-400"}`}>{fmtVND(nguonTraNo)}</span>
        </div>

        {/* Chi phí khấu trừ */}
        <div>
          <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">Chi phí</p>
          <div className="space-y-1.5">
            {expenseItems.map((e, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <input
                  value={e.name}
                  onChange={(ev) => updateExpense(idx, { name: ev.target.value })}
                  className="flex-1 rounded border border-zinc-200 dark:border-white/[0.07] bg-white dark:bg-[#0f0f0f] px-2 py-1 text-xs outline-none"
                  placeholder="VD: Chi phí sinh hoạt, Chi phí thuê đất..."
                />
                <NumericInput
                  value={e.amount}
                  onChange={(v) => updateExpense(idx, { amount: v })}
                  className="w-40 rounded border border-zinc-200 dark:border-white/[0.07] bg-white dark:bg-[#0f0f0f] px-2 py-1 text-xs text-right outline-none"
                />
                <button onClick={() => removeExpenseRow(idx)} className="text-red-400 hover:text-red-600 text-xs px-1">×</button>
              </div>
            ))}
            <button
              onClick={addExpenseRow}
              className="text-xs px-3 py-1 rounded border border-dashed border-zinc-300 dark:border-white/10 text-zinc-500 hover:border-brand-300 hover:text-brand-600"
            >
              + Thêm khoản chi phí
            </button>
          </div>
          {expenseItems.length > 0 && (
            <div className="flex justify-between text-xs text-zinc-500 mt-2 pt-2 border-t border-zinc-200 dark:border-white/[0.05]">
              <span>Tổng chi phí</span>
              <span className="tabular-nums">{fmtVND(totalExpenses)}</span>
            </div>
          )}
        </div>

        {/* Nguồn thu nhập còn lại */}
        <div className="flex justify-between items-center pt-2 border-t border-zinc-200 dark:border-white/[0.07]">
          <span className="text-sm font-semibold">Nguồn thu nhập còn lại để trả nợ cho Agribank</span>
          <span className={`tabular-nums font-bold text-base ${repaymentIncome < 0 ? "text-red-600" : "text-emerald-600 dark:text-emerald-400"}`}>{fmtVND(repaymentIncome)}</span>
        </div>
      </div>

      {/* PA_TRANO preview */}
      {repaymentRows.length > 0 && (
        <div>
          <p className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-2">Bảng trả nợ theo năm</p>
          <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-white/[0.07]">
            <table className="w-full text-xs min-w-[500px]">
              <thead>
                <tr className="bg-zinc-50 dark:bg-white/[0.03] text-zinc-500">
                  <th className="px-2 py-2 text-left">Năm</th>
                  <th className="px-2 py-2 text-right">Thu nhập trả nợ</th>
                  <th className="px-2 py-2 text-right">Dư nợ đầu kỳ</th>
                  <th className="px-2 py-2 text-right">Gốc trả</th>
                  <th className="px-2 py-2 text-right">Lãi trả</th>
                  <th className="px-2 py-2 text-right">TN còn lại</th>
                </tr>
              </thead>
              <tbody>
                {repaymentRows.map((r, i) => (
                  <tr key={i} className="border-t border-zinc-100 dark:border-white/[0.04]">
                    <td className="px-2 py-1">{r.periodLabel}</td>
                    <td className="px-2 py-1 text-right tabular-nums">{fmtVND(r.income)}</td>
                    <td className="px-2 py-1 text-right tabular-nums">{fmtVND(r.balance)}</td>
                    <td className="px-2 py-1 text-right tabular-nums">{fmtVND(r.principal)}</td>
                    <td className="px-2 py-1 text-right tabular-nums">{fmtVND(r.interest)}</td>
                    <td className={`px-2 py-1 text-right tabular-nums font-medium ${r.remaining < 0 ? "text-red-500" : "text-emerald-600 dark:text-emerald-400"}`}>{fmtVND(r.remaining)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-zinc-300 dark:border-white/10 bg-zinc-50 dark:bg-white/[0.03] font-semibold text-xs">
                  <td className="px-2 py-1.5">Cộng</td>
                  <td className="px-2 py-1.5" />
                  <td className="px-2 py-1.5" />
                  <td className="px-2 py-1.5 text-right tabular-nums">{fmtVND(repaymentRows.reduce((s, r) => s + r.principal, 0))}</td>
                  <td className="px-2 py-1.5 text-right tabular-nums">{fmtVND(repaymentRows.reduce((s, r) => s + r.interest, 0))}</td>
                  <td className="px-2 py-1.5" />
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
