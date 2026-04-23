"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, FileSignature, Plus, Save, Sparkles, Trash2 } from "lucide-react";

import { CostItemsTable, type CostItem } from "./cost-items-table";
import { NumericInput } from "./numeric-input";
import { inputCls } from "@/components/invoice-tracking/form-styles";
import { SmartField } from "@/components/smart-field";
import { type Financials, type RevenueItem, type TieuDungSubtype, type EarnerTitle, type IncomeSourceType, type AgricultureItem, type BusinessRevenueRow } from "./loan-plan-editor-types";
import { fmtVND, formatPercentInputFromRate, parsePercentInputToRate } from "./loan-plan-editor-utils";
import { TreeRow, Stat } from "./loan-plan-financial-display";
import { RepaymentScheduleTable } from "./loan-plan-repayment-schedule-table";
import { CreditAssessmentSection } from "./loan-plan-credit-assessment-section";
import { LoanPlanInfoGrid, LoanPlanTrungDaiSection } from "./loan-plan-form-sections";
import { LoanPlanTieuDungSection } from "./loan-plan-tieu-dung-section";
import { LoanPlanAgricultureIncomeForm } from "./loan-plan-agriculture-income-form";
import { LoanPlanBusinessIncomeForm } from "./loan-plan-business-income-form";
import { LoanPlanReview36Section } from "./loan-plan-review-36-section";
import { METHOD_SHORT_LABELS, METHOD_OPTIONS } from "@/lib/loan-plan/loan-plan-constants";

