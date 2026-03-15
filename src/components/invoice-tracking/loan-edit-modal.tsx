"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { useLanguage } from "@/components/language-provider";
import {
  fmtNumber,
  parseNumber,
  formatDateInput,
  dmy2iso,
  isoToDisplay,
  TRACKING_STATUSES,
} from "@/lib/invoice-tracking-format-helpers";
import {
  LoanConditionsTab,
  LoanCapitalTab,
  LoanEfficiencyTab,
  loanToExtFields,
  extFieldsToPayload,
} from "./loan-edit-subtabs";

type Loan = {
  id: string;
  contractNumber: string;
  loanAmount: number;
  interestRate: number | null;
  startDate: string;
  endDate: string;
  purpose: string | null;
  collateralValue: number | null;
  securedObligation: number | null;
  disbursementLimitByAsset: number | null;
  status: string;
  [key: string]: unknown;
};

type Props = {
  loan: Loan;
  customerId?: string;
  onClose: () => void;
  onUpdated: () => void;
};

const inputCls =
  "mt-1 w-full rounded-md border border-zinc-300 dark:border-white/[0.09] bg-white dark:bg-[#1a1a1a] px-3 py-2 text-sm transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/40 focus-visible:border-violet-400";
const labelCls = "text-xs font-medium text-zinc-600 dark:text-slate-400";

