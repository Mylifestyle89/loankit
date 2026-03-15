"use client";

import { useCallback, useState } from "react";
import { RefreshCw } from "lucide-react";
import { fmtNumber, parseNumber } from "@/lib/invoice-tracking-format-helpers";
import { SmartField } from "@/components/smart-field";

const inputCls =
  "mt-1 w-full rounded-md border border-zinc-300 dark:border-white/[0.09] bg-white dark:bg-[#1a1a1a] px-3 py-2 text-sm transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/40 focus-visible:border-violet-400";
const labelCls = "text-xs font-medium text-zinc-600 dark:text-slate-400";

type Fields = Record<string, string>;
type SetFields = (fn: (prev: Fields) => Fields) => void;

/** Fetch first loan plan financials for a customer */
async function fetchPlanFinancials(customerId: string) {
  const res = await fetch(`/api/loan-plans?customerId=${customerId}`, { cache: "no-store" });
  const data = await res.json();
  if (!data.ok || !data.plans?.length) return null;
  // Use first plan (most recent)
  const plan = data.plans[0];
  const fin = JSON.parse(plan.financials_json || "{}");
  return fin as {
    totalDirectCost?: number;
    totalIndirectCost?: number;
    totalCost?: number;
    revenue?: number;
    profit?: number;
    loanNeed?: number;
    loanAmount?: number;
    counterpartCapital?: number;
    turnoverCycles?: number;
    interest?: number;
  };
}

/** "Đồng bộ từ PA" button */
function SyncFromPlanButton({ onClick, loading }: { onClick: () => void; loading: boolean }) {
  return (
    <button type="button" onClick={onClick} disabled={loading}
      className="inline-flex items-center gap-1 rounded-md border border-violet-200 dark:border-violet-500/20 bg-violet-50 dark:bg-violet-500/10 px-2.5 py-1 text-[11px] font-medium text-violet-700 dark:text-violet-400 hover:bg-violet-100 disabled:opacity-50">
      <RefreshCw className={`h-3 w-3 ${loading ? "animate-spin" : ""}`} />
      {loading ? "Đang lấy..." : "Đồng bộ từ PA"}
    </button>
  );
}

function set(setF: SetFields, key: string, val: string) {
  setF((p) => ({ ...p, [key]: val }));
}

function numSet(setF: SetFields, key: string, val: string) {
  setF((p) => ({ ...p, [key]: fmtNumber(val) }));
}

function Field({ label, name, fields, setFields, type = "text" }: {
  label: string; name: string; fields: Fields; setFields: SetFields; type?: "text" | "number" | "textarea";
}) {
  if (type === "textarea") {
    return (
      <label className="block col-span-2">
        <span className={labelCls}>{label}</span>
        <textarea value={fields[name] ?? ""} onChange={(e) => set(setFields, name, e.target.value)} rows={2} className={inputCls} />
      </label>
    );
  }
  if (type === "number") {
    return (
      <label className="block">
        <span className={labelCls}>{label}</span>
        <input type="text" inputMode="numeric" value={fields[name] ?? ""} onChange={(e) => numSet(setFields, name, e.target.value)} className={inputCls} />
      </label>
    );
  }
  return (
    <label className="block">
      <span className={labelCls}>{label}</span>
      <input type="text" value={fields[name] ?? ""} onChange={(e) => set(setFields, name, e.target.value)} className={inputCls} />
    </label>
  );
}

/** SmartField wrapper for loan condition fields (enables dropdown suggestions) */
function SmartFieldRow({ label, name, fieldKey, fields, setFields }: {
  label: string; name: string; fieldKey: string; fields: Fields; setFields: SetFields;
}) {
  return (
    <label className="block">
      <span className={labelCls}>{label}</span>
      <SmartField
        fieldKey={fieldKey}
        value={fields[name] ?? ""}
        onChange={(val) => set(setFields, name, val)}
        className={inputCls}
      />
    </label>
  );
}

/** Subtab 2: Điều kiện cho vay */
export function LoanConditionsTab({ fields, setFields }: { fields: Fields; setFields: SetFields }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <SmartFieldRow label="Phương thức cho vay" name="lending_method" fieldKey="loan.lending_method" fields={fields} setFields={setFields} />
      <SmartFieldRow label="Lý do TCMBLM" name="tcmblm_reason" fieldKey="loan.tcmblm_reason" fields={fields} setFields={setFields} />
      <SmartFieldRow label="Phương thức tính lãi" name="interest_method" fieldKey="loan.interest_method" fields={fields} setFields={setFields} />
      <SmartFieldRow label="Kỳ hạn trả gốc" name="principal_schedule" fieldKey="loan.principal_schedule" fields={fields} setFields={setFields} />
      <SmartFieldRow label="Kỳ hạn trả lãi" name="interest_schedule" fieldKey="loan.interest_schedule" fields={fields} setFields={setFields} />
      <SmartFieldRow label="Chương trình/chính sách" name="policy_program" fieldKey="loan.policy_program" fields={fields} setFields={setFields} />
    </div>
  );
}

