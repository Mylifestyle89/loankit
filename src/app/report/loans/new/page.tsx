"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CreditCard, Landmark } from "lucide-react";

import { useLanguage } from "@/components/language-provider";
import { fmtNumber, parseNumber, formatDateInput, dmy2iso } from "@/lib/invoice-tracking-format-helpers";

type Customer = { id: string; customer_name: string };

export default function NewLoanPage() {
  return <Suspense><NewLoanForm /></Suspense>;
}

function NewLoanForm() {
  const { t } = useLanguage();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loanType, setLoanType] = useState<"normal" | "the_loc_viet" | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customerId, setCustomerId] = useState(searchParams.get("customerId") ?? "");
  const [contractNumber, setContractNumber] = useState("");
  const [loanAmount, setLoanAmount] = useState("");
  const [interestRate, setInterestRate] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [purpose, setPurpose] = useState("");
  const [disbursementCount, setDisbursementCount] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const isCard = loanType === "the_loc_viet";

  useEffect(() => {
    fetch("/api/customers").then((r) => r.json()).then((d) => {
      if (d.ok) setCustomers(d.customers ?? []);
    });
  }, []);

  // Auto-prefill from loan plan if planId is provided
  useEffect(() => {
    const planId = searchParams.get("planId");
    if (!planId) return;
    fetch(`/api/loan-plans/${planId}`).then((r) => r.json()).then((d) => {
      if (!d.ok) return;
      const plan = d.plan;
      const fin = JSON.parse(plan.financials_json || "{}");
      if (fin.loanAmount && !loanAmount) setLoanAmount(fmtNumber(String(fin.loanAmount)));
      if (fin.interestRate && !interestRate) {
        const rate = fin.interestRate < 1 ? fin.interestRate * 100 : fin.interestRate;
        setInterestRate(String(rate));
      }
      if (plan.name && !purpose) setPurpose(plan.name);
    }).catch(() => {});
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");

    const isoStart = dmy2iso(startDate);
    const isoEnd = dmy2iso(endDate);
    if (!isoStart || !isoEnd) {
      setError(t("loans.invalidDate") ?? "Ngày không hợp lệ (dd/mm/yyyy)");
      setSaving(false);
      return;
    }

    try {
      const res = await fetch("/api/loans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId,
          contractNumber,
          loanAmount: Number(parseNumber(loanAmount)),
          interestRate: interestRate ? Number(interestRate) : undefined,
          startDate: isoStart,
          endDate: isoEnd,
          purpose: isCard ? undefined : (purpose || undefined),
          disbursementCount: isCard ? undefined : (disbursementCount || undefined),
          loanPlanId: isCard ? undefined : (searchParams.get("planId") ?? undefined),
          loan_method: isCard ? "the_loc_viet" : undefined,
        }),
      });
      const data = await res.json();
      if (!data.ok) { setError(data.error ?? "Failed"); return; }
      router.push(`/report/loans/${data.loan.id}`);
    } catch {
      setError("Network error.");
    } finally {
      setSaving(false);
    }
  }

  const inputCls = "mt-1 w-full rounded-lg border border-zinc-200 dark:border-white/[0.09] bg-white dark:bg-[#1a1a1a] px-3 py-2 text-sm shadow-sm transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/40";
  const labelCls = "text-xs font-medium text-zinc-600 dark:text-slate-400";

  return (
    <section className="max-w-xl space-y-5">
      <div className="relative overflow-hidden rounded-2xl border border-primary-100 dark:border-primary-500/10 bg-gradient-to-br from-primary-50 via-white to-primary-100 dark:from-primary-950/30 dark:via-[#242220] dark:to-primary-900/20 p-5">
        <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-primary-200/30 blur-2xl dark:bg-primary-500/10" />
        <div className="relative">
          <h2 className="text-xl font-bold tracking-tight text-primary-600 dark:text-primary-400">{t("loans.add")}</h2>
          {error && <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>}
        </div>
      </div>

      {/* Loan type selector */}
      {!loanType && (
        <div className="grid grid-cols-2 gap-4">
          <button type="button" onClick={() => setLoanType("normal")}
            className="flex flex-col items-center gap-3 rounded-2xl border-2 border-zinc-200 dark:border-white/[0.09] bg-white dark:bg-[#161616] p-6 transition-all hover:border-primary-400 hover:shadow-md">
            <Landmark className="h-8 w-8 text-primary-500" />
            <span className="text-sm font-semibold">Khoản vay thông thường</span>
            <span className="text-xs text-zinc-400">SXKD, tiêu dùng, trung dài hạn...</span>
          </button>
          <button type="button" onClick={() => setLoanType("the_loc_viet")}
            className="flex flex-col items-center gap-3 rounded-2xl border-2 border-zinc-200 dark:border-white/[0.09] bg-white dark:bg-[#161616] p-6 transition-all hover:border-amber-400 hover:shadow-md">
            <CreditCard className="h-8 w-8 text-amber-500" />
            <span className="text-sm font-semibold">Thẻ tín dụng Lộc Việt</span>
            <span className="text-xs text-zinc-400">Phát hành thẻ tín dụng</span>
          </button>
        </div>
      )}

      {loanType && (
      <form onSubmit={handleSubmit} className="rounded-2xl border border-zinc-200 dark:border-white/[0.07] bg-white dark:bg-[#161616] p-6 shadow-sm space-y-4">
        {/* Type indicator */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-zinc-500">
            {isCard ? <CreditCard className="h-4 w-4 text-amber-500" /> : <Landmark className="h-4 w-4 text-primary-500" />}
            <span className="font-medium">{isCard ? "Thẻ tín dụng Lộc Việt" : "Khoản vay thông thường"}</span>
          </div>
          <button type="button" onClick={() => setLoanType(null)} className="text-xs text-primary-500 hover:underline">Đổi loại</button>
        </div>

        <label className="block">
          <span className={labelCls}>{t("loans.customer")}</span>
          <select required value={customerId} onChange={(e) => setCustomerId(e.target.value)} className={inputCls}>
            <option value="">{t("loans.selectCustomer")}</option>
            {customers.map((c) => <option key={c.id} value={c.id}>{c.customer_name}</option>)}
          </select>
        </label>
        <label className="block">
          <span className={labelCls}>{isCard ? "Mã hồ sơ thẻ" : t("loans.contractNumber")}</span>
          <input type="text" required value={contractNumber} onChange={(e) => setContractNumber(e.target.value)} placeholder={isCard ? "VD: LV-2026-001" : ""} className={inputCls} />
        </label>
        <div className="grid grid-cols-2 gap-4">
          <label className="block">
            <span className={labelCls}>{isCard ? "Hạn mức thẻ tín dụng" : t("loans.loanAmount")}</span>
            <input
              type="text"
              required
              inputMode="numeric"
              value={loanAmount}
              onChange={(e) => setLoanAmount(fmtNumber(e.target.value))}
              placeholder="0"
              className={inputCls}
            />
          </label>
          <label className="block">
            <span className={labelCls}>{t("loans.interestRate")}</span>
            <input type="number" min="0" step="any" value={interestRate} onChange={(e) => setInterestRate(e.target.value)} className={inputCls} />
          </label>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <label className="block">
            <span className={labelCls}>{isCard ? "Ngày phát hành" : t("loans.startDate")}</span>
            <input
              type="text"
              required
              value={startDate}
              onChange={(e) => setStartDate(formatDateInput(e.target.value))}
              placeholder="dd/mm/yyyy"
              maxLength={10}
              className={inputCls}
            />
          </label>
          <label className="block">
            <span className={labelCls}>{isCard ? "Ngày hết hạn" : t("loans.endDate")}</span>
            <input
              type="text"
              required
              value={endDate}
              onChange={(e) => setEndDate(formatDateInput(e.target.value))}
              placeholder="dd/mm/yyyy"
              maxLength={10}
              className={inputCls}
            />
          </label>
        </div>
        {!isCard && (
          <label className="block">
            <span className={labelCls}>{t("loans.disbursementCount")}</span>
            <input
              type="text"
              value={disbursementCount}
              onChange={(e) => setDisbursementCount(e.target.value)}
              className={inputCls}
            />
          </label>
        )}
        {!isCard && (
          <label className="block">
            <span className={labelCls}>{t("loans.purpose")}</span>
            <textarea value={purpose} onChange={(e) => setPurpose(e.target.value)} rows={2} className={inputCls} />
          </label>
        )}
        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={() => router.back()} className="cursor-pointer rounded-lg border border-zinc-200 dark:border-white/[0.09] px-4 py-2 text-sm text-zinc-600 dark:text-slate-400 shadow-sm transition-all duration-150 hover:border-primary-200 dark:hover:border-primary-500/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/40">
            {t("common.cancel")}
          </button>
          <button type="submit" disabled={saving} className="cursor-pointer rounded-lg bg-primary-500 px-5 py-2 text-sm font-medium text-white shadow-sm shadow-primary-500/25 transition-all duration-200 hover:shadow-md hover:shadow-primary-500/30 hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/50">
            {saving ? t("loans.loading") : t("common.save")}
          </button>
        </div>
      </form>
      )}
    </section>
  );
}
