"use client";

/**
 * loan-plan-tieu-dung-section.tsx
 *
 * Form section cho phương án vay tiêu dùng (consumer loan).
 * - 2 slot earner cố định (KH + vợ/chồng)
 * - Chi phí 3 tháng (sinh hoạt / lãi vay / khác)
 * - Preview tính toán: thu − chi = dư → mỗi kỳ trả gốc
 */

import { inputCls } from "@/components/invoice-tracking/form-styles";
import type { TieuDungSubtype, EarnerTitle } from "@/lib/loan-plan/loan-plan-types";
import { formatPeriodLabel, roundPrincipal, type PrincipalRounding } from "@/lib/loan-plan/loan-plan-calculator";
import { NumericInput } from "./numeric-input";
import { fmtVND, formatPercentInputFromRate, parsePercentInputToRate } from "./loan-plan-editor-utils";

const SUBTYPE_OPTIONS: Array<{ value: TieuDungSubtype; label: string; disabled?: boolean }> = [
  { value: "xay_sua_nha", label: "Xây sửa nhà ở" },
  { value: "mua_dat", label: "Mua đất ở" },
  { value: "mua_xe", label: "Mua xe tiêu dùng" },
  { value: "mua_sam", label: "Mua sắm vật dụng sinh hoạt (sắp có)", disabled: true },
];

type Props = {
  loanAmount: number;
  termMonths: number;
  repaymentFrequency: number;

  subtype: TieuDungSubtype | "";
  onSubtypeChange: (v: TieuDungSubtype) => void;

  earner1Title: EarnerTitle;
  onEarner1TitleChange: (v: EarnerTitle) => void;
  earner1Name: string;
  onEarner1NameChange: (v: string) => void;
  earner1Workplace: string;
  onEarner1WorkplaceChange: (v: string) => void;
  earner1Income: number;
  onEarner1IncomeChange: (v: number) => void;

  earner2Title: EarnerTitle;
  onEarner2TitleChange: (v: EarnerTitle) => void;
  earner2Name: string;
  onEarner2NameChange: (v: string) => void;
  earner2Workplace: string;
  onEarner2WorkplaceChange: (v: string) => void;
  earner2Income: number;
  onEarner2IncomeChange: (v: number) => void;

  livingExpensesPeriod: number;
  onLivingExpensesPeriodChange: (v: number) => void;
  avgOtherLoanRate: number;
  onAvgOtherLoanRateChange: (v: number) => void;
  otherCostsPeriod: number;
  onOtherCostsPeriodChange: (v: number) => void;

  principalRounding: PrincipalRounding;
  onPrincipalRoundingChange: (v: PrincipalRounding) => void;
};

