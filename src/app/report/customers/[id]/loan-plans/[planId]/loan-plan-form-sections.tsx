"use client";

/**
 * loan-plan-form-sections.tsx
 *
 * Reusable form sections for LoanPlanEditorPage:
 * - LoanPlanInfoGrid: basic plan fields (name, rate, cycles, amount, land area, address)
 * - LoanPlanTrungDaiSection: extended fields for trung_dai loan method
 */

import { inputCls } from "@/components/invoice-tracking/form-styles";
import { SmartField } from "@/components/smart-field";
import { NumericInput } from "./numeric-input";
import { fmtVND, formatPercentInputFromRate } from "./loan-plan-editor-utils";

/** Returns true if value is a valid rate input: empty string or decimal number (e.g. "9,5" or "7.5") */
function isRateInput(value: string): boolean {
  return value === "" || /^\d+([,.]\d*)?$/.test(value);
}

// ─── LoanPlanInfoGrid ──────────────────────────────────────────────────────────

type InfoGridProps = {
  name: string;
  onNameChange: (v: string) => void;
  interestRateInput: string;
  onInterestRateInputChange: (v: string) => void;
  turnoverCycles: number;
  onTurnoverCyclesChange: (v: number) => void;
  loanAmount: number;
  onLoanAmountChange: (v: number) => void;
  landAreaSau: number;
  onLandAreaSauChange: (v: number) => void;
  farmAddress: string;
  onFarmAddressChange: (v: string) => void;
  turnoverAnalysis: string;
  onTurnoverAnalysisChange: (v: string) => void;
};

export function LoanPlanInfoGrid({
  name, onNameChange,
  interestRateInput, onInterestRateInputChange,
  turnoverCycles, onTurnoverCyclesChange,
  loanAmount, onLoanAmountChange,
  landAreaSau, onLandAreaSauChange,
  farmAddress, onFarmAddressChange,
  turnoverAnalysis, onTurnoverAnalysisChange,
}: InfoGridProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 rounded-2xl border border-zinc-200 dark:border-white/[0.07] bg-white dark:bg-[#161616] p-5 shadow-sm">
      <label className="block">
        <span className="text-xs font-medium text-zinc-500">Tên PA</span>
        <SmartField fieldKey="loan_plan_name" value={name} onChange={onNameChange} className={inputCls} />
      </label>
      <label className="block">
        <span className="text-xs font-medium text-zinc-500">Lãi suất (%/năm)</span>
        <input
          type="text"
          inputMode="decimal"
          value={interestRateInput}
          onChange={(e) => {
            const raw = e.target.value.trim();
            if (isRateInput(raw)) onInterestRateInputChange(raw);
          }}
          className={inputCls}
          placeholder="VD: 9,5"
        />
      </label>
      <label className="block">
        <span className="text-xs font-medium text-zinc-500">Vòng quay vốn</span>
        <input
          type="number"
          step="0.1"
          value={turnoverCycles || ""}
          onChange={(e) => onTurnoverCyclesChange(Number(e.target.value) || 1)}
          className={inputCls}
          placeholder="VD: 3"
        />
      </label>
      <label className="block">
        <span className="text-xs font-medium text-zinc-500">Số tiền vay</span>
        <NumericInput value={loanAmount} onChange={onLoanAmountChange} className={inputCls} placeholder="0" />
      </label>
      <label className="block">
        <span className="text-xs font-medium text-zinc-500">Số sào đất</span>
        <input
          type="number"
          step="0.1"
          value={landAreaSau || ""}
          onChange={(e) => onLandAreaSauChange(Number(e.target.value) || 0)}
          className={inputCls}
          placeholder="VD: 10"
        />
      </label>
      <label className="block">
        <span className="text-xs font-medium text-zinc-500">Địa chỉ đất NN</span>
        <input
          type="text"
          value={farmAddress}
          onChange={(e) => onFarmAddressChange(e.target.value)}
          className={inputCls}
          placeholder="VD: xã ABC, huyện XYZ"
        />
      </label>
      {/* Phân tích vòng quay vốn — resizable textarea spanning full width */}
      <label className="block sm:col-span-2 lg:col-span-4">
        <span className="text-xs font-medium text-zinc-500">Phân tích vòng quay vốn</span>
        <textarea
          value={turnoverAnalysis}
          onChange={(e) => onTurnoverAnalysisChange(e.target.value)}
          className={`${inputCls} min-h-[60px] resize-y`}
          rows={3}
          placeholder="VD: Căn cứ xác định vòng quay vốn lưu động dự kiến kỳ kế hoạch: Hoa Ly có chu kỳ sinh trưởng khoảng 3-4 tháng..."
        />
      </label>
    </div>
  );
}

