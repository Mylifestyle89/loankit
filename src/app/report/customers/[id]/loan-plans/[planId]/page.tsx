"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Save, Sparkles } from "lucide-react";

import { CostItemsTable, type CostItem } from "./cost-items-table";
import { NumericInput } from "./numeric-input";
import { inputCls } from "@/components/invoice-tracking/form-styles";
import { SmartField } from "@/components/smart-field";
import { type Financials, type RevenueItem } from "./loan-plan-editor-types";
import { fmtVND, formatPercentInputFromRate, parsePercentInputToRate } from "./loan-plan-editor-utils";
import { TreeRow, Stat } from "./loan-plan-financial-display";
import { RepaymentScheduleTable } from "./loan-plan-repayment-schedule-table";
import { CreditAssessmentSection } from "./loan-plan-credit-assessment-section";
import { LoanPlanInfoGrid, LoanPlanTrungDaiSection } from "./loan-plan-form-sections";

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
  const [constructionContractNo, setConstructionContractNo] = useState("");
  const [constructionContractDate, setConstructionContractDate] = useState("");
  // Common SXKD fields
  const [farmAddress, setFarmAddress] = useState("");
  // Đánh giá tín dụng
  const [legalAssessment, setLegalAssessment] = useState("");
  const [marketInput, setMarketInput] = useState("");
  const [marketOutput, setMarketOutput] = useState("");
  const [laborCapability, setLaborCapability] = useState("");
  const [machineryCapability, setMachineryCapability] = useState("");
  const [otherFactors, setOtherFactors] = useState("");
  const [turnoverAnalysis, setTurnoverAnalysis] = useState("");
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
      setConstructionContractNo(fin.construction_contract_no ?? "");
      setConstructionContractDate(fin.construction_contract_date ?? "");
      setFarmAddress(fin.farmAddress ?? "");
      // Đánh giá tín dụng
      setLegalAssessment(fin.legal_assessment ?? "");
      setMarketInput(fin.market_input ?? "");
      setMarketOutput(fin.market_output ?? "");
      setLaborCapability(fin.labor_capability ?? "");
      setMachineryCapability(fin.machinery_capability ?? "");
      setOtherFactors(fin.other_factors ?? "");
      setTurnoverAnalysis(fin.turnover_analysis ?? "");
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
          land_area_sau: landAreaSau, farmAddress,
          // trung_dai extended
          ...(loanMethod === "trung_dai" ? {
            depreciation_years: depreciationYears, asset_unit_price: assetUnitPrice,
            preferential_rate: preferentialRate,
            term_months: termMonths, construction_contract_no: constructionContractNo,
            construction_contract_date: constructionContractDate,
          } : {}),
          // Đánh giá tín dụng
          legal_assessment: legalAssessment, market_input: marketInput, market_output: marketOutput,
          labor_capability: laborCapability, machinery_capability: machineryCapability, other_factors: otherFactors, turnover_analysis: turnoverAnalysis,
        }),
      });
      const data = await res.json();
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
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-violet-200 border-t-violet-600" />
    </div>
  );

  return (
    <section className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href={`/report/customers/${customerId}/loan-plans`} className="inline-flex items-center gap-1 text-sm text-violet-600 dark:text-violet-400 hover:underline"><ArrowLeft className="h-3.5 w-3.5" />Danh sách PA</Link>
          <h2 className="text-lg font-bold bg-gradient-to-r from-violet-700 to-fuchsia-600 dark:from-violet-400 dark:to-fuchsia-400 bg-clip-text text-transparent">
            {name || "Phương án"}
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <input type="file" accept=".xlsx,.xls" className="hidden" ref={xlsxInputRef}
            onChange={(e) => { const f = e.target.files?.[0]; if (f) void handleAiAnalyze(f); }} />
          <button
            type="button"
            onClick={() => xlsxInputRef.current?.click()}
            disabled={analyzing}
            className="inline-flex items-center gap-1.5 rounded-lg border border-violet-200 dark:border-violet-500/20 bg-white dark:bg-[#1a1a1a] px-3 py-2 text-sm font-medium text-violet-700 dark:text-violet-400 shadow-sm hover:bg-violet-50 dark:hover:bg-violet-500/10 disabled:opacity-60"
          >
            <Sparkles className="h-4 w-4" />
            {analyzing ? "Đang phân tích..." : "AI phân tích XLSX"}
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-violet-600 to-fuchsia-600 px-4 py-2 text-sm font-medium text-white shadow-sm shadow-violet-500/25 hover:brightness-110 disabled:opacity-60"
          >
            <Save className="h-4 w-4" /> {saving ? "..." : "Lưu"}
          </button>
        </div>
      </div>

      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}

      {/* Plan info */}
      <LoanPlanInfoGrid
        name={name} onNameChange={setName}
        interestRateInput={interestRateInput} onInterestRateInputChange={setInterestRateInput}
        turnoverCycles={turnoverCycles} onTurnoverCyclesChange={setTurnoverCycles}
        loanAmount={loanAmount} onLoanAmountChange={setLoanAmount}
        landAreaSau={landAreaSau} onLandAreaSauChange={setLandAreaSau}
        farmAddress={farmAddress} onFarmAddressChange={setFarmAddress}
        turnoverAnalysis={turnoverAnalysis} onTurnoverAnalysisChange={setTurnoverAnalysis}
      />

      {/* ── Trung dài hạn: Khấu hao & Tài sản đầu tư ── */}
      {loanMethod === "trung_dai" && (
        <LoanPlanTrungDaiSection
          assetUnitPrice={assetUnitPrice} onAssetUnitPriceChange={setAssetUnitPrice}
          depreciationYears={depreciationYears} onDepreciationYearsChange={setDepreciationYears}
          landAreaSau={landAreaSau}
          termMonths={termMonths} onTermMonthsChange={setTermMonths}
          preferentialRateInput={preferentialRateInput} onPreferentialRateInputChange={setPreferentialRateInput}
          constructionContractNo={constructionContractNo} onConstructionContractNoChange={setConstructionContractNo}
          constructionContractDate={constructionContractDate} onConstructionContractDateChange={setConstructionContractDate}
        />
      )}

      {/* Cost items */}
      <div className="rounded-2xl border border-zinc-200 dark:border-white/[0.07] bg-white dark:bg-[#161616] p-5 shadow-sm">
        <h3 className="text-sm font-semibold mb-3">Chi phí trực tiếp</h3>
        <CostItemsTable items={costItems} onChange={setCostItems} />
      </div>

      {/* Revenue items */}
      <div className="rounded-2xl border border-zinc-200 dark:border-white/[0.07] bg-white dark:bg-[#161616] p-5 shadow-sm">
        <h3 className="text-sm font-semibold mb-3">Doanh thu dự kiến</h3>
        <div className="space-y-2">
          {revenueItems.map((r, idx) => (
            <div key={idx} className="grid grid-cols-[1fr_4rem_5rem_5rem_auto] gap-2 text-sm">
              <input className={inputCls} value={r.description} onChange={(e) => updateRevenue(idx, "description", e.target.value)} placeholder="Mô tả" />
              <input className={inputCls} value={r.unit ?? ""} onChange={(e) => updateRevenue(idx, "unit", e.target.value)} placeholder="ĐVT" />
              <NumericInput className={inputCls} value={r.qty} onChange={(n) => updateRevenue(idx, "qty", String(n))} placeholder="SL" />
              <NumericInput className={inputCls} value={r.unitPrice} onChange={(n) => updateRevenue(idx, "unitPrice", String(n))} placeholder="ĐG" />
              <div className="flex items-center text-right tabular-nums font-medium text-sm">{r.amount.toLocaleString("vi-VN")}</div>
            </div>
          ))}
          <button type="button" onClick={() => setRevenueItems([...revenueItems, { description: "", unit: "đ", qty: 0, unitPrice: 0, amount: 0 }])}
            className="inline-flex items-center gap-1 text-xs text-violet-600 hover:underline">+ Thêm dòng doanh thu</button>
        </div>
      </div>

      {/* Financial summary */}
      {financials && (
        <div className="rounded-2xl border border-violet-200 dark:border-violet-500/20 bg-gradient-to-br from-violet-50 to-fuchsia-50 dark:from-violet-950/20 dark:to-fuchsia-950/10 p-5 shadow-sm">
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
      {financials && (
        <div className="rounded-2xl border border-zinc-200 dark:border-white/[0.07] bg-white dark:bg-[#161616] p-5 shadow-sm">
          <h3 className="text-sm font-semibold mb-3">Nhu cầu vốn vay</h3>
          <div className="text-sm space-y-1.5">
            <TreeRow level={0} label="Nhu cầu vốn vay"
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
            <TreeRow level={1} label="Vốn đối ứng" sub="= Nhu cầu vốn vay − Số tiền vay" value={fmtVND(financials.counterpartCapital)} color={financials.counterpartCapital < 0 ? "red" : undefined} />
            <div className="border-t border-dashed border-zinc-200 dark:border-white/10 my-2" />
            <TreeRow level={0} label="Tỷ lệ vốn tự có" sub="= Vốn đối ứng / Nhu cầu vốn vay" value={financials.loanNeed ? ((financials.counterpartCapital / financials.loanNeed) * 100).toFixed(1) + "%" : "—"} bold />
            <TreeRow level={0} label="Tỷ lệ LN/Vốn đối ứng" sub="= (LN / Vòng quay vốn) / Vốn đối ứng" value={financials.counterpartCapital ? (((financials.profit / (financials.turnoverCycles || 1)) / financials.counterpartCapital) * 100).toFixed(1) + "%" : "—"} bold />
          </div>
        </div>
      )}

      {/* ── Bảng trả nợ theo năm (trung dài hạn) ── */}
      {loanMethod === "trung_dai" && termMonths > 12 && loanAmount > 0 && financials && (
        <div className="rounded-2xl border border-amber-200 dark:border-amber-500/20 bg-white dark:bg-[#161616] p-5 shadow-sm">
          <RepaymentScheduleTable
            loanAmount={loanAmount} termMonths={termMonths}
            standardRate={interestRate} preferentialRate={preferentialRate || interestRate}
            annualIncome={financials.profit + (depreciationYears > 0 ? Math.round(assetUnitPrice * landAreaSau / depreciationYears) : 0)}
          />
        </div>
      )}

      {/* ── Đánh giá tín dụng ── */}
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
    </section>
  );
}
