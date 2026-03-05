"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { useLanguage } from "@/components/language-provider";
import { fmtNumber, parseNumber, formatDateInput, dmy2iso } from "@/lib/invoice-tracking-format-helpers";

type Customer = { id: string; customer_name: string };

export default function NewLoanPage() {
  const { t } = useLanguage();
  const router = useRouter();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customerId, setCustomerId] = useState("");
  const [contractNumber, setContractNumber] = useState("");
  const [loanAmount, setLoanAmount] = useState("");
  const [interestRate, setInterestRate] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [purpose, setPurpose] = useState("");
  const [disbursementCount, setDisbursementCount] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/customers").then((r) => r.json()).then((d) => {
      if (d.ok) setCustomers(d.customers ?? []);
    });
  }, []);

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
          purpose: purpose || undefined,
          disbursementCount: disbursementCount || undefined,
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

  const inputCls = "mt-1 w-full rounded-md border border-zinc-300 dark:border-white/[0.09] bg-white dark:bg-[#1a1a1a] px-3 py-2 text-sm transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50 focus-visible:border-indigo-400";
  const labelCls = "text-xs font-medium text-zinc-600 dark:text-slate-400";

  return (
    <section className="max-w-xl space-y-4">
      <div className="rounded-xl border border-coral-tree-200 dark:border-white/[0.08] bg-white dark:bg-[#141414]/90 p-4">
        <h2 className="text-lg font-semibold">{t("loans.add")}</h2>
        {error && <p className="mt-2 text-sm text-red-700 dark:text-red-400">{error}</p>}
      </div>

      <form onSubmit={handleSubmit} className="rounded-xl border border-coral-tree-200 dark:border-white/[0.08] bg-white dark:bg-[#141414]/90 p-6 space-y-4">
        <label className="block">
          <span className={labelCls}>{t("loans.customer")}</span>
          <select required value={customerId} onChange={(e) => setCustomerId(e.target.value)} className={inputCls}>
            <option value="">{t("loans.selectCustomer")}</option>
            {customers.map((c) => <option key={c.id} value={c.id}>{c.customer_name}</option>)}
          </select>
        </label>
        <label className="block">
          <span className={labelCls}>{t("loans.contractNumber")}</span>
          <input type="text" required value={contractNumber} onChange={(e) => setContractNumber(e.target.value)} className={inputCls} />
        </label>
        <div className="grid grid-cols-2 gap-4">
          <label className="block">
            <span className={labelCls}>{t("loans.loanAmount")}</span>
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
            <span className={labelCls}>{t("loans.startDate")}</span>
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
            <span className={labelCls}>{t("loans.endDate")}</span>
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
        <label className="block">
          <span className={labelCls}>{t("loans.disbursementCount")}</span>
          <input
            type="text"
            value={disbursementCount}
            onChange={(e) => setDisbursementCount(e.target.value)}
            className={inputCls}
          />
        </label>
        <label className="block">
          <span className={labelCls}>{t("loans.purpose")}</span>
          <textarea value={purpose} onChange={(e) => setPurpose(e.target.value)} rows={2} className={inputCls} />
        </label>
        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={() => router.back()} className="cursor-pointer rounded-md px-4 py-2 text-sm text-zinc-600 dark:text-slate-400 transition-colors duration-150 hover:bg-zinc-100 dark:hover:bg-white/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50">
            {t("common.cancel")}
          </button>
          <button type="submit" disabled={saving} className="cursor-pointer rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors duration-150 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50">
            {saving ? t("loans.loading") : t("common.save")}
          </button>
        </div>
      </form>
    </section>
  );
}
