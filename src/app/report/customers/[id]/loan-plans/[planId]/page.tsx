"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Save, Sparkles } from "lucide-react";

import { CostItemsTable, type CostItem } from "./cost-items-table";
import { NumericInput } from "./numeric-input";
import { inputCls } from "@/components/invoice-tracking/form-styles";
import { SmartField } from "@/components/smart-field";
type RevenueItem = { description: string; qty: number; unitPrice: number; amount: number };
type Financials = {
  totalDirectCost: number; interestRate: number; turnoverCycles: number;
  interest: number; tax: number; totalIndirectCost: number; totalCost: number;
  revenue: number; profit: number; loanNeed: number; loanAmount: number; counterpartCapital: number;
};

function fmtVND(n: number) { return n.toLocaleString("vi-VN") + "đ"; }

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
  const [interestRate, setInterestRate] = useState(0);
  const [turnoverCycles, setTurnoverCycles] = useState(1);
  const [tax, setTax] = useState(0);
  const [analyzing, setAnalyzing] = useState(false);
  const xlsxInputRef = useRef<HTMLInputElement>(null);

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
    setInterestRate(fin.interestRate ?? 0);
    setTurnoverCycles(fin.turnoverCycles ?? 1);
    setTax(fin.tax ?? 0);
    setLoading(false);
  }, [planId]);

  useEffect(() => { void loadPlan(); }, [loadPlan]);

  // Derived financials — no extra state needed
  const financials = useMemo<Financials | null>(() => {
    if (loading) return null;
    const totalDirectCost = costItems.reduce((s, c) => s + c.amount, 0);
    const revenue = revenueItems.reduce((s, r) => s + r.amount, 0);
    const interest = loanAmount * interestRate;
    const totalIndirectCost = interest + tax;
    const totalCost = totalDirectCost + totalIndirectCost;
    const profit = revenue - totalCost;
    const tc = turnoverCycles || 1;
    const loanNeed = totalDirectCost / tc;
    const counterpartCapital = loanNeed - loanAmount;
    return { totalDirectCost, interestRate, turnoverCycles, interest, tax, totalIndirectCost, totalCost, revenue, profit, loanNeed, loanAmount, counterpartCapital };
  }, [costItems, revenueItems, loanAmount, interestRate, turnoverCycles, tax, loading]);

  async function handleSave() {
    setSaving(true);
    setError("");
    const res = await fetch(`/api/loan-plans/${planId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name, loan_method: loanMethod,
        cost_items: costItems, revenue_items: revenueItems,
        loanAmount, interestRate, turnoverCycles, tax,
      }),
    });
    const data = await res.json();
    setSaving(false);
    if (!data.ok) setError(data.error ?? "Lỗi lưu");
  }

  function updateRevenue(idx: number, field: keyof RevenueItem, raw: string) {
    const next = [...revenueItems];
    const item = { ...next[idx] };
    if (field === "description") item.description = raw;
    else {
      const num = Number(raw) || 0;
      if (field === "qty") item.qty = num;
      else if (field === "unitPrice") item.unitPrice = num;
    }
    item.amount = item.qty * item.unitPrice;
    next[idx] = item;
    setRevenueItems(next);
  }

  if (loading) return <div className="flex justify-center py-16"><div className="h-6 w-6 animate-spin rounded-full border-2 border-violet-200 border-t-violet-600" /></div>;

  return (
    <section className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href={`/report/customers/${customerId}/loan-plans`} className="text-sm text-violet-600 dark:text-violet-400 hover:underline">← Danh sách PA</Link>
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

      {error && <p className="text-sm text-red-600">{error}</p>}

      {/* Plan info */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 rounded-2xl border border-zinc-200 dark:border-white/[0.07] bg-white dark:bg-[#161616] p-5 shadow-sm">
        <label className="block">
          <span className="text-xs font-medium text-zinc-500">Tên PA</span>
          <SmartField fieldKey="loan_plan_name" value={name} onChange={(val) => setName(val)} className={inputCls} />
        </label>
        <label className="block">
          <span className="text-xs font-medium text-zinc-500">Lãi suất (%/năm)</span>
          <input type="number" step="0.01" value={interestRate ? (interestRate * 100) : ""} onChange={(e) => setInterestRate((Number(e.target.value) || 0) / 100)} className={inputCls} placeholder="VD: 9" />
        </label>
        <label className="block">
          <span className="text-xs font-medium text-zinc-500">Vòng quay vốn</span>
          <input type="number" step="0.1" value={turnoverCycles || ""} onChange={(e) => setTurnoverCycles(Number(e.target.value) || 1)} className={inputCls} placeholder="VD: 3" />
        </label>
        <label className="block">
          <span className="text-xs font-medium text-zinc-500">Số tiền vay</span>
          <NumericInput value={loanAmount} onChange={setLoanAmount} className={inputCls} placeholder="0" />
        </label>
      </div>

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
            <div key={idx} className="grid grid-cols-4 gap-2 text-sm">
              <input className={inputCls} value={r.description} onChange={(e) => updateRevenue(idx, "description", e.target.value)} placeholder="Mô tả" />
              <NumericInput className={inputCls} value={r.qty} onChange={(n) => updateRevenue(idx, "qty", String(n))} placeholder="SL" />
              <NumericInput className={inputCls} value={r.unitPrice} onChange={(n) => updateRevenue(idx, "unitPrice", String(n))} placeholder="Đơn giá" />
              <div className="flex items-center text-right tabular-nums font-medium text-sm">{r.amount.toLocaleString("vi-VN")}</div>
            </div>
          ))}
          <button type="button" onClick={() => setRevenueItems([...revenueItems, { description: "", qty: 0, unitPrice: 0, amount: 0 }])}
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
            <Stat label="Tổng chi phí gián tiếp (Lãi vay + Thuế)" value={fmtVND(financials.totalIndirectCost)} />
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
            <TreeRow level={0} label="Nhu cầu vốn vay" sub="= Tổng CPTT / Vòng quay vốn" value={fmtVND(financials.loanNeed)} bold />
            <TreeRow level={1} label="Tổng chi phí trực tiếp" value={fmtVND(financials.totalDirectCost)} />
            <TreeRow level={1} label="Vòng quay vốn" value={String(financials.turnoverCycles)} />
            <div className="border-t border-dashed border-zinc-200 dark:border-white/10 my-2" />
            <TreeRow level={1} label="Số tiền vay" value={fmtVND(financials.loanAmount)} />
            <TreeRow level={1} label="Vốn đối ứng" sub="= Nhu cầu vốn vay − Số tiền vay" value={fmtVND(financials.counterpartCapital)} color={financials.counterpartCapital < 0 ? "red" : undefined} />
            <div className="border-t border-dashed border-zinc-200 dark:border-white/10 my-2" />
            <TreeRow level={0} label="Tỷ lệ vốn tự có" sub="= Vốn đối ứng / Nhu cầu vốn vay" value={financials.loanNeed ? ((financials.counterpartCapital / financials.loanNeed) * 100).toFixed(1) + "%" : "—"} bold />
            <TreeRow level={0} label="Tỷ lệ LN/Vốn đối ứng" sub="= (LN / Vòng quay vốn) / Vốn đối ứng" value={financials.counterpartCapital ? (((financials.profit / (financials.turnoverCycles || 1)) / financials.counterpartCapital) * 100).toFixed(1) + "%" : "—"} bold />
          </div>
        </div>
      )}
    </section>
  );
}

function TreeRow({ level, label, sub, value, bold, color }: { level: number; label: string; sub?: string; value: string; bold?: boolean; color?: string }) {
  const indent = level * 24;
  const colorCls = color === "red" ? "text-red-600" : "";
  return (
    <div className="flex items-baseline justify-between" style={{ paddingLeft: indent }}>
      <div className="flex items-baseline gap-1.5">
        {level > 0 && <span className="text-zinc-300 dark:text-zinc-600">└</span>}
        <span className={bold ? "font-semibold" : ""}>{label}</span>
        {sub && <span className="text-[10px] text-zinc-400">{sub}</span>}
      </div>
      <span className={`tabular-nums font-medium ${colorCls} ${bold ? "font-semibold" : ""}`}>{value}</span>
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: string; color?: string }) {
  const colorCls = color === "red" ? "text-red-600" : color === "emerald" ? "text-emerald-600" : "";
  return (
    <div>
      <p className="text-xs text-zinc-500">{label}</p>
      <p className={`font-semibold tabular-nums ${colorCls}`}>{value}</p>
    </div>
  );
}