export function LoanEditModal({ loan, customerId, onClose, onUpdated }: Props) {
  const { t } = useLanguage();

  const [contractNumber, setContractNumber] = useState(loan.contractNumber);
  const [loanAmount, setLoanAmount] = useState(fmtNumber(String(loan.loanAmount)));
  const [interestRate, setInterestRate] = useState(loan.interestRate != null ? String(loan.interestRate) : "");
  const [startDate, setStartDate] = useState(isoToDisplay(loan.startDate));
  const [endDate, setEndDate] = useState(isoToDisplay(loan.endDate));
  const [purpose, setPurpose] = useState(loan.purpose ?? "");
  const [collateralValue, setCollateralValue] = useState(loan.collateralValue != null ? fmtNumber(String(loan.collateralValue)) : "");
  const [securedObligation, setSecuredObligation] = useState(loan.securedObligation != null ? fmtNumber(String(loan.securedObligation)) : "");
  const [disbursementLimitByAsset, setDisbursementLimitByAsset] = useState(loan.disbursementLimitByAsset != null ? fmtNumber(String(loan.disbursementLimitByAsset)) : "");
  const [status, setStatus] = useState(loan.status);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [activeSubtab, setActiveSubtab] = useState(0);
  const [extFields, setExtFields] = useState(() => loanToExtFields(loan));

  // Modal only closes via X button - no Escape or backdrop click

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
      const res = await fetch(`/api/loans/${loan.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contractNumber: contractNumber.trim(),
          loanAmount: Number(parseNumber(loanAmount)),
          interestRate: interestRate ? Number(interestRate) : null,
          startDate: isoStart,
          endDate: isoEnd,
          purpose: purpose || null,
          collateralValue: collateralValue ? Number(parseNumber(collateralValue)) : null,
          securedObligation: securedObligation ? Number(parseNumber(securedObligation)) : null,
          disbursementLimitByAsset: disbursementLimitByAsset ? Number(parseNumber(disbursementLimitByAsset)) : null,
          status,
          ...extFieldsToPayload(extFields),
        }),
      });
      const data = await res.json();
      if (!data.ok) {
        setError(data.error ?? "Failed to update loan.");
        return;
      }
      onUpdated();
      onClose();
    } catch {
      setError("Network error.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-2xl rounded-2xl bg-white dark:bg-[#141414]/90 shadow-xl">
        <div className="flex items-center justify-between border-b border-zinc-200 dark:border-white/[0.07] px-6 py-4">
          <h3 className="text-lg font-semibold">{t("common.edit")} - {loan.contractNumber}</h3>
          <button onClick={onClose} className="cursor-pointer rounded-lg p-1.5 text-zinc-400 transition-colors duration-150 hover:bg-zinc-100 dark:hover:bg-white/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/40">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Subtab navigation */}
        <div className="flex border-b border-zinc-200 dark:border-white/[0.07] px-6">
          {["Thông tin cơ bản", "Điều kiện cho vay", "Nguồn vốn & VĐƯ", "Hiệu quả & XH"].map((label, i) => (
            <button key={i} type="button" onClick={() => setActiveSubtab(i)}
              className={`cursor-pointer px-3 py-2.5 text-xs font-medium transition-colors duration-150 border-b-2 -mb-px ${activeSubtab === i ? "border-violet-500 text-violet-600 dark:text-violet-400" : "border-transparent text-zinc-500 dark:text-slate-400 hover:text-zinc-700 dark:hover:text-slate-300"}`}>
              {label}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="space-y-3 px-6 py-4 max-h-[60vh] overflow-y-auto">
          {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

          {/* Subtab 0: Thông tin cơ bản */}
          {activeSubtab === 0 && (<>
            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className={labelCls}>{t("loans.contractNumber")}</span>
                <input type="text" required value={contractNumber} onChange={(e) => setContractNumber(e.target.value)} className={inputCls} />
              </label>
              <label className="block">
                <span className={labelCls}>{t("loans.interestRate")}</span>
                <input type="number" step="0.01" value={interestRate} onChange={(e) => setInterestRate(e.target.value)} placeholder="0" className={inputCls} />
              </label>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className={labelCls}>{t("loans.loanAmount")}</span>
                <input type="text" required inputMode="numeric" value={loanAmount} onChange={(e) => setLoanAmount(fmtNumber(e.target.value))} className={inputCls} />
              </label>
              <label className="block">
                <span className={labelCls}>{t("loans.disbursementLimitByAsset")}</span>
                <input type="text" inputMode="numeric" value={disbursementLimitByAsset} onChange={(e) => setDisbursementLimitByAsset(fmtNumber(e.target.value))} placeholder="0" className={inputCls} />
              </label>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className={labelCls}>{t("loans.collateralValue")}</span>
                <input type="text" inputMode="numeric" value={collateralValue} onChange={(e) => setCollateralValue(fmtNumber(e.target.value))} placeholder="0" className={inputCls} />
              </label>
              <label className="block">
                <span className={labelCls}>{t("loans.securedObligation")}</span>
                <input type="text" inputMode="numeric" value={securedObligation} onChange={(e) => setSecuredObligation(fmtNumber(e.target.value))} placeholder="0" className={inputCls} />
              </label>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className={labelCls}>{t("loans.startDate")}</span>
                <input type="text" required value={startDate} onChange={(e) => setStartDate(formatDateInput(e.target.value))} placeholder="dd/mm/yyyy" maxLength={10} className={inputCls} />
              </label>
              <label className="block">
                <span className={labelCls}>{t("loans.endDate")}</span>
                <input type="text" required value={endDate} onChange={(e) => setEndDate(formatDateInput(e.target.value))} placeholder="dd/mm/yyyy" maxLength={10} className={inputCls} />
              </label>
            </div>
            <label className="block">
              <span className={labelCls}>{t("loans.status")}</span>
              <select value={status} onChange={(e) => setStatus(e.target.value)} className={`${inputCls} cursor-pointer`}>
                {TRACKING_STATUSES.map((s) => (
                  <option key={s} value={s}>{t(`loans.status.${s}`) ?? s}</option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className={labelCls}>{t("loans.purpose")}</span>
              <textarea value={purpose} onChange={(e) => setPurpose(e.target.value)} rows={2} className={inputCls} />
            </label>
          </>)}

          {/* Subtab 1: Điều kiện cho vay */}
          {activeSubtab === 1 && <LoanConditionsTab fields={extFields} setFields={setExtFields} />}

          {/* Subtab 2: Nguồn vốn & Vốn đối ứng */}
          {activeSubtab === 2 && <LoanCapitalTab fields={extFields} setFields={setExtFields} customerId={customerId} />}

          {/* Subtab 3: Hiệu quả & Xếp hạng */}
          {activeSubtab === 3 && <LoanEfficiencyTab fields={extFields} setFields={setExtFields} customerId={customerId} />}

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="cursor-pointer rounded-lg px-4 py-2 text-sm text-zinc-500 dark:text-slate-400 transition-colors duration-150 hover:bg-zinc-100 dark:hover:bg-white/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/40">
              {t("common.cancel")}
            </button>
            <button type="submit" disabled={saving} className="cursor-pointer rounded-lg bg-gradient-to-r from-violet-600 to-fuchsia-600 px-4 py-2 text-sm font-medium text-white transition-all duration-150 hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/40">
              {saving ? t("loans.loading") : t("common.save")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