/** Subtab 3: Nguồn vốn & Vốn đối ứng */
export function LoanCapitalTab({ fields, setFields, customerId }: { fields: Fields; setFields: SetFields; customerId?: string }) {
  const [syncing, setSyncing] = useState(false);

  const totalNeed = Number(parseNumber(fields.total_capital_need ?? "0")) || 0;
  const cashEquity = Number(parseNumber(fields.cash_equity ?? "0")) || 0;
  const equityAmount = Number(parseNumber(fields.equity_amount ?? "0")) || 0;
  const laborEquity = equityAmount - cashEquity;
  const counterpartRatio = totalNeed > 0 ? ((equityAmount / totalNeed) * 100).toFixed(1) : "0";

  const handleSync = useCallback(async () => {
    if (!customerId) return;
    setSyncing(true);
    try {
      const fin = await fetchPlanFinancials(customerId);
      if (!fin) { alert("Chưa có phương án vay vốn nào"); return; }
      const turnover = fin.turnoverCycles || 1;
      const need = Math.round((fin.totalDirectCost || 0) / turnover);
      const equity = need - (fin.loanAmount || 0);
      setFields((p) => ({
        ...p,
        total_capital_need: fmtNumber(String(need)),
        equity_amount: fmtNumber(String(Math.max(0, equity))),
      }));
    } finally { setSyncing(false); }
  }, [customerId, setFields]);

  return (
    <div className="space-y-3">
      {customerId && (
        <div className="flex justify-end">
          <SyncFromPlanButton onClick={handleSync} loading={syncing} />
        </div>
      )}
      <div className="grid grid-cols-2 gap-3">
        <Field label="Tổng nhu cầu vốn" name="total_capital_need" fields={fields} setFields={setFields} type="number" />
        <Field label="Vốn đối ứng" name="equity_amount" fields={fields} setFields={setFields} type="number" />
        <Field label="Vốn bằng tiền" name="cash_equity" fields={fields} setFields={setFields} type="number" />
        <label className="block">
          <span className={labelCls}>Vốn bằng sức lao động (tự tính)</span>
          <input type="text" readOnly value={fmtNumber(String(Math.max(0, laborEquity)))} className={`${inputCls} bg-zinc-50 dark:bg-zinc-900 cursor-not-allowed`} />
        </label>
        <Field label="Vay nơi khác" name="other_loan" fields={fields} setFields={setFields} type="number" />
        <Field label="Vốn đối ứng bằng TS khác" name="other_asset_equity" fields={fields} setFields={setFields} type="number" />
      </div>
      <div className="rounded-md bg-violet-50 dark:bg-violet-500/10 px-3 py-2 text-xs text-violet-700 dark:text-violet-300">
        Tỷ lệ vốn đối ứng: <strong>{counterpartRatio}%</strong>
      </div>
    </div>
  );
}

/** Subtab 4: Hiệu quả & Xếp hạng */
export function LoanEfficiencyTab({ fields, setFields, customerId }: { fields: Fields; setFields: SetFields; customerId?: string }) {
  const [syncing, setSyncing] = useState(false);

  const handleSync = useCallback(async () => {
    if (!customerId) return;
    setSyncing(true);
    try {
      const fin = await fetchPlanFinancials(customerId);
      if (!fin) { alert("Chưa có phương án vay vốn nào"); return; }
      const revenue = fin.revenue || 0;
      const cost = (fin.totalDirectCost || 0) + (fin.totalIndirectCost || 0);
      const profit = revenue - cost;
      setFields((p) => ({
        ...p,
        expected_revenue: fmtNumber(String(revenue)),
        expected_cost: fmtNumber(String(cost)),
        expected_profit: fmtNumber(String(profit)),
      }));
    } finally { setSyncing(false); }
  }, [customerId, setFields]);

  return (
    <div className="space-y-3">
      {customerId && (
        <div className="flex justify-end">
          <SyncFromPlanButton onClick={handleSync} loading={syncing} />
        </div>
      )}
      <div className="grid grid-cols-2 gap-3">
        <Field label="Doanh thu dự kiến" name="expected_revenue" fields={fields} setFields={setFields} type="number" />
        <Field label="Chi phí dự kiến" name="expected_cost" fields={fields} setFields={setFields} type="number" />
        <Field label="Lợi nhuận dự kiến" name="expected_profit" fields={fields} setFields={setFields} type="number" />
        <Field label="Nguồn trả nợ từ PA" name="from_project" fields={fields} setFields={setFields} />
        <Field label="Thu nhập khác" name="other_income" fields={fields} setFields={setFields} />
        <Field label="Chi tiết thu nhập khác" name="other_income_detail" fields={fields} setFields={setFields} type="textarea" />
        <Field label="Xếp hạng tín dụng KH" name="customer_rating" fields={fields} setFields={setFields} />
        <Field label="Nhóm nợ" name="debt_group" fields={fields} setFields={setFields} />
        <Field label="Kỳ chấm điểm" name="scoring_period" fields={fields} setFields={setFields} />
      </div>
    </div>
  );
}

/** Parse loan object into flat string fields for subtabs */
export function loanToExtFields(loan: Record<string, unknown>): Fields {
  const keys = [
    "lending_method", "tcmblm_reason", "interest_method", "principal_schedule",
    "interest_schedule", "policy_program", "total_capital_need", "equity_amount",
    "cash_equity", "labor_equity", "other_loan", "other_asset_equity",
    "expected_revenue", "expected_cost", "expected_profit", "from_project",
    "other_income", "other_income_detail", "customer_rating", "debt_group", "scoring_period",
  ];
  const result: Fields = {};
  for (const k of keys) {
    const v = loan[k];
    if (v == null) result[k] = "";
    else if (typeof v === "number") result[k] = fmtNumber(String(v));
    else result[k] = String(v);
  }
  return result;
}

/** Convert subtab fields back to API payload */
export function extFieldsToPayload(fields: Fields): Record<string, unknown> {
  const numKeys = new Set([
    "total_capital_need", "equity_amount", "cash_equity", "labor_equity",
    "other_loan", "other_asset_equity", "expected_revenue", "expected_cost", "expected_profit",
  ]);
  const result: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(fields)) {
    if (!v.trim()) { result[k] = null; continue; }
    result[k] = numKeys.has(k) ? Number(parseNumber(v)) : v;
  }
  return result;
}
