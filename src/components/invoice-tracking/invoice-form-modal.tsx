"use client";

import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { useLanguage } from "@/components/language-provider";
import { fmtNumber, parseNumber, formatDateInput, dmy2iso } from "@/lib/invoice-tracking-format-helpers";

type Props = {
  disbursementId: string;
  onClose: () => void;
  onCreated: () => void;
};

const inputCls =
  "mt-1 w-full rounded-md border border-zinc-300 dark:border-white/[0.09] bg-white dark:bg-[#1a1a1a] px-3 py-2 text-sm transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/40 focus-visible:border-violet-400";
const labelCls = "text-xs font-medium text-zinc-600 dark:text-slate-400";

export function InvoiceFormModal({ disbursementId, onClose, onCreated }: Props) {
  const { t } = useLanguage();
  const backdropRef = useRef<HTMLDivElement>(null);
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [supplierName, setSupplierName] = useState("");
  const [amount, setAmount] = useState("");
  const [issueDate, setIssueDate] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [customDeadline, setCustomDeadline] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [duplicateWarning, setDuplicateWarning] = useState("");

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
    setDuplicateWarning("");

    const isoIssue = dmy2iso(issueDate);
    const isoDue = dmy2iso(dueDate);
    if (!isoIssue || !isoDue) {
      setError(t("loans.invalidDate") ?? "Ngày không hợp lệ (dd/mm/yyyy)");
      setSaving(false);
      return;
    }
    const isoDeadline = customDeadline ? dmy2iso(customDeadline) : undefined;
    if (customDeadline && !isoDeadline) {
      setError(t("loans.invalidDate") ?? "Ngày không hợp lệ (dd/mm/yyyy)");
      setSaving(false);
      return;
    }

    try {
      const res = await fetch(`/api/disbursements/${disbursementId}/invoices`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          invoiceNumber,
          supplierName,
          amount: Number(parseNumber(amount)),
          issueDate: isoIssue,
          dueDate: isoDue,
          customDeadline: isoDeadline,
          notes: notes || undefined,
        }),
      });
      const data = await res.json();
      if (!data.ok) {
        setError(data.error ?? "Failed to create invoice.");
        return;
      }
      if (data.duplicateWarning) {
        setDuplicateWarning(data.duplicateWarning);
      }
      onCreated();
      if (!data.duplicateWarning) onClose();
    } catch {
      setError("Network error.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div ref={backdropRef} onClick={handleBackdropClick} className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white dark:bg-[#141414]/90 shadow-xl">
        <div className="flex items-center justify-between border-b border-zinc-200 dark:border-white/[0.07] px-6 py-4">
          <h3 className="text-lg font-semibold">{t("invoices.add")}</h3>
          <button onClick={onClose} className="cursor-pointer rounded-lg p-1.5 text-zinc-400 transition-colors duration-150 hover:bg-zinc-100 dark:hover:bg-white/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/40">
            <X className="h-5 w-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3 px-6 py-4">
          {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
          {duplicateWarning && (
            <div className="rounded-lg border border-yellow-300 bg-yellow-50 px-4 py-2 text-sm text-yellow-800 dark:border-yellow-500/30 dark:bg-yellow-500/10 dark:text-yellow-400">
              {duplicateWarning}
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className={labelCls}>{t("invoices.number")}</span>
              <input type="text" required value={invoiceNumber} onChange={(e) => setInvoiceNumber(e.target.value)} className={inputCls} />
            </label>
            <label className="block">
              <span className={labelCls}>{t("invoices.supplier")}</span>
              <input type="text" required value={supplierName} onChange={(e) => setSupplierName(e.target.value)} className={inputCls} />
            </label>
          </div>
          <label className="block">
            <span className={labelCls}>{t("invoices.amount")}</span>
            <input type="text" required inputMode="numeric" value={amount} onChange={(e) => setAmount(fmtNumber(e.target.value))} placeholder="0" className={inputCls} />
          </label>
          <div className="grid grid-cols-3 gap-3">
            <label className="block">
              <span className={labelCls}>{t("invoices.issueDate")}</span>
              <input type="text" required value={issueDate} onChange={(e) => setIssueDate(formatDateInput(e.target.value))} placeholder="dd/mm/yyyy" maxLength={10} className={inputCls} />
            </label>
            <label className="block">
              <span className={labelCls}>{t("invoices.dueDate")}</span>
              <input type="text" required value={dueDate} onChange={(e) => setDueDate(formatDateInput(e.target.value))} placeholder="dd/mm/yyyy" maxLength={10} className={inputCls} />
            </label>
            <label className="block">
              <span className={labelCls}>{t("invoices.customDeadline")}</span>
              <input type="text" value={customDeadline} onChange={(e) => setCustomDeadline(formatDateInput(e.target.value))} placeholder="dd/mm/yyyy" maxLength={10} className={inputCls} />
            </label>
          </div>
          <label className="block">
            <span className={labelCls}>{t("invoices.notes")}</span>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className={inputCls} />
          </label>
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