export default function LoanPlanEditorPage() {
  const { id: customerId, planId } = useParams() as { id: string; planId: string };
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [name, setName] = useState("");
  const [loanMethod, setLoanMethod] = useState("tung_lan");
  const [costItems, setCostItems] = useState<CostItem[]>([]);
  const [revenueItems, setRevenueItems] = useState<RevenueItem[]>([]);
  const [loanAmount, setLoanAmount] = useState(0);
  const [interestRateInput, setInterestRateInput] = useState("");
  const [turnoverCycles, setTurnoverCycles] = useState(1);
  const [tax, setTax] = useState(0);
  const [analyzing, setAnalyzing] = useState(false);
  // trung_dai extended fields
  const [depreciationYears, setDepreciationYears] = useState(0);
  const [assetUnitPrice, setAssetUnitPrice] = useState(0);
  const [landAreaSau, setLandAreaSau] = useState(0);
  const [preferentialRateInput, setPreferentialRateInput] = useState("");
  const [termMonths, setTermMonths] = useState(0);
  const [repaymentFrequency, setRepaymentFrequency] = useState(12);
  const [principalRounding, setPrincipalRounding] = useState<"none" | "up_100k" | "down_100k">("none");
  const [constructionContractNo, setConstructionContractNo] = useState("");
  const [constructionContractDate, setConstructionContractDate] = useState("");
  // Common SXKD fields
  const [farmAddress, setFarmAddress] = useState("");
  const [flowerType, setFlowerType] = useState("");
  // Tiêu dùng fields
  const [incomeSourceType, setIncomeSourceType] = useState<IncomeSourceType | "">("");
  const [tieuDungSubtype, setTieuDungSubtype] = useState<TieuDungSubtype | "">("");
  const [earner1Title, setEarner1Title] = useState<EarnerTitle>("Ông");
  const [earner1Name, setEarner1Name] = useState("");
  const [earner1Workplace, setEarner1Workplace] = useState("");
  const [earner1Income, setEarner1Income] = useState(0);
  const [earner2Title, setEarner2Title] = useState<EarnerTitle>("Bà");
  const [earner2Name, setEarner2Name] = useState("");
  const [earner2Workplace, setEarner2Workplace] = useState("");
  const [earner2Income, setEarner2Income] = useState(0);
  const [livingExpensesPeriod, setLivingExpensesPeriod] = useState(0);
  const [avgOtherLoanRate, setAvgOtherLoanRate] = useState(0);
  const [otherCostsPeriod, setOtherCostsPeriod] = useState(0);
  const [loanCapitalNeed, setLoanCapitalNeed] = useState(0);
  // Tiêu dùng - nông nghiệp / kinh doanh
  const [agricultureItems, setAgricultureItems] = useState<AgricultureItem[]>([]);
  const [agricultureLivingExpenses, setAgricultureLivingExpenses] = useState(0);
  const [businessRows, setBusinessRows] = useState<BusinessRevenueRow[]>([]);
  const [businessOtherCosts, setBusinessOtherCosts] = useState(0);
  const [businessLivingExpenses, setBusinessLivingExpenses] = useState(0);
  const [repaymentNarrative, setRepaymentNarrative] = useState("");
  // Đánh giá tín dụng
  const [legalAssessment, setLegalAssessment] = useState("");
  const [marketInput, setMarketInput] = useState("");
  const [marketOutput, setMarketOutput] = useState("");
  const [laborCapability, setLaborCapability] = useState("");
  const [machineryCapability, setMachineryCapability] = useState("");
  const [otherFactors, setOtherFactors] = useState("");
  const [turnoverAnalysis, setTurnoverAnalysis] = useState("");
  // Đánh giá lại hạn mức 36 tháng
  const [review36Months, setReview36Months] = useState(false);
  const [actualRevenue, setActualRevenue] = useState(0);
  const [actualCost, setActualCost] = useState(0);
  const xlsxInputRef = useRef<HTMLInputElement>(null);
  const interestRate = parsePercentInputToRate(interestRateInput);
  const preferentialRate = parsePercentInputToRate(preferentialRateInput);

  async function handleAiAnalyze(file: File) {
    setAnalyzing(true);
    setError("");
    try {
      const formData = new FormData();
      formData.append("xlsxFile", file);
      const res = await fetch(`/api/loan-plans/${planId}/ai-analyze`, { method: "POST", body: formData });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "AI phân tích thất bại");
      if (data.name) setName(data.name);
      if (data.loanAmount) setLoanAmount(data.loanAmount);
      if (data.turnoverCycles) setTurnoverCycles(data.turnoverCycles);
      if (typeof data.interestRate === "number") setInterestRateInput(formatPercentInputFromRate(data.interestRate));
      if (data.costItems?.length) setCostItems(data.costItems);
      if (data.revenueItems?.length) setRevenueItems(data.revenueItems);
    } catch (err) {
      setError(err instanceof Error ? err.message : "AI phân tích thất bại");
    } finally {
      setAnalyzing(false);
      if (xlsxInputRef.current) xlsxInputRef.current.value = "";
    }
  }

  const loadPlan = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/loan-plans/${planId}`, { cache: "no-store" });
      const data = await res.json();
      if (!data.ok) { setError(data.error ?? "Not found"); setLoading(false); return; }
      const p = data.plan;
      setName(p.name ?? "");
      setLoanMethod(p.loan_method ?? "tung_lan");
      setCostItems(JSON.parse(p.cost_items_json || "[]"));
      setRevenueItems(JSON.parse(p.revenue_items_json || "[]"));
      const fin: Financials = JSON.parse(p.financials_json || "{}");
      setLoanAmount(fin.loanAmount ?? 0);
      setInterestRateInput(formatPercentInputFromRate(fin.interestRate ?? 0));
      setTurnoverCycles(fin.turnoverCycles ?? 1);
      setTax(fin.tax ?? 0);
      // trung_dai extended
      setDepreciationYears(fin.depreciation_years ?? 0);
      setAssetUnitPrice(fin.asset_unit_price ?? 0);
      setLandAreaSau(fin.land_area_sau ?? 0);
      setPreferentialRateInput(formatPercentInputFromRate(fin.preferential_rate ?? 0));
      setTermMonths(fin.term_months ?? 0);
      setRepaymentFrequency(fin.repayment_frequency ?? 12);
      setPrincipalRounding(fin.principal_rounding ?? "none");
      setConstructionContractNo(fin.construction_contract_no ?? "");
      setConstructionContractDate(fin.construction_contract_date ?? "");
      setFarmAddress(fin.farmAddress ?? "");
      setFlowerType(fin.flower_type ?? "");
      // Tiêu dùng
      setIncomeSourceType(fin.income_source_type ?? "");
      setTieuDungSubtype(fin.tieu_dung_subtype ?? "");
      setEarner1Title(fin.earner1_title ?? "Ông");
      setEarner1Name(fin.earner1_name ?? "");
      setEarner1Workplace(fin.earner1_workplace ?? "");
      setEarner1Income(fin.earner1_monthly_income ?? 0);
      setEarner2Title(fin.earner2_title ?? "Bà");
      setEarner2Name(fin.earner2_name ?? "");
      setEarner2Workplace(fin.earner2_workplace ?? "");
      setEarner2Income(fin.earner2_monthly_income ?? 0);
      setLivingExpensesPeriod(fin.living_expenses_period ?? 0);
      setAvgOtherLoanRate(fin.avg_other_loan_rate ?? 0);
      setOtherCostsPeriod(fin.other_costs_period ?? 0);
      setLoanCapitalNeed(fin.loan_capital_need ?? 0);
      setAgricultureItems(fin.agriculture_items ?? []);
      setAgricultureLivingExpenses(fin.agriculture_living_expenses_annual ?? 0);
      setBusinessRows(fin.business_rows ?? []);
      setBusinessOtherCosts(fin.business_other_costs_annual ?? 0);
      setBusinessLivingExpenses(fin.business_living_expenses_monthly ?? 0);
      setRepaymentNarrative(fin.repayment_narrative ?? "");
      // Đánh giá tín dụng
      setLegalAssessment(fin.legal_assessment ?? "");
      setMarketInput(fin.market_input ?? "");
      setMarketOutput(fin.market_output ?? "");
      setLaborCapability(fin.labor_capability ?? "");
      setMachineryCapability(fin.machinery_capability ?? "");
      setOtherFactors(fin.other_factors ?? "");
      setTurnoverAnalysis(fin.turnover_analysis ?? "");
      // Đánh giá lại hạn mức 36 tháng
      setReview36Months(fin.review_36_months ?? false);
      setActualRevenue(fin.actual_revenue ?? 0);
      setActualCost(fin.actual_cost ?? 0);
    } catch (err) { setError(err instanceof Error ? err.message : "Lỗi tải dữ liệu"); }
    setLoading(false);
  }, [planId]);

  useEffect(() => { void loadPlan(); }, [loadPlan]);

  // Derived financials — no extra state needed
  const financials = useMemo<Financials | null>(() => {
    if (loading) return null;
    const totalDirectCost = costItems.reduce((s, c) => s + c.amount, 0);
    const revenue = revenueItems.reduce((s, r) => s + r.amount, 0);
    const interest = loanAmount * interestRate;
    // Trung dài hạn: chi phí gián tiếp = khấu hao (không phải lãi vay)
    const depPerYear = (loanMethod === "trung_dai" && assetUnitPrice > 0 && landAreaSau > 0 && depreciationYears > 0)
      ? Math.round(assetUnitPrice * landAreaSau / depreciationYears) : 0;
    const totalIndirectCost = (loanMethod === "trung_dai") ? depPerYear : (interest + tax);
    const totalCost = totalDirectCost + totalIndirectCost;
    const profit = revenue - totalCost;
    const tc = turnoverCycles || 1;
    // Trung dài hạn: nhu cầu vốn = giá trị tài sản (nhà kính), không phải CPTT/vòng quay
    const loanNeed = (loanMethod === "trung_dai" && assetUnitPrice > 0 && landAreaSau > 0)
      ? assetUnitPrice * landAreaSau
      : totalDirectCost / tc;
    const counterpartCapital = loanNeed - loanAmount;
    return { totalDirectCost, interestRate, turnoverCycles, interest, tax, totalIndirectCost, totalCost, revenue, profit, loanNeed, loanAmount, counterpartCapital };
  }, [costItems, revenueItems, loanAmount, interestRate, turnoverCycles, tax, loading, loanMethod, assetUnitPrice, landAreaSau, depreciationYears]);

  async function handleSave() {
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/loan-plans/${planId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name, loan_method: loanMethod,
          cost_items: costItems, revenue_items: revenueItems,
          loanAmount, interestRate, turnoverCycles, tax,
          land_area_sau: landAreaSau, farmAddress, flower_type: flowerType || undefined,
          // trung_dai extended
          ...(loanMethod === "trung_dai" ? {
            depreciation_years: depreciationYears, asset_unit_price: assetUnitPrice,
            preferential_rate: preferentialRate,
            term_months: termMonths,
            repayment_frequency: repaymentFrequency,
            principal_rounding: principalRounding,
            construction_contract_no: constructionContractNo,
            construction_contract_date: constructionContractDate,
          } : {}),
          ...(loanMethod === "tieu_dung" ? {
            term_months: termMonths,
            repayment_frequency: repaymentFrequency,
            principal_rounding: principalRounding,
            loan_capital_need: loanCapitalNeed,
            income_source_type: incomeSourceType || undefined,
            tieu_dung_subtype: tieuDungSubtype || undefined,
            earner1_title: earner1Title,
            earner1_name: earner1Name,
            earner1_workplace: earner1Workplace,
            earner1_monthly_income: earner1Income,
            earner2_title: earner2Title,
            earner2_name: earner2Name,
            earner2_workplace: earner2Workplace,
            earner2_monthly_income: earner2Income,
            living_expenses_period: livingExpensesPeriod,
            avg_other_loan_rate: avgOtherLoanRate,
            other_costs_period: otherCostsPeriod,
            agriculture_items: agricultureItems,
            agriculture_living_expenses_annual: agricultureLivingExpenses,
            business_rows: businessRows,
            business_other_costs_annual: businessOtherCosts,
            business_living_expenses_monthly: businessLivingExpenses,
            repayment_narrative: repaymentNarrative,
          } : {}),
          // Đánh giá tín dụng
          legal_assessment: legalAssessment, market_input: marketInput, market_output: marketOutput,
          labor_capability: laborCapability, machinery_capability: machineryCapability, other_factors: otherFactors, turnover_analysis: turnoverAnalysis,
          // Đánh giá lại hạn mức 36 tháng (actual_profit derived in builder, not stored)
          ...(loanMethod === "han_muc" ? {
            review_36_months: review36Months,
            actual_revenue: actualRevenue,
            actual_cost: actualCost,
          } : {}),
        }),
      });
      let data: { ok: boolean; error?: string };
      try { data = await res.json(); } catch {
        setError(res.status === 413 ? "Dữ liệu quá lớn, không thể lưu." : `Lỗi máy chủ (${res.status})`);
        setSaving(false); return;
      }
      if (!data.ok) setError(data.error ?? "Lỗi lưu");
    } catch (err) { setError(err instanceof Error ? err.message : "Lỗi lưu"); }
    setSaving(false);
  }

  function updateRevenue(idx: number, field: keyof RevenueItem | "unit", raw: string) {
    const next = [...revenueItems];
    const item = { ...next[idx] };
    if (field === "description") item.description = raw;
    else if (field === "unit") item.unit = raw;
    else {
      const num = Number(raw) || 0;
      if (field === "qty") item.qty = num;
      else if (field === "unitPrice") item.unitPrice = num;
    }
    item.amount = item.qty * item.unitPrice;
    next[idx] = item;
    setRevenueItems(next);
  }

  if (loading) return (
    <div className="flex justify-center py-16">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand-200 border-t-brand-500" />
    </div>
  );

  return (
    <section className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href={`/report/customers/${customerId}/loan-plans`} className="inline-flex items-center gap-1 text-sm text-brand-500 dark:text-brand-400 hover:underline"><ArrowLeft className="h-3.5 w-3.5" />Danh sách PA</Link>
          <h2 className="text-lg font-bold text-brand-600 dark:text-brand-400">
            {name || "Phương án"}
          </h2>
          <select
            value={loanMethod}
            onChange={(e) => setLoanMethod(e.target.value)}
            className={`rounded-full px-2.5 py-0.5 text-xs font-medium border-0 outline-none cursor-pointer ${
              loanMethod === "han_muc"   ? "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400" :
              loanMethod === "trung_dai" ? "bg-purple-100 text-purple-700 dark:bg-purple-500/15 dark:text-purple-400" :
              loanMethod === "tieu_dung" ? "bg-pink-100 text-pink-700 dark:bg-pink-500/15 dark:text-pink-400" :
              "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400"
            }`}
          >
            {METHOD_OPTIONS.filter((o) => o.value !== "cam_co").map((o) => (
              <option key={o.value} value={o.value}>{METHOD_SHORT_LABELS[o.value]}</option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <input type="file" accept=".xlsx,.xls" className="hidden" ref={xlsxInputRef}
            onChange={(e) => { const f = e.target.files?.[0]; if (f) void handleAiAnalyze(f); }} />
          <button
            type="button"
            onClick={() => xlsxInputRef.current?.click()}
            disabled={analyzing}
            className="inline-flex items-center gap-1.5 rounded-lg border border-brand-200 dark:border-brand-500/20 bg-white dark:bg-[#1a1a1a] px-3 py-2 text-sm font-medium text-brand-600 dark:text-brand-400 shadow-sm hover:bg-brand-50 dark:hover:bg-brand-500/10 disabled:opacity-60"
          >
            <Sparkles className="h-4 w-4" />
            {analyzing ? "Đang phân tích..." : "AI phân tích XLSX"}
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-1.5 rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white shadow-sm shadow-brand-500/25 hover:brightness-110 disabled:opacity-60"
          >
            <Save className="h-4 w-4" /> {saving ? "..." : "Lưu"}
          </button>
          <Link
            href={`/report/loans/new?customerId=${customerId}&planId=${planId}`}
            className="inline-flex items-center gap-1.5 rounded-lg border border-brand-300 dark:border-brand-500/30 px-4 py-2 text-sm font-medium text-brand-600 dark:text-brand-400 hover:bg-brand-50 dark:hover:bg-brand-500/10 transition-colors"
          >
            <FileSignature className="h-4 w-4" /> Tạo HĐTD
          </Link>
        </div>
      </div>

      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}

      {/* Plan info */}
      <LoanPlanInfoGrid
        loanMethod={loanMethod}
        name={name} onNameChange={setName}
        interestRateInput={interestRateInput} onInterestRateInputChange={setInterestRateInput}
        turnoverCycles={turnoverCycles} onTurnoverCyclesChange={setTurnoverCycles}
        loanAmount={loanAmount} onLoanAmountChange={setLoanAmount}
        landAreaSau={landAreaSau} onLandAreaSauChange={setLandAreaSau}
        farmAddress={farmAddress} onFarmAddressChange={setFarmAddress}
        flowerType={flowerType} onFlowerTypeChange={setFlowerType}
        turnoverAnalysis={turnoverAnalysis} onTurnoverAnalysisChange={setTurnoverAnalysis}
        termMonths={termMonths} onTermMonthsChange={setTermMonths}
        repaymentFrequency={repaymentFrequency} onRepaymentFrequencyChange={setRepaymentFrequency}
        loanCapitalNeed={loanCapitalNeed} onLoanCapitalNeedChange={setLoanCapitalNeed}
      />

      {/* ── Trung dài hạn: Khấu hao & Tài sản đầu tư ── */}
      {loanMethod === "trung_dai" && (
        <LoanPlanTrungDaiSection
          assetUnitPrice={assetUnitPrice} onAssetUnitPriceChange={setAssetUnitPrice}
          depreciationYears={depreciationYears} onDepreciationYearsChange={setDepreciationYears}
          landAreaSau={landAreaSau}
          termMonths={termMonths} onTermMonthsChange={setTermMonths}
          preferentialRateInput={preferentialRateInput} onPreferentialRateInputChange={setPreferentialRateInput}
          repaymentFrequency={repaymentFrequency} onRepaymentFrequencyChange={setRepaymentFrequency}
          principalRounding={principalRounding} onPrincipalRoundingChange={setPrincipalRounding}
          constructionContractNo={constructionContractNo} onConstructionContractNoChange={setConstructionContractNo}
          constructionContractDate={constructionContractDate} onConstructionContractDateChange={setConstructionContractDate}
        />
      )}

      {/* ── Tiêu dùng: Nguồn thu nhập + Chi phí + Preview ── */}
      {loanMethod === "tieu_dung" && (
        <div className="rounded-2xl border border-zinc-200 dark:border-white/[0.07] bg-white dark:bg-[#161616] p-5 shadow-sm">
          <label className="block text-xs text-zinc-500 mb-1">Nguồn thu nhập chính trả nợ</label>
          <select
            className="w-full rounded-lg border border-zinc-200 dark:border-white/[0.07] bg-white dark:bg-[#0f0f0f] px-3 py-2 text-sm"
            value={incomeSourceType}
            onChange={(e) => setIncomeSourceType((e.target.value || "") as IncomeSourceType | "")}
          >
            <option value="">— Chọn nguồn thu —</option>
            <option value="salary">Lương (cán bộ / công nhân viên)</option>
            <option value="agriculture">Nông nghiệp</option>
            <option value="business">Kinh doanh</option>
          </select>
        </div>
      )}
      {loanMethod === "tieu_dung" && (!incomeSourceType || incomeSourceType === "salary") && (
        <LoanPlanTieuDungSection
          loanAmount={loanAmount}
          termMonths={termMonths}
          repaymentFrequency={repaymentFrequency}
          subtype={tieuDungSubtype}
          onSubtypeChange={setTieuDungSubtype}
          earner1Title={earner1Title} onEarner1TitleChange={setEarner1Title}
          earner1Name={earner1Name} onEarner1NameChange={setEarner1Name}
          earner1Workplace={earner1Workplace} onEarner1WorkplaceChange={setEarner1Workplace}
          earner1Income={earner1Income} onEarner1IncomeChange={setEarner1Income}
          earner2Title={earner2Title} onEarner2TitleChange={setEarner2Title}
          earner2Name={earner2Name} onEarner2NameChange={setEarner2Name}
          earner2Workplace={earner2Workplace} onEarner2WorkplaceChange={setEarner2Workplace}
          earner2Income={earner2Income} onEarner2IncomeChange={setEarner2Income}
          livingExpensesPeriod={livingExpensesPeriod} onLivingExpensesPeriodChange={setLivingExpensesPeriod}
          avgOtherLoanRate={avgOtherLoanRate} onAvgOtherLoanRateChange={setAvgOtherLoanRate}
          otherCostsPeriod={otherCostsPeriod} onOtherCostsPeriodChange={setOtherCostsPeriod}
          principalRounding={principalRounding} onPrincipalRoundingChange={setPrincipalRounding}
        />
      )}
      {loanMethod === "tieu_dung" && incomeSourceType === "agriculture" && (
        <div className="rounded-2xl border border-zinc-200 dark:border-white/[0.07] bg-white dark:bg-[#161616] p-5 shadow-sm space-y-2">
          <h3 className="text-sm font-semibold">Bảng chi phí / doanh thu nông nghiệp</h3>
          <LoanPlanAgricultureIncomeForm
            items={agricultureItems} onItemsChange={setAgricultureItems}
            livingExpenses={agricultureLivingExpenses} onLivingExpensesChange={setAgricultureLivingExpenses}
            narrative={repaymentNarrative} onNarrativeChange={setRepaymentNarrative}
            loanAmount={loanAmount} termMonths={termMonths}
            interestRate={interestRate} preferentialRate={preferentialRate || undefined}
          />
        </div>
      )}
      {loanMethod === "tieu_dung" && incomeSourceType === "business" && (
        <div className="rounded-2xl border border-zinc-200 dark:border-white/[0.07] bg-white dark:bg-[#161616] p-5 shadow-sm space-y-2">
          <h3 className="text-sm font-semibold">Bảng doanh thu kinh doanh</h3>
          <LoanPlanBusinessIncomeForm
            rows={businessRows} onRowsChange={setBusinessRows}
            otherCosts={businessOtherCosts} onOtherCostsChange={setBusinessOtherCosts}
            livingExpenses={businessLivingExpenses} onLivingExpensesChange={setBusinessLivingExpenses}
            narrative={repaymentNarrative} onNarrativeChange={setRepaymentNarrative}
          />
        </div>
      )}


      {/* Cost items — hide for tieu_dung (consumer loan has its own expense inputs) */}
      {loanMethod !== "tieu_dung" && (
        <div className="rounded-2xl border border-zinc-200 dark:border-white/[0.07] bg-white dark:bg-[#161616] p-5 shadow-sm">
          <h3 className="text-sm font-semibold mb-3">Chi phí trực tiếp</h3>
          <CostItemsTable items={costItems} onChange={setCostItems} />
        </div>
      )}

      {/* Revenue items — hide for tieu_dung */}
      {loanMethod !== "tieu_dung" && (
      <div className="rounded-2xl border border-zinc-200 dark:border-white/[0.07] bg-white dark:bg-[#161616] p-5 shadow-sm">
        <h3 className="text-sm font-semibold mb-3">Doanh thu dự kiến</h3>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-zinc-50 dark:bg-white/[0.03] text-xs text-zinc-500">
                <th className="px-2 py-1.5 border border-zinc-200 dark:border-white/[0.07] text-left w-[30%]">Hạng mục</th>
                <th className="px-2 py-1.5 border border-zinc-200 dark:border-white/[0.07] text-center w-[10%]">ĐVT</th>
                <th className="px-2 py-1.5 border border-zinc-200 dark:border-white/[0.07] text-right w-[15%]">Số lượng</th>
                <th className="px-2 py-1.5 border border-zinc-200 dark:border-white/[0.07] text-right w-[20%]">Đơn giá</th>
                <th className="px-2 py-1.5 border border-zinc-200 dark:border-white/[0.07] text-right w-[20%]">Thành tiền</th>
                <th className="px-2 py-1.5 border border-zinc-200 dark:border-white/[0.07] w-[5%]" />
              </tr>
            </thead>
            <tbody>
              {revenueItems.map((r, idx) => (
                <tr key={idx} className="hover:bg-brand-50/30 dark:hover:bg-brand-500/5">
                  <td className="px-2 py-1.5 border border-zinc-200 dark:border-white/[0.07]">
                    <input className="w-full bg-transparent outline-none text-sm" value={r.description} onChange={(e) => updateRevenue(idx, "description", e.target.value)} placeholder="Mô tả" />
                  </td>
                  <td className="px-2 py-1.5 border border-zinc-200 dark:border-white/[0.07] text-center">
                    <input className="w-full bg-transparent outline-none text-center text-sm" value={r.unit ?? ""} onChange={(e) => updateRevenue(idx, "unit", e.target.value)} placeholder="kg" />
                  </td>
                  <td className="px-2 py-1.5 border border-zinc-200 dark:border-white/[0.07]">
                    <NumericInput className="w-full bg-transparent outline-none text-right tabular-nums" value={r.qty} onChange={(n) => updateRevenue(idx, "qty", String(n))} placeholder="0" />
                  </td>
                  <td className="px-2 py-1.5 border border-zinc-200 dark:border-white/[0.07]">
                    <NumericInput className="w-full bg-transparent outline-none text-right tabular-nums" value={r.unitPrice} onChange={(n) => updateRevenue(idx, "unitPrice", String(n))} placeholder="0" />
                  </td>
                  <td className="px-2 py-1.5 border border-zinc-200 dark:border-white/[0.07] text-right tabular-nums font-medium">
                    {r.amount.toLocaleString("vi-VN")}
                  </td>
                  <td className="px-2 py-1.5 border border-zinc-200 dark:border-white/[0.07] text-center">
                    <button type="button" onClick={() => setRevenueItems(revenueItems.filter((_, i) => i !== idx))} className="text-zinc-400 hover:text-red-500">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-zinc-50 dark:bg-white/[0.03] font-semibold">
                <td colSpan={4} className="px-2 py-1.5 border border-zinc-200 dark:border-white/[0.07] text-right text-sm">Tổng doanh thu</td>
                <td className="px-2 py-1.5 border border-zinc-200 dark:border-white/[0.07] text-right tabular-nums text-sm">{revenueItems.reduce((s, r) => s + r.amount, 0).toLocaleString("vi-VN")}</td>
                <td className="px-2 py-1.5 border border-zinc-200 dark:border-white/[0.07]" />
              </tr>
            </tfoot>
          </table>
          <button type="button" onClick={() => setRevenueItems([...revenueItems, { description: "", unit: "đ", qty: 0, unitPrice: 0, amount: 0 }])}
            className="mt-2 inline-flex items-center gap-1 rounded-lg border border-dashed border-zinc-300 dark:border-white/[0.1] px-3 py-1.5 text-xs text-zinc-500 hover:border-brand-300 hover:text-brand-500">
            <Plus className="h-3 w-3" /> Thêm dòng doanh thu
          </button>
        </div>
      </div>
      )}

      {/* Financial summary — hide for tieu_dung (uses its own preview card) */}
      {financials && loanMethod !== "tieu_dung" && (
        <div className="rounded-2xl border border-brand-200 dark:border-brand-500/20 bg-gradient-to-br from-brand-50 to-brand-50 dark:from-brand-900/20 dark:to-brand-900/10 p-5 shadow-sm">
          <h3 className="text-sm font-semibold mb-3">Tổng hợp tài chính</h3>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 text-sm">
            <Stat label="Tổng chi phí trực tiếp" value={fmtVND(financials.totalDirectCost)} />
            <Stat label="Lãi vay (Số tiền vay × Lãi suất)" value={fmtVND(financials.interest)} />
            <div>
              <p className="text-xs text-zinc-500">Thuế</p>
              <NumericInput value={tax} onChange={setTax}
                className="font-semibold tabular-nums bg-transparent border-b border-dashed border-zinc-300 dark:border-white/20 outline-none w-full text-sm" placeholder="Nhập thuế" />
            </div>
            {loanMethod === "trung_dai" && depreciationYears > 0 && assetUnitPrice > 0 && landAreaSau > 0 && (
              <Stat label="Khấu hao/năm" value={fmtVND(Math.round(assetUnitPrice * landAreaSau / depreciationYears))} />
            )}
            <Stat label={loanMethod === "trung_dai" ? "Chi phí gián tiếp (Khấu hao)" : "Tổng chi phí gián tiếp (Lãi vay + Thuế)"} value={fmtVND(financials.totalIndirectCost)} />
            <Stat label="Tổng chi phí" value={fmtVND(financials.totalCost)} />
            <Stat label="Doanh thu DK" value={fmtVND(financials.revenue)} />
            <Stat label="Lợi nhuận DK" value={fmtVND(financials.profit)} color={financials.profit >= 0 ? "emerald" : "red"} />
          </div>
        </div>
      )}

      {/* Nhu cầu vốn vay — hierarchical display */}
      {financials && loanMethod !== "tieu_dung" && (
        <div className="rounded-2xl border border-zinc-200 dark:border-white/[0.07] bg-white dark:bg-[#161616] p-5 shadow-sm">
          <h3 className="text-sm font-semibold mb-3">Nhu cầu vốn vay</h3>
          <div className="text-sm space-y-1.5">
            <TreeRow level={0} label="Nhu cầu vốn trên 1 vòng quay"
              sub={loanMethod === "trung_dai" ? "= Tổng giá trị tài sản" : "= Tổng CPTT / Vòng quay vốn"}
              value={fmtVND(financials.loanNeed)} bold />
            {loanMethod === "trung_dai" ? (
              <TreeRow level={1} label="Tổng giá trị tài sản" value={fmtVND(assetUnitPrice * landAreaSau)} />
            ) : (<>
              <TreeRow level={1} label="Tổng chi phí trực tiếp" value={fmtVND(financials.totalDirectCost)} />
              <TreeRow level={1} label="Vòng quay vốn" value={String(financials.turnoverCycles)} />
            </>)}
            <div className="border-t border-dashed border-zinc-200 dark:border-white/10 my-2" />
            <TreeRow level={1} label="Số tiền vay" value={fmtVND(financials.loanAmount)} />
            <TreeRow level={1} label="Vốn đối ứng" sub="= Nhu cầu vốn trên 1 vòng quay − Số tiền vay" value={fmtVND(financials.counterpartCapital)} color={financials.counterpartCapital < 0 ? "red" : undefined} />
            <div className="border-t border-dashed border-zinc-200 dark:border-white/10 my-2" />
            <TreeRow level={0} label="Tỷ lệ vốn tự có" sub="= Vốn đối ứng / Nhu cầu vốn trên 1 vòng quay" value={financials.loanNeed ? ((financials.counterpartCapital / financials.loanNeed) * 100).toFixed(1) + "%" : "—"} bold />
            <TreeRow level={0} label="Tỷ lệ LN/Vốn đối ứng" sub="= (LN / Vòng quay vốn) / Vốn đối ứng" value={financials.counterpartCapital ? (((financials.profit / (financials.turnoverCycles || 1)) / financials.counterpartCapital) * 100).toFixed(1) + "%" : "—"} bold />
          </div>
        </div>
      )}

      {/* Nhu cầu vốn vay — variant cho tiêu dùng (input trực tiếp, không vòng quay/CPTT) */}
      {loanMethod === "tieu_dung" && loanCapitalNeed > 0 && (
        <div className="rounded-2xl border border-zinc-200 dark:border-white/[0.07] bg-white dark:bg-[#161616] p-5 shadow-sm">
          <h3 className="text-sm font-semibold mb-3">Nhu cầu vốn vay</h3>
          <div className="text-sm space-y-1.5">
            <TreeRow level={0} label="Nhu cầu vốn vay" value={fmtVND(loanCapitalNeed)} bold />
            <TreeRow level={1} label="Số tiền vay" value={fmtVND(loanAmount)} />
            <TreeRow level={1} label="Vốn đối ứng" sub="= Nhu cầu vốn vay − Số tiền vay" value={fmtVND(loanCapitalNeed - loanAmount)} color={loanCapitalNeed - loanAmount < 0 ? "red" : undefined} />
            <div className="border-t border-dashed border-zinc-200 dark:border-white/10 my-2" />
            <TreeRow level={0} label="Tỷ lệ vốn tự có" sub="= Vốn đối ứng / Nhu cầu vốn vay"
              value={loanCapitalNeed ? (((loanCapitalNeed - loanAmount) / loanCapitalNeed) * 100).toFixed(1) + "%" : "—"} bold />
          </div>
        </div>
      )}

      {/* ── Bảng trả nợ theo năm (trung dài hạn) ── */}
      {loanMethod === "trung_dai" && termMonths > 12 && loanAmount > 0 && financials && (
        <div className="rounded-2xl border border-brand-200 dark:border-brand-500/20 bg-white dark:bg-[#161616] p-5 shadow-sm">
          <RepaymentScheduleTable
            loanAmount={loanAmount} termMonths={termMonths}
            standardRate={interestRate} preferentialRate={preferentialRate || interestRate}
            annualIncome={financials.profit + (depreciationYears > 0 ? Math.round(assetUnitPrice * landAreaSau / depreciationYears) : 0)}
            repaymentFrequency={repaymentFrequency}
            principalRounding={principalRounding}
          />
        </div>
      )}

      {/* ── Đánh giá tín dụng — hide cho tiêu dùng (nguồn trả từ lương, không cần phân tích PA/dự án) ── */}
      {loanMethod !== "tieu_dung" && (
        <CreditAssessmentSection
          planId={planId} planName={name} costItems={costItems} revenueItems={revenueItems}
          financials={{ loanAmount, interestRate, term_months: termMonths, asset_unit_price: assetUnitPrice, land_area_sau: landAreaSau, construction_contract_no: constructionContractNo }}
          legalAssessment={legalAssessment} setLegalAssessment={setLegalAssessment}
          marketInput={marketInput} setMarketInput={setMarketInput}
          marketOutput={marketOutput} setMarketOutput={setMarketOutput}
          laborCapability={laborCapability} setLaborCapability={setLaborCapability}
          machineryCapability={machineryCapability} setMachineryCapability={setMachineryCapability}
          otherFactors={otherFactors} setOtherFactors={setOtherFactors}
        />
      )}

      {/* ── Đánh giá lại hạn mức 36 tháng — chỉ hiển thị cho phương án hạn mức ── */}
      {loanMethod === "han_muc" && financials && (
        <LoanPlanReview36Section
          enabled={review36Months} onEnabledChange={setReview36Months}
          actualRevenue={actualRevenue} onActualRevenueChange={setActualRevenue}
          actualCost={actualCost} onActualCostChange={setActualCost}
          plannedRevenue={financials.revenue}
          plannedCost={financials.totalCost}
          plannedProfit={financials.profit}
        />
      )}
    </section>
  );
}