// ─── LoanPlanTrungDaiSection ───────────────────────────────────────────────────

type TrungDaiProps = {
  assetUnitPrice: number;
  onAssetUnitPriceChange: (v: number) => void;
  depreciationYears: number;
  onDepreciationYearsChange: (v: number) => void;
  landAreaSau: number;
  termMonths: number;
  onTermMonthsChange: (v: number) => void;
  preferentialRateInput: string;
  onPreferentialRateInputChange: (v: string) => void;
  constructionContractNo: string;
  onConstructionContractNoChange: (v: string) => void;
  constructionContractDate: string;
  onConstructionContractDateChange: (v: string) => void;
};

export function LoanPlanTrungDaiSection({
  assetUnitPrice, onAssetUnitPriceChange,
  depreciationYears, onDepreciationYearsChange,
  landAreaSau,
  termMonths, onTermMonthsChange,
  preferentialRateInput, onPreferentialRateInputChange,
  constructionContractNo, onConstructionContractNoChange,
  constructionContractDate, onConstructionContractDateChange,
}: TrungDaiProps) {
  return (
    <div className="rounded-2xl border border-amber-200 dark:border-amber-500/20 bg-amber-50/50 dark:bg-amber-950/10 p-5 shadow-sm space-y-4">
      <h3 className="text-sm font-semibold">Khấu hao &amp; Tài sản đầu tư</h3>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <label className="block">
          <span className="text-xs font-medium text-zinc-500">Đơn giá tài sản/sào</span>
          <NumericInput value={assetUnitPrice} onChange={onAssetUnitPriceChange} className={inputCls} placeholder="VD: 270,000,000" />
        </label>
        <label className="block">
          <span className="text-xs font-medium text-zinc-500">Số năm khấu hao</span>
          <input
            type="number"
            value={depreciationYears || ""}
            onChange={(e) => onDepreciationYearsChange(Number(e.target.value) || 0)}
            className={inputCls}
            placeholder="VD: 8"
          />
        </label>
      </div>

      {assetUnitPrice > 0 && landAreaSau > 0 && (
        <div className="grid grid-cols-2 gap-3 text-sm bg-amber-100/50 dark:bg-amber-900/10 rounded-lg p-3">
          <div>
            <span className="text-zinc-500 text-xs">Tổng giá trị tài sản</span>
            <p className="font-semibold tabular-nums">{fmtVND(assetUnitPrice * landAreaSau)}</p>
          </div>
          {depreciationYears > 0 && (
            <div>
              <span className="text-zinc-500 text-xs">Khấu hao/năm</span>
              <p className="font-semibold tabular-nums">{fmtVND(Math.round(assetUnitPrice * landAreaSau / depreciationYears))}</p>
            </div>
          )}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 pt-2 border-t border-amber-200/50 dark:border-amber-800/20">
        <label className="block">
          <span className="text-xs font-medium text-zinc-500">Thời hạn vay (tháng)</span>
          <input
            type="number"
            value={termMonths || ""}
            onChange={(e) => onTermMonthsChange(Number(e.target.value) || 0)}
            className={inputCls}
            placeholder="VD: 96"
          />
        </label>
        <label className="block">
          <span className="text-xs font-medium text-zinc-500">Lãi suất ưu đãi năm đầu (%/năm)</span>
          <input
            type="text"
            inputMode="decimal"
            value={preferentialRateInput}
            onChange={(e) => {
              const r = e.target.value.trim();
              if (isRateInput(r)) onPreferentialRateInputChange(r);
            }}
            className={inputCls}
            placeholder="VD: 7,5"
          />
        </label>
        <label className="block">
          <span className="text-xs font-medium text-zinc-500">Số HĐ thi công</span>
          <input
            type="text"
            value={constructionContractNo}
            onChange={(e) => onConstructionContractNoChange(e.target.value)}
            className={inputCls}
          />
        </label>
        <label className="block">
          <span className="text-xs font-medium text-zinc-500">Ngày HĐ thi công</span>
          <input
            type="text"
            value={constructionContractDate}
            onChange={(e) => onConstructionContractDateChange(e.target.value)}
            className={inputCls}
            placeholder="DD/MM/YYYY"
          />
        </label>
      </div>
    </div>
  );
}
