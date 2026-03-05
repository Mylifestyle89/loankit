"use client";

import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { useLanguage } from "@/components/language-provider";
import { fmtNumber, parseNumber, formatDateInput, dmy2iso } from "@/lib/invoice-tracking-format-helpers";

type Props = {
  loanId: string;
  onClose: () => void;
  onCreated: () => void;
};

const inputCls =
  "mt-1 w-full rounded-md border border-zinc-300 dark:border-white/[0.09] bg-white dark:bg-[#1a1a1a] px-3 py-2 text-sm transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50 focus-visible:border-indigo-400";
const labelCls = "text-xs font-medium text-zinc-600 dark:text-slate-400";

export function DisbursementFormModal({ loanId, onClose, onCreated }: Props) {
  const { t } = useLanguage();
  const backdropRef = useRef<HTMLDivElement>(null);
  const [amount, setAmount] = useState("");
  const [disbursementDate, setDisbursementDate] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  function handleBackdropClick(e: React.MouseEvent) {
    if (e.target === backdropRef.current) onClose();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");

    const isoDate = dmy2iso(disbursementDate);
    if (!isoDate) {
      setError(t("loans.invalidDate") ?? "Ngày không hợp lệ (dd/mm/yyyy)");
      setSaving(false);
      return;
    }

    try {
      const res = await fetch(`/api/loans/${loanId}/disbursements`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: Number(parseNumber(amount)),
          disbursementDate: isoDate,
          description: description || undefined,
        }),
      });
      const data = await res.json();
      if (!data.ok) {
        setError(data.error ?? "Failed to create disbursement.");
        return;
      }
      onCreated();
      onClose();
    } catch {
      setError("Network error.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div ref={backdropRef} onClick={handleBackdropClick} className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-md rounded-xl bg-white dark:bg-[#141414]/90 shadow-xl">
        <div className="flex items-center justify-between border-b border-coral-tree-100 dark:border-white/[0.07] px-6 py-4">
          <h3 className="text-lg font-semibold">{t("disbursements.add")}</h3>
          <button onClick={onClose} className="cursor-pointer rounded-md p-1.5 text-zinc-400 transition-colors duration-150 hover:bg-zinc-100 dark:hover:bg-white/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50">
            <X className="h-5 w-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3 px-6 py-4">
          {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
          <label className="block">
            <span className={labelCls}>{t("disbursements.amount")}</span>
            <input type="text" required inputMode="numeric" value={amount} onChange={(e) => setAmount(fmtNumber(e.target.value))} placeholder="0" className={inputCls} />
          </label>
          <label className="block">
            <span className={labelCls}>{t("disbursements.date")}</span>
            <input type="text" required value={disbursementDate} onChange={(e) => setDisbursementDate(formatDateInput(e.target.value))} placeholder="dd/mm/yyyy" maxLength={10} className={inputCls} />
          </label>
          <label className="block">
            <span className={labelCls}>{t("disbursements.description")}</span>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} className={inputCls} />
          </label>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="cursor-pointer rounded-md px-4 py-2 text-sm text-zinc-600 dark:text-slate-400 transition-colors duration-150 hover:bg-zinc-100 dark:hover:bg-white/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50">
              {t("common.cancel")}
            </button>
            <button type="submit" disabled={saving} className="cursor-pointer rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors duration-150 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50">
              {saving ? t("loans.loading") : t("common.save")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
