"use client";

import { useEffect, useState } from "react";
import { ChevronDown, Plus, X } from "lucide-react";
import { useLanguage } from "@/components/language-provider";
import { fmtNumber, formatDateInput, dmy2iso, fmtDisplay, isoToDisplay } from "@/lib/invoice-tracking-format-helpers";
import { numberToVietnameseWords } from "@/lib/number-to-vietnamese-words";
import { BeneficiarySection, type BeneficiaryLine, type InvoiceLine, type SavedBeneficiary } from "./beneficiary-section-form";
import { inputCls, readonlyCls, labelCls, sectionCls } from "./form-styles";
import {
  tempId, emptyBeneficiaryLine, emptyInvoiceLine, num,
  calcEndDateFromTerm, calcTermFromEndDate,
} from "./disbursement-form-helpers";
import { SuggestInput } from "@/components/suggest-input";
import type { DisbursementFieldSuggestions } from "@/services/disbursement.service";

type Props = {
  loanId: string;
  loanAmount?: number;
  editDisbursementId?: string;
  onClose: () => void;
  onCreated: () => void;
};

export function DisbursementFormModal({ loanId, loanAmount = 0, editDisbursementId, onClose, onCreated }: Props) {
  const { t } = useLanguage();
  const isEdit = !!editDisbursementId;

  // Section 1: Disbursement info
  const [currentOutstanding, setCurrentOutstanding] = useState("");
  const [debtAmount, setDebtAmount] = useState("");
  const [purpose, setPurpose] = useState("");
  const [supportingDoc, setSupportingDoc] = useState("");
  const [disbursementDate, setDisbursementDate] = useState("");
  const [loanTerm, setLoanTerm] = useState("");
  const [termUnit, setTermUnit] = useState<"tháng" | "ngày">("tháng");
  const [repaymentEndDateInput, setRepaymentEndDateInput] = useState("");
  const [principalSchedule, setPrincipalSchedule] = useState("");
  const [interestSchedule, setInterestSchedule] = useState("");

  // Section 2: Beneficiary lines
  const [beneficiaries, setBeneficiaries] = useState<BeneficiaryLine[]>([emptyBeneficiaryLine()]);

  // Saved beneficiaries for search
  const [savedBeneficiaries, setSavedBeneficiaries] = useState<SavedBeneficiary[]>([]);

  // Field suggestions from customer's disbursement history
  const [fieldSuggestions, setFieldSuggestions] = useState<DisbursementFieldSuggestions>(
    { principalSchedule: [], interestSchedule: [], purpose: [] }
  );

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [loadingOutstanding, setLoadingOutstanding] = useState(true);
  const [loadingEdit, setLoadingEdit] = useState(isEdit);

  // Fetch existing disbursement data for edit mode
  useEffect(() => {
    if (!editDisbursementId) return;
    (async () => {
      try {
        const res = await fetch(`/api/loans/${loanId}/disbursements/${editDisbursementId}`);
        const data = await res.json();
        if (!data.ok || !data.disbursement) return;
        const d = data.disbursement;
        setCurrentOutstanding(d.currentOutstanding != null ? fmtNumber(String(d.currentOutstanding)) : "0");
        setDebtAmount(d.debtAmount != null ? fmtNumber(String(d.debtAmount)) : fmtNumber(String(d.amount)));
        setPurpose(d.purpose ?? "");
        setSupportingDoc(d.supportingDoc ?? "");
        setDisbursementDate(isoToDisplay(d.disbursementDate));
        setLoanTerm(d.loanTerm != null ? String(d.loanTerm) : "");
        setTermUnit(d.termUnit === "ngày" ? "ngày" : "tháng");
        if (d.repaymentEndDate) setRepaymentEndDateInput(isoToDisplay(d.repaymentEndDate));
        setPrincipalSchedule(d.principalSchedule ?? "");
        setInterestSchedule(d.interestSchedule ?? "");

        // Populate beneficiary lines
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const lines: any[] = d.beneficiaryLines ?? [];
        if (lines.length > 0) {
          setBeneficiaries(lines.map((bl: { beneficiaryId: string | null; beneficiaryName: string; address?: string | null; accountNumber: string | null; bankName: string | null; amount: number; invoiceStatus: string; invoices?: { invoiceNumber: string; supplierName: string; issueDate: string; amount: number }[] }) => ({
            tempId: tempId(),
            beneficiaryId: bl.beneficiaryId,
            name: bl.beneficiaryName,
            address: bl.address ?? "",
            accountNumber: bl.accountNumber ?? "",
            bankName: bl.bankName ?? "",
            amount: fmtNumber(String(bl.amount)),
            invoiceStatus: (bl.invoiceStatus === "has_invoice" ? "has_invoice" : bl.invoiceStatus === "bang_ke" ? "bang_ke" : "pending") as "pending" | "has_invoice" | "bang_ke",
            invoices: (bl.invoices ?? []).map((inv: { invoiceNumber: string; supplierName: string; issueDate: string; amount: number; qty?: number; unitPrice?: number }) => ({
              tempId: tempId(),
              invoiceNumber: inv.invoiceNumber,
              supplierName: inv.supplierName,
              issueDate: isoToDisplay(inv.issueDate),
              amount: fmtNumber(String(inv.amount)),
              qty: inv.qty != null ? fmtNumber(String(inv.qty)) : "",
              unitPrice: inv.unitPrice != null ? fmtNumber(String(inv.unitPrice)) : "",
            })),
          })));
        }
      } catch { /* ignore */ }
      setLoadingEdit(false);
      setLoadingOutstanding(false);
    })();
  }, [editDisbursementId, loanId]);

  // Fetch current outstanding (only for new mode)
  useEffect(() => {
    if (editDisbursementId) return;
    (async () => {
      try {
        const res = await fetch(`/api/loans/${loanId}/disbursements?pageSize=1`);
        const data = await res.json();
        const fetched = data.summary?.totalDisbursed ?? 0;
        setCurrentOutstanding(fetched > 0 ? fmtNumber(String(fetched)) : "0");
      } catch { /* ignore */ }
      setLoadingOutstanding(false);
    })();
  }, [loanId, editDisbursementId]);

  // Fetch saved beneficiaries
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/loans/${loanId}/beneficiaries`);
        const data = await res.json();
        if (data.ok) setSavedBeneficiaries(data.beneficiaries ?? []);
      } catch { /* ignore */ }
    })();
  }, [loanId]);

  // Fetch field suggestions from customer's disbursement history (non-critical, silent fail)
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/loans/${loanId}/disbursement-suggestions`);
        const data = await res.json();
        if (data.ok) setFieldSuggestions(data.suggestions);
      } catch { /* ignore — suggestions are UX enhancement only */ }
    })();
  }, [loanId]);

  // Auto-calculations
  const outstandingNum = num(currentOutstanding);
  const debtNum = num(debtAmount);
  const remainingLimit = loanAmount - outstandingNum;
  const totalOutstanding = outstandingNum + debtNum;

  // When user changes term → recalc end date
  function handleTermChange(newTerm: string) {
    setLoanTerm(newTerm);
    const end = calcEndDateFromTerm(disbursementDate, newTerm, termUnit);
    if (end) setRepaymentEndDateInput(end);
  }

  // When user changes term unit → recalc end date from current term
  function handleTermUnitChange(newUnit: "tháng" | "ngày") {
    setTermUnit(newUnit);
    const end = calcEndDateFromTerm(disbursementDate, loanTerm, newUnit);
    if (end) setRepaymentEndDateInput(end);
  }

  // When user changes end date → recalc term
  function handleEndDateChange(newEnd: string) {
    const formatted = formatDateInput(newEnd);
    setRepaymentEndDateInput(formatted);
    if (formatted.length === 10) {
      const term = calcTermFromEndDate(disbursementDate, formatted, termUnit);
      if (term) setLoanTerm(term);
    }
  }

  // When disbursement date changes, recalc end date from current term
  function handleDisbursementDateChange(newDate: string) {
    const formatted = formatDateInput(newDate);
    setDisbursementDate(formatted);
    if (formatted.length === 10 && loanTerm) {
      const end = calcEndDateFromTerm(formatted, loanTerm, termUnit);
      if (end) setRepaymentEndDateInput(end);
    }
  }

  const beneficiarySum = beneficiaries.reduce((s, b) => s + num(b.amount), 0);
  const sumMismatch = debtNum > 0 && beneficiaries.some((b) => b.name.trim()) && Math.abs(beneficiarySum - debtNum) > 0.01;

  // -- Handlers --
  function updateBeneficiary(idx: number, patch: Partial<BeneficiaryLine>) {
    setBeneficiaries((prev) => prev.map((b, i) => i === idx ? { ...b, ...patch } : b));
  }
  function removeBeneficiary(idx: number) {
    setBeneficiaries((prev) => prev.length <= 1 ? prev : prev.filter((_, i) => i !== idx));
  }
  function addBeneficiary() {
    setBeneficiaries((prev) => [...prev, emptyBeneficiaryLine()]);
  }

  function updateInvoice(bIdx: number, iIdx: number, patch: Partial<InvoiceLine>) {
    setBeneficiaries((prev) => prev.map((b, bi) => bi !== bIdx ? b : {
      ...b,
      invoices: b.invoices.map((inv, ii) => ii === iIdx ? { ...inv, ...patch } : inv),
    }));
  }
  function removeInvoice(bIdx: number, iIdx: number) {
    setBeneficiaries((prev) => prev.map((b, bi) => bi !== bIdx ? b : {
      ...b, invoices: b.invoices.filter((_, ii) => ii !== iIdx),
    }));
  }
  function addInvoice(bIdx: number) {
    setBeneficiaries((prev) => prev.map((b, bi) => bi !== bIdx ? b : {
      ...b, invoices: [...b.invoices, emptyInvoiceLine()],
    }));
  }

  function selectSavedBeneficiary(idx: number, saved: SavedBeneficiary) {
    updateBeneficiary(idx, {
      beneficiaryId: saved.id,
      name: saved.name,
      accountNumber: saved.accountNumber ?? "",
      bankName: saved.bankName ?? "",
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const isoDate = dmy2iso(disbursementDate);
    if (!isoDate) { setError("Ngày giải ngân không hợp lệ (dd/mm/yyyy)"); return; }
    if (debtNum <= 0) { setError("Số tiền nhận nợ phải > 0"); return; }

    const validBeneficiaries = beneficiaries.filter((b) => b.name.trim());
    if (validBeneficiaries.length > 0 && Math.abs(beneficiarySum - debtNum) > 0.01) {
      setError(`Tổng tiền thụ hưởng (${fmtDisplay(beneficiarySum)}) phải bằng số tiền nhận nợ (${fmtDisplay(debtNum)})`);
      return;
    }

    const isoRepayment = repaymentEndDateInput ? dmy2iso(repaymentEndDateInput) : undefined;

    const payload = {
      amount: debtNum,
      disbursementDate: isoDate,
      currentOutstanding: outstandingNum,
      debtAmount: debtNum,
      totalOutstanding,
      purpose: purpose || undefined,
      supportingDoc: supportingDoc || undefined,
      loanTerm: loanTerm ? parseInt(loanTerm) : undefined,
      termUnit,
      repaymentEndDate: isoRepayment || undefined,
      principalSchedule: principalSchedule || undefined,
      interestSchedule: interestSchedule || undefined,
      beneficiaries: validBeneficiaries.map((b) => ({
        beneficiaryId: b.beneficiaryId,
        beneficiaryName: b.name.trim(),
        address: b.address || undefined,
        accountNumber: b.accountNumber || undefined,
        bankName: b.bankName || undefined,
        amount: num(b.amount),
        invoiceStatus: b.invoiceStatus,
        invoices: b.invoiceStatus === "has_invoice"
          ? b.invoices.filter((i) => i.invoiceNumber.trim()).map((i) => ({
              supplierName: i.supplierName || b.name.trim(),
              invoiceNumber: i.invoiceNumber.trim(),
              issueDate: dmy2iso(i.issueDate) || isoDate,
              amount: num(i.amount),
            }))
          : b.invoiceStatus === "bang_ke"
          ? b.invoices.filter((i) => i.supplierName.trim()).map((i, idx) => ({
              supplierName: i.supplierName.trim(),
              invoiceNumber: `BK-${idx + 1}`,
              issueDate: isoDate,
              amount: num(i.amount),
              qty: num(i.qty ?? "0"),
              unitPrice: num(i.unitPrice ?? "0"),
            }))
          : undefined,
      })),
    };

    const url = isEdit
      ? `/api/loans/${loanId}/disbursements/${editDisbursementId}`
      : `/api/loans/${loanId}/disbursements`;
    const method = isEdit ? "PATCH" : "POST";

    setSaving(true);
    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!data.ok) { setError(data.error ?? (isEdit ? "Lỗi cập nhật giải ngân." : "Lỗi tạo giải ngân.")); setSaving(false); return; }
      onCreated();
      onClose();
    } catch { setError("Lỗi mạng."); }
    setSaving(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-[95vw] md:max-w-3xl max-h-[90vh] flex flex-col rounded-2xl bg-white dark:bg-[#141414]/90 shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-200 dark:border-white/[0.07] px-6 py-4 shrink-0">
          <h3 className="text-lg font-semibold">{isEdit ? (t("disbursements.edit") ?? "Sửa giải ngân") : (t("disbursements.add") ?? "Thêm giải ngân")}</h3>
          <button onClick={onClose} className="cursor-pointer rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-white/[0.06]">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable content */}
        {loadingEdit ? (
          <div className="flex-1 flex items-center justify-center py-12">
            <p className="text-sm text-zinc-500 dark:text-slate-400">Đang tải dữ liệu...</p>
          </div>
        ) : (
        <form id="disb-form" onSubmit={handleSubmit} className="flex-1 overflow-auto px-6 py-4 space-y-4">
          {error && <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-md px-3 py-2">{error}</p>}

          {/* Section 1: Thong tin khoan giai ngan */}
          <div className={sectionCls}>
            <h4 className="text-sm font-semibold mb-3">Thông tin khoản giải ngân</h4>
            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className={labelCls}>Dư nợ hiện tại</span>
                <input type="text" inputMode="numeric" value={loadingOutstanding ? "..." : currentOutstanding} onChange={(e) => setCurrentOutstanding(fmtNumber(e.target.value))} className={inputCls} />
              </label>
              <label className="block">
                <span className={labelCls}>Hạn mức còn lại</span>
                <input type="text" readOnly value={loanAmount ? fmtDisplay(remainingLimit) : "—"} className={readonlyCls} />
              </label>
            </div>
            <div className="grid grid-cols-2 gap-3 mt-3">
              <label className="block">
                <span className={labelCls}>Số tiền nhận nợ *</span>
                <input type="text" required inputMode="numeric" value={debtAmount} onChange={(e) => setDebtAmount(fmtNumber(e.target.value))} placeholder="0" className={inputCls} />
              </label>
              <label className="block">
                <span className={labelCls}>Bằng chữ</span>
                <input type="text" readOnly value={debtNum > 0 ? numberToVietnameseWords(debtNum) : ""} className={readonlyCls} />
              </label>
            </div>
            <div className="grid grid-cols-2 gap-3 mt-3">
              <label className="block">
                <span className={labelCls}>Tổng dư nợ</span>
                <input type="text" readOnly value={debtNum > 0 ? fmtDisplay(totalOutstanding) : ""} className={readonlyCls} />
              </label>
              <label className="block">
                <span className={labelCls}>Bằng chữ</span>
                <input type="text" readOnly value={totalOutstanding > 0 ? numberToVietnameseWords(totalOutstanding) : ""} className={readonlyCls} />
              </label>
            </div>
            {loanAmount > 0 && totalOutstanding > loanAmount && (
              <p className="mt-2 text-xs text-brand-500 dark:text-brand-400">Tổng dư nợ vượt hạn mức vay ({fmtDisplay(loanAmount)})</p>
            )}
            <div className="grid grid-cols-2 gap-3 mt-3">
              <label className="block">
                <span className={labelCls}>Mục đích</span>
                <SuggestInput value={purpose} onChange={setPurpose} suggestions={fieldSuggestions.purpose} className={inputCls} />
              </label>
              <label className="block">
                <span className={labelCls}>Tài liệu chứng minh</span>
                <input type="text" value={supportingDoc} onChange={(e) => setSupportingDoc(e.target.value)} className={inputCls} />
              </label>
            </div>
            <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
              <label className="block min-w-0">
                <span className={labelCls}>Ngày giải ngân *</span>
                <input type="text" required value={disbursementDate} onChange={(e) => handleDisbursementDateChange(e.target.value)} placeholder="dd/mm/yyyy" maxLength={10} className={inputCls} />
              </label>
              <div className="block min-w-0">
                <span className={labelCls}>Thời hạn</span>
                <div className="flex gap-1.5">
                  <input
                    type="number"
                    min={0}
                    value={loanTerm}
                    onChange={(e) => handleTermChange(e.target.value)}
                    placeholder="0"
                    className={`${inputCls} min-w-0 flex-1`}
                  />
                  <div className="relative shrink-0">
                    <select
                      value={termUnit}
                      onChange={(e) => handleTermUnitChange(e.target.value as "tháng" | "ngày")}
                      className={`${inputCls} w-[80px] appearance-none pr-7`}
                    >
                      <option value="tháng">tháng</option>
                      <option value="ngày">ngày</option>
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-400" />
                  </div>
                </div>
              </div>
              <label className="block min-w-0">
                <span className={labelCls}>Hạn trả cuối cùng</span>
                <input type="text" value={repaymentEndDateInput} onChange={(e) => handleEndDateChange(e.target.value)} placeholder="dd/mm/yyyy" maxLength={10} className={inputCls} />
              </label>
            </div>
            <div className="grid grid-cols-2 gap-3 mt-3">
              <label className="block">
                <span className={labelCls}>Định kỳ trả gốc</span>
                <SuggestInput value={principalSchedule} onChange={setPrincipalSchedule} suggestions={fieldSuggestions.principalSchedule} className={inputCls} />
              </label>
              <label className="block">
                <span className={labelCls}>Định kỳ trả lãi</span>
                <SuggestInput value={interestSchedule} onChange={setInterestSchedule} suggestions={fieldSuggestions.interestSchedule} className={inputCls} />
              </label>
            </div>
          </div>

          {/* Section 2: Don vi thu huong */}
          {beneficiaries.map((b, bIdx) => (
            <BeneficiarySection
              key={b.tempId}
              line={b}
              index={bIdx}
              savedBeneficiaries={savedBeneficiaries}
              canRemove={beneficiaries.length > 1}
              formatDateInput={formatDateInput}
              onUpdate={(patch) => updateBeneficiary(bIdx, patch)}
              onRemove={() => removeBeneficiary(bIdx)}
              onSelectSaved={(saved) => selectSavedBeneficiary(bIdx, saved)}
              onAddInvoice={() => addInvoice(bIdx)}
              onUpdateInvoice={(iIdx, patch) => updateInvoice(bIdx, iIdx, patch)}
              onRemoveInvoice={(iIdx) => removeInvoice(bIdx, iIdx)}
            />
          ))}

          <button type="button" onClick={addBeneficiary} className="cursor-pointer flex items-center gap-1.5 rounded-lg border border-dashed border-zinc-200 dark:border-white/[0.12] px-3 py-2 text-sm text-zinc-500 dark:text-slate-400 hover:bg-brand-50/30 dark:hover:bg-white/[0.04] transition-colors duration-150 w-full justify-center">
            <Plus className="h-4 w-4" /> Thêm đơn vị thụ hưởng
          </button>

          {sumMismatch && (
            <p className="text-sm text-red-600 dark:text-red-400">
              Tổng tiền thụ hưởng ({fmtDisplay(beneficiarySum)}) khác số tiền nhận nợ ({fmtDisplay(debtNum)})
            </p>
          )}
        </form>
        )}

        {/* Footer */}
        <div className="flex justify-end gap-3 border-t border-zinc-200 dark:border-white/[0.07] px-6 py-3 shrink-0">
          <button type="button" onClick={onClose} className="cursor-pointer rounded-lg px-4 py-2 text-sm text-zinc-500 dark:text-slate-400 hover:bg-zinc-100 dark:hover:bg-white/[0.06]">
            {t("common.cancel") ?? "Hủy"}
          </button>
          <button type="submit" form="disb-form" disabled={saving} className="cursor-pointer rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed">
            {saving ? "Đang lưu..." : (t("common.save") ?? "Lưu")}
          </button>
        </div>
      </div>
    </div>
  );
}