export function LoanPlanTieuDungSection(props: Props) {
  const {
    loanAmount, termMonths, repaymentFrequency,
    subtype, onSubtypeChange,
    earner1Title, onEarner1TitleChange, earner1Name, onEarner1NameChange,
    earner1Workplace, onEarner1WorkplaceChange, earner1Income, onEarner1IncomeChange,
    earner2Title, onEarner2TitleChange, earner2Name, onEarner2NameChange,
    earner2Workplace, onEarner2WorkplaceChange, earner2Income, onEarner2IncomeChange,
    livingExpensesPeriod, onLivingExpensesPeriodChange,
    avgOtherLoanRate, onAvgOtherLoanRateChange,
    otherCostsPeriod, onOtherCostsPeriodChange,
    principalRounding, onPrincipalRoundingChange,
  } = props;

  // ── Derived preview values (dynamic theo kỳ hạn trả gốc) ──
  const periodMonths = repaymentFrequency > 0 ? repaymentFrequency : 1;
  const periodLabel = formatPeriodLabel(periodMonths);
  const totalIncomePeriod = (earner1Income + earner2Income) * periodMonths;
  const interestCostPeriod = Math.round(loanAmount * avgOtherLoanRate * periodMonths / 12);
  const totalExpensesPeriod = livingExpensesPeriod + interestCostPeriod + otherCostsPeriod;
  const available = totalIncomePeriod - totalExpensesPeriod;

  const totalPeriods = repaymentFrequency > 0 && termMonths > 0
    ? Math.ceil(termMonths / repaymentFrequency)
    : 0;
  // Apply rounding: kỳ thường giống nhau, kỳ cuối auto-adjust để tổng = loanAmount
  const perPeriod = totalPeriods > 0
    ? roundPrincipal(loanAmount / totalPeriods, principalRounding)
    : 0;
  const lastPeriodAmount = totalPeriods > 0
    ? loanAmount - perPeriod * (totalPeriods - 1)
    : 0;
  const hasRoundingDiff = totalPeriods > 1 && lastPeriodAmount !== perPeriod;
  const remaining = available - perPeriod;
  const insufficientIncome = available > 0 && perPeriod > available;

  return (
    <div className="rounded-2xl border border-brand-200 dark:border-brand-500/20 bg-brand-50/50 dark:bg-brand-900/10 p-5 shadow-sm space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Phương án vay tiêu dùng</h3>
        <label className="text-xs text-zinc-500">
          <span className="mr-2">Mục đích vay</span>
          <select
            value={subtype}
            onChange={(e) => onSubtypeChange(e.target.value as TieuDungSubtype)}
            className="rounded border border-zinc-200 dark:border-white/10 bg-white dark:bg-[#1a1a1a] px-2 py-1 text-xs"
          >
            <option value="">— Chọn —</option>
            {SUBTYPE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value} disabled={o.disabled}>{o.label}</option>
            ))}
          </select>
        </label>
      </div>

      {/* ── Người trả nợ 1 (KH) ── */}
      <div className="space-y-2">
        <p className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">Người trả nợ 1 (Khách hàng)</p>
        <div className="grid gap-3 sm:grid-cols-4">
          <label className="block">
            <span className="text-xs text-zinc-500">Danh xưng</span>
            <select value={earner1Title} onChange={(e) => onEarner1TitleChange(e.target.value as EarnerTitle)} className={inputCls}>
              <option value="Ông">Ông</option>
              <option value="Bà">Bà</option>
            </select>
          </label>
          <label className="block sm:col-span-3">
            <span className="text-xs text-zinc-500">Họ tên</span>
            <input type="text" value={earner1Name} onChange={(e) => onEarner1NameChange(e.target.value)} className={inputCls} placeholder="VD: Đào Minh Trí" />
          </label>
          <label className="block sm:col-span-2">
            <span className="text-xs text-zinc-500">Nơi công tác</span>
            <input type="text" value={earner1Workplace} onChange={(e) => onEarner1WorkplaceChange(e.target.value)} className={inputCls} placeholder="VD: Công ty TNHH TVTK XD STT79" />
          </label>
          <label className="block sm:col-span-2">
            <span className="text-xs text-zinc-500">Lương + phụ cấp hàng tháng</span>
            <NumericInput value={earner1Income} onChange={onEarner1IncomeChange} className={inputCls} placeholder="VD: 15,000,000" />
          </label>
        </div>
      </div>

      {/* ── Người trả nợ 2 (vợ/chồng — tùy chọn) ── */}
      <div className="space-y-2 pt-2 border-t border-brand-200/40 dark:border-brand-700/20">
        <p className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">Người trả nợ 2 (vợ/chồng — tùy chọn)</p>
        <div className="grid gap-3 sm:grid-cols-4">
          <label className="block">
            <span className="text-xs text-zinc-500">Danh xưng</span>
            <select value={earner2Title} onChange={(e) => onEarner2TitleChange(e.target.value as EarnerTitle)} className={inputCls}>
              <option value="Ông">Ông</option>
              <option value="Bà">Bà</option>
            </select>
          </label>
          <label className="block sm:col-span-3">
            <span className="text-xs text-zinc-500">Họ tên</span>
            <input type="text" value={earner2Name} onChange={(e) => onEarner2NameChange(e.target.value)} className={inputCls} placeholder="Để trống nếu KH độc thân" />
          </label>
          <label className="block sm:col-span-2">
            <span className="text-xs text-zinc-500">Nơi công tác</span>
            <input type="text" value={earner2Workplace} onChange={(e) => onEarner2WorkplaceChange(e.target.value)} className={inputCls} />
          </label>
          <label className="block sm:col-span-2">
            <span className="text-xs text-zinc-500">Lương + phụ cấp hàng tháng</span>
            <NumericInput value={earner2Income} onChange={onEarner2IncomeChange} className={inputCls} />
          </label>
        </div>
      </div>

      {/* ── Chi phí dynamic theo kỳ ── */}
      <div className="space-y-2 pt-2 border-t border-brand-200/40 dark:border-brand-700/20">
        <p className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">
          Chi phí bình quân {periodLabel}
        </p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="block">
            <span className="text-xs text-zinc-500">Chi phí sinh hoạt {periodLabel}</span>
            <NumericInput value={livingExpensesPeriod} onChange={onLivingExpensesPeriodChange} className={inputCls} placeholder="VD: 24,000,000" />
          </label>
          <label className="block">
            <span className="text-xs text-zinc-500">Lãi suất BQ (%/năm)</span>
            <input
              type="text"
              inputMode="decimal"
              value={formatPercentInputFromRate(avgOtherLoanRate)}
              onChange={(e) => onAvgOtherLoanRateChange(parsePercentInputToRate(e.target.value))}
              className={inputCls}
              placeholder="VD: 9"
            />
          </label>
          <label className="block">
            <span className="text-xs text-zinc-500">Chi phí khác {periodLabel}</span>
            <NumericInput value={otherCostsPeriod} onChange={onOtherCostsPeriodChange} className={inputCls} placeholder="VD: 0" />
          </label>
          <label className="block">
            <span className="text-xs text-zinc-500">Làm tròn gốc trả</span>
            <select
              value={principalRounding}
              onChange={(e) => onPrincipalRoundingChange(e.target.value as PrincipalRounding)}
              className={inputCls}
            >
              <option value="none">Không làm tròn</option>
              <option value="up_100k">Làm tròn lên 100.000đ</option>
              <option value="down_100k">Làm tròn xuống 100.000đ</option>
            </select>
          </label>
        </div>
      </div>

      {/* ── Preview card ── */}
      {(earner1Income > 0 || earner2Income > 0) && (
        <div className="pt-3 border-t border-brand-200/40 dark:border-brand-700/20">
          <p className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-2">
            Tính toán khả năng trả nợ ({periodLabel})
          </p>
          <div className="grid grid-cols-2 gap-2 text-sm bg-white dark:bg-[#1a1a1a] rounded-lg p-3">
            <div className="flex justify-between"><span className="text-zinc-500">Tổng thu nhập:</span><span className="font-semibold tabular-nums">{fmtVND(totalIncomePeriod)}</span></div>
            <div className="flex justify-between"><span className="text-zinc-500">Tổng chi phí:</span><span className="font-semibold tabular-nums">{fmtVND(totalExpensesPeriod)}</span></div>
            <div className="col-span-2 ml-4 text-xs text-zinc-400 space-y-0.5">
              <div className="flex justify-between"><span>├─ Sinh hoạt:</span><span className="tabular-nums">{fmtVND(livingExpensesPeriod)}</span></div>
              <div className="flex justify-between"><span>├─ Lãi vay (ước tính):</span><span className="tabular-nums">{fmtVND(interestCostPeriod)}</span></div>
              <div className="flex justify-between"><span>└─ Khác:</span><span className="tabular-nums">{fmtVND(otherCostsPeriod)}</span></div>
            </div>
            <div className="col-span-2 flex justify-between pt-1 border-t border-zinc-100 dark:border-white/[0.05]">
              <span className="text-zinc-500">Dư để trả gốc:</span>
              <span className="font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">{fmtVND(available)}</span>
            </div>
            {totalPeriods > 0 && (
              <>
                <div className="col-span-2 flex justify-between">
                  <span className="text-zinc-500">Mỗi kỳ trả gốc ({totalPeriods} kỳ):</span>
                  <span className="font-semibold tabular-nums">{fmtVND(perPeriod)}</span>
                </div>
                {hasRoundingDiff && (
                  <div className="col-span-2 flex justify-between text-xs text-zinc-400">
                    <span>└─ Kỳ cuối (kỳ {totalPeriods}):</span>
                    <span className="tabular-nums">{fmtVND(lastPeriodAmount)}</span>
                  </div>
                )}
                <div className="col-span-2 flex justify-between">
                  <span className="text-zinc-500">Còn lại sau khi trả:</span>
                  <span className={`font-semibold tabular-nums ${remaining < 0 ? "text-red-600" : ""}`}>{fmtVND(remaining)}</span>
                </div>
              </>
            )}
          </div>
          {insufficientIncome && (
            <p className="mt-2 text-xs text-red-600 dark:text-red-400">
              ⚠ Thu nhập không đủ trả gốc mỗi kỳ. Kiểm tra lại thời hạn vay hoặc số tiền vay.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
