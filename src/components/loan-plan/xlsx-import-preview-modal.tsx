"use client";

import { useState } from "react";
import { BaseModal } from "@/components/ui/base-modal";
import { AlertTriangle, CheckCircle, Upload } from "lucide-react";
import type { XlsxParseResult } from "@/lib/import/xlsx-loan-plan-types";
import type { CostItem } from "@/lib/loan-plan/loan-plan-types";
import { fmtDisplay } from "@/lib/invoice-tracking-format-helpers";

type Props = {
  open: boolean;
  onClose: () => void;
  parseResult: XlsxParseResult;
  isSaving: boolean;
  onConfirm: (payload: Record<string, unknown>) => void;
};

function fmtVND(n: number) { return fmtDisplay(n); }

export function XlsxImportPreviewModal({ open, onClose, parseResult, isSaving, onConfirm }: Props) {
  const [costItems, setCostItems] = useState<CostItem[]>(parseResult.costItems);
  const [planName, setPlanName] = useState(String(parseResult.meta.name || ""));
  const [loanAmount, setLoanAmount] = useState(parseResult.meta.loanAmount ?? 0);
  const [interestRate, setInterestRate] = useState(parseResult.meta.interestRate ?? 0);
  const [turnoverCycles, setTurnoverCycles] = useState(parseResult.meta.turnoverCycles ?? 1);

  function updateCostItem(idx: number, field: keyof CostItem, value: string) {
    setCostItems((prev) => prev.map((item, i) => {
      if (i !== idx) return item;
      const numVal = Number(value) || 0;
      const updated = { ...item, [field]: field === "name" || field === "unit" ? value : numVal };
      if (field === "qty" || field === "unitPrice") {
        updated.amount = updated.qty * updated.unitPrice;
      }
      return updated;
    }));
  }

  function handleConfirm() {
    const meta = parseResult.meta;
    // Infer loan_method: if has depreciationYears or loanMonths > 12, it's trung_dai
    const isLongTerm = (meta.depreciationYears && meta.depreciationYears > 0)
      || (meta.loanMonths && meta.loanMonths > 12);
    onConfirm({
      name: planName,
      cost_items: costItems,
      revenue_items: parseResult.revenueItems,
      loanAmount,
      interestRate,
      turnoverCycles,
      // Pass loan_method + extended fields from parser meta
      loan_method: meta.loan_method ?? (isLongTerm ? "trung_dai" : undefined),
      ...(isLongTerm ? {
        depreciation_years: meta.depreciationYears,
        asset_unit_price: meta.assetUnitPrice,
        land_area_sau: meta.landAreaSau,
        preferential_rate: meta.preferentialRate,
        term_months: meta.loanMonths,
        construction_contract_no: meta.constructionContractNo,
        construction_contract_date: meta.constructionContractDate,
        farmAddress: meta.farmAddress,
      } : {}),
    });
  }

  const totalCost = costItems.reduce((s, c) => s + c.amount, 0);

  const footer = (
    <div className="flex items-center justify-between">
      <span className="text-xs text-zinc-500">
        Loại: {parseResult.detectedType} · {costItems.length} khoản mục · Tổng: {fmtVND(totalCost)}đ
      </span>
      <div className="flex gap-2">
        <button type="button" onClick={onClose} className="rounded-lg px-4 py-2 text-sm text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-white/5">
          Hủy
        </button>
        <button type="button" onClick={handleConfirm} disabled={isSaving || costItems.length === 0}
          className="inline-flex items-center gap-1.5 rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white shadow-sm hover:brightness-110 disabled:opacity-50">
          {isSaving ? <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" /> : <CheckCircle className="h-3.5 w-3.5" />}
          Xác nhận tạo PA
        </button>
      </div>
    </div>
  );

  return (
    <BaseModal open={open} onClose={onClose} title="Xem trước phương án từ XLSX" footer={footer} maxWidthClassName="max-w-4xl">
      {/* Warnings */}
      {parseResult.warnings.length > 0 && (
        <div className="mb-4 rounded-lg bg-brand-100 dark:bg-brand-500/10 p-3 text-xs text-brand-600 dark:text-brand-400">
          <AlertTriangle className="inline h-3.5 w-3.5 mr-1" />
          {parseResult.warnings.join("; ")}
        </div>
      )}

      {/* Meta fields */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <label className="block">
          <span className="text-xs text-zinc-500">Tên phương án</span>
          <input value={planName} onChange={(e) => setPlanName(e.target.value)} className="mt-1 block w-full rounded-lg border border-zinc-200 dark:border-white/10 bg-white dark:bg-white/5 px-3 py-1.5 text-sm" />
        </label>
        <label className="block">
          <span className="text-xs text-zinc-500">Số tiền vay</span>
          <input type="number" value={loanAmount} onChange={(e) => setLoanAmount(Number(e.target.value))} className="mt-1 block w-full rounded-lg border border-zinc-200 dark:border-white/10 bg-white dark:bg-white/5 px-3 py-1.5 text-sm" />
        </label>
        <label className="block">
          <span className="text-xs text-zinc-500">Lãi suất (%/năm)</span>
          <input type="number" step="0.01" value={(interestRate * 100).toFixed(2)} onChange={(e) => setInterestRate(Number(e.target.value) / 100)} className="mt-1 block w-full rounded-lg border border-zinc-200 dark:border-white/10 bg-white dark:bg-white/5 px-3 py-1.5 text-sm" />
        </label>
        <label className="block">
          <span className="text-xs text-zinc-500">Số vòng quay</span>
          <input type="number" value={turnoverCycles} onChange={(e) => setTurnoverCycles(Number(e.target.value) || 1)} className="mt-1 block w-full rounded-lg border border-zinc-200 dark:border-white/10 bg-white dark:bg-white/5 px-3 py-1.5 text-sm" />
        </label>
      </div>

      {/* Cost items table */}
      <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-white/[0.08]">
        <table className="w-full text-sm">
          <thead className="bg-zinc-50 dark:bg-white/[0.03] text-xs text-zinc-500">
            <tr>
              <th className="px-3 py-2 text-left font-medium">Hạng mục</th>
              <th className="px-3 py-2 text-left font-medium w-20">ĐVT</th>
              <th className="px-3 py-2 text-right font-medium w-24">Số lượng</th>
              <th className="px-3 py-2 text-right font-medium w-28">Đơn giá</th>
              <th className="px-3 py-2 text-right font-medium w-32">Thành tiền</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 dark:divide-white/[0.05]">
            {costItems.map((item, idx) => (
              <tr key={idx} className="hover:bg-zinc-50/50 dark:hover:bg-white/[0.02]">
                <td className="px-3 py-1.5">
                  <input value={item.name} onChange={(e) => updateCostItem(idx, "name", e.target.value)} className="w-full bg-transparent text-sm" />
                </td>
                <td className="px-3 py-1.5">
                  <input value={item.unit} onChange={(e) => updateCostItem(idx, "unit", e.target.value)} className="w-full bg-transparent text-sm" />
                </td>
                <td className="px-3 py-1.5 text-right">
                  <input type="number" value={item.qty} onChange={(e) => updateCostItem(idx, "qty", e.target.value)} className="w-full bg-transparent text-sm text-right" />
                </td>
                <td className="px-3 py-1.5 text-right">
                  <input type="number" value={item.unitPrice} onChange={(e) => updateCostItem(idx, "unitPrice", e.target.value)} className="w-full bg-transparent text-sm text-right" />
                </td>
                <td className="px-3 py-1.5 text-right font-medium text-zinc-700 dark:text-zinc-300">
                  {fmtVND(item.amount)}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-zinc-50 dark:bg-white/[0.03] font-medium">
              <td colSpan={4} className="px-3 py-2 text-right text-xs">Tổng chi phí trực tiếp</td>
              <td className="px-3 py-2 text-right">{fmtVND(totalCost)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </BaseModal>
  );
}

/** Upload button trigger for XLSX import */
export function XlsxImportButton({ onFileSelect, isUploading }: { onFileSelect: (file: File) => void; isUploading: boolean }) {
  return (
    <label className="inline-flex items-center gap-1.5 rounded-lg border border-brand-200 dark:border-brand-500/30 bg-brand-100 dark:bg-brand-500/10 px-4 py-2 text-sm font-medium text-brand-600 dark:text-brand-400 hover:bg-brand-100 dark:hover:bg-brand-500/20 cursor-pointer transition-colors">
      {isUploading ? (
        <div className="h-4 w-4 animate-spin rounded-full border-2 border-brand-300 border-t-brand-500" />
      ) : (
        <Upload className="h-4 w-4" />
      )}
      Import XLSX
      <input type="file" accept=".xlsx,.xls" className="hidden" disabled={isUploading}
        onChange={(e) => { const f = e.target.files?.[0]; if (f) onFileSelect(f); e.target.value = ""; }} />
    </label>
  );
}
