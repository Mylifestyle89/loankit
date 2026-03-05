"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, ChevronUp, Plus, Trash2, X } from "lucide-react";
import { useLanguage } from "@/components/language-provider";
import { fmtNumber, parseNumber, formatDateInput, dmy2iso, fmtDisplay } from "@/lib/invoice-tracking-format-helpers";
import { numberToVietnameseWords } from "@/lib/number-to-vietnamese-words";

/* ── Types ── */
type Beneficiary = { id: string; name: string; accountNumber: string | null; bankName: string | null };

type InvoiceLine = {
  tempId: string;
  supplierName: string;
  invoiceNumber: string;
  issueDate: string;
  amount: string;
};

type BeneficiaryLine = {
  tempId: string;
  beneficiaryId: string | null;
  name: string;
  accountNumber: string;
  bankName: string;
  amount: string;
  invoiceStatus: "pending" | "has_invoice";
  invoices: InvoiceLine[];
};

type Props = {
  loanId: string;
  loanAmount?: number;
  editDisbursementId?: string;
  onClose: () => void;
  onCreated: () => void;
};

/* ── Styles ── */
const inputCls =
  "w-full rounded-md border border-zinc-300 dark:border-white/[0.09] bg-white dark:bg-[#1a1a1a] px-3 py-2 text-sm transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50";
const readonlyCls =
  "w-full rounded-md border border-zinc-200 dark:border-white/[0.06] bg-zinc-50 dark:bg-white/[0.03] px-3 py-2 text-sm text-zinc-600 dark:text-slate-400";
const labelCls = "text-xs font-medium text-zinc-600 dark:text-slate-400";
const sectionCls = "rounded-lg border border-coral-tree-200 dark:border-white/[0.08] p-4";

let _tempId = 0;
function tempId() { return `tmp_${++_tempId}_${Date.now()}`; }

function emptyBeneficiaryLine(): BeneficiaryLine {
  return { tempId: tempId(), beneficiaryId: null, name: "", accountNumber: "", bankName: "", amount: "", invoiceStatus: "pending", invoices: [] };
}
function emptyInvoiceLine(): InvoiceLine {
  return { tempId: tempId(), supplierName: "", invoiceNumber: "", issueDate: "", amount: "" };
}

function num(s: string): number { return Number(parseNumber(s)) || 0; }

function isoToDisplay(isoOrStr: string | null | undefined): string {
  if (!isoOrStr) return "";
  try {
    const d = new Date(isoOrStr);
    if (isNaN(d.getTime())) return "";
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    return `${dd}/${mm}/${d.getFullYear()}`;
  } catch { return ""; }
}

export function DisbursementFormModal({ loanId, loanAmount = 0, editDisbursementId, onClose, onCreated }: Props) {
  const { t } = useLanguage();
  const backdropRef = useRef<HTMLDivElement>(null);
  const isEdit = !!editDisbursementId;

  // Section 1: Disbursement info
  const [currentOutstanding, setCurrentOutstanding] = useState("");
  const [debtAmount, setDebtAmount] = useState("");
  const [purpose, setPurpose] = useState("");
  const [supportingDoc, setSupportingDoc] = useState("");
  const [disbursementDate, setDisbursementDate] = useState("");
  const [loanTerm, setLoanTerm] = useState("");
  const [principalSchedule, setPrincipalSchedule] = useState("");
  const [interestSchedule, setInterestSchedule] = useState("");

  // Section 2: Beneficiary lines
  const [beneficiaries, setBeneficiaries] = useState<BeneficiaryLine[]>([emptyBeneficiaryLine()]);

  // Saved beneficiaries for search
  const [savedBeneficiaries, setSavedBeneficiaries] = useState<Beneficiary[]>([]);

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
        setPrincipalSchedule(d.principalSchedule ?? "");
        setInterestSchedule(d.interestSchedule ?? "");

        // Populate beneficiary lines
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const lines: any[] = d.beneficiaryLines ?? [];
        if (lines.length > 0) {
          setBeneficiaries(lines.map((bl: { beneficiaryId: string | null; beneficiaryName: string; accountNumber: string | null; bankName: string | null; amount: number; invoiceStatus: string; invoices?: { invoiceNumber: string; supplierName: string; issueDate: string; amount: number }[] }) => ({
            tempId: tempId(),
            beneficiaryId: bl.beneficiaryId,
            name: bl.beneficiaryName,
            accountNumber: bl.accountNumber ?? "",
            bankName: bl.bankName ?? "",
            amount: fmtNumber(String(bl.amount)),
            invoiceStatus: (bl.invoiceStatus === "has_invoice" ? "has_invoice" : "pending") as "pending" | "has_invoice",
            invoices: (bl.invoices ?? []).map((inv: { invoiceNumber: string; supplierName: string; issueDate: string; amount: number }) => ({
              tempId: tempId(),
              invoiceNumber: inv.invoiceNumber,
              supplierName: inv.supplierName,
              issueDate: isoToDisplay(inv.issueDate),
              amount: fmtNumber(String(inv.amount)),
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

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") onClose(); }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Auto-calculations
  const outstandingNum = num(currentOutstanding);
  const debtNum = num(debtAmount);
  const remainingLimit = loanAmount - outstandingNum;
  const totalOutstanding = outstandingNum + debtNum;

  const repaymentEndDate = useMemo(() => {
    const iso = dmy2iso(disbursementDate);
    const months = parseInt(loanTerm);
    if (!iso || !months || months <= 0) return "";
    const d = new Date(iso);
    d.setMonth(d.getMonth() + months);
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    return `${dd}/${mm}/${d.getFullYear()}`;
  }, [disbursementDate, loanTerm]);

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

  function selectSavedBeneficiary(idx: number, saved: Beneficiary) {
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

    const isoRepayment = repaymentEndDate ? dmy2iso(repaymentEndDate) : undefined;

    const payload = {
      amount: debtNum,
      disbursementDate: isoDate,
      currentOutstanding: outstandingNum,
      debtAmount: debtNum,
      totalOutstanding,
      purpose: purpose || undefined,
      supportingDoc: supportingDoc || undefined,
      loanTerm: loanTerm ? parseInt(loanTerm) : undefined,
      repaymentEndDate: isoRepayment || undefined,
      principalSchedule: principalSchedule || undefined,
      interestSchedule: interestSchedule || undefined,
      beneficiaries: validBeneficiaries.map((b) => ({
        beneficiaryId: b.beneficiaryId,
        beneficiaryName: b.name.trim(),
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
    <div ref={backdropRef} onClick={(e) => { if (e.target === backdropRef.current) onClose(); }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-3xl max-h-[90vh] flex flex-col rounded-xl bg-white dark:bg-[#141414]/90 shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-coral-tree-100 dark:border-white/[0.07] px-6 py-4 shrink-0">
          <h3 className="text-lg font-semibold">{isEdit ? (t("disbursements.edit") ?? "Sửa giải ngân") : (t("disbursements.add") ?? "Thêm giải ngân")}</h3>
          <button onClick={onClose} className="cursor-pointer rounded-md p-1.5 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-white/[0.06]">
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
              <p className="mt-2 text-xs text-amber-600 dark:text-amber-400">Tổng dư nợ vượt hạn mức vay ({fmtDisplay(loanAmount)})</p>
            )}
            <div className="grid grid-cols-2 gap-3 mt-3">
              <label className="block">
                <span className={labelCls}>Mục đích</span>
                <input type="text" value={purpose} onChange={(e) => setPurpose(e.target.value)} className={inputCls} />
              </label>
              <label className="block">
                <span className={labelCls}>Tài liệu chứng minh</span>
                <input type="text" value={supportingDoc} onChange={(e) => setSupportingDoc(e.target.value)} className={inputCls} />
              </label>
            </div>
            <div className="grid grid-cols-3 gap-3 mt-3">
              <label className="block">
                <span className={labelCls}>Ngày giải ngân *</span>
                <input type="text" required value={disbursementDate} onChange={(e) => setDisbursementDate(formatDateInput(e.target.value))} placeholder="dd/mm/yyyy" maxLength={10} className={inputCls} />
              </label>
              <label className="block">
                <span className={labelCls}>Thời hạn (tháng)</span>
                <input type="number" min={0} value={loanTerm} onChange={(e) => setLoanTerm(e.target.value)} className={inputCls} />
              </label>
              <label className="block">
                <span className={labelCls}>Hạn trả cuối cùng</span>
                <input type="text" readOnly value={repaymentEndDate} className={readonlyCls} />
              </label>
            </div>
            <div className="grid grid-cols-2 gap-3 mt-3">
              <label className="block">
                <span className={labelCls}>Định kỳ trả gốc</span>
                <input type="text" value={principalSchedule} onChange={(e) => setPrincipalSchedule(e.target.value)} className={inputCls} />
              </label>
              <label className="block">
                <span className={labelCls}>Định kỳ trả lãi</span>
                <input type="text" value={interestSchedule} onChange={(e) => setInterestSchedule(e.target.value)} className={inputCls} />
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
              onUpdate={(patch) => updateBeneficiary(bIdx, patch)}
              onRemove={() => removeBeneficiary(bIdx)}
              onSelectSaved={(saved) => selectSavedBeneficiary(bIdx, saved)}
              onAddInvoice={() => addInvoice(bIdx)}
              onUpdateInvoice={(iIdx, patch) => updateInvoice(bIdx, iIdx, patch)}
              onRemoveInvoice={(iIdx) => removeInvoice(bIdx, iIdx)}
            />
          ))}

          <button type="button" onClick={addBeneficiary} className="cursor-pointer flex items-center gap-1.5 rounded-md border border-dashed border-coral-tree-300 dark:border-white/[0.12] px-3 py-2 text-sm text-zinc-600 dark:text-slate-400 hover:bg-coral-tree-50 dark:hover:bg-white/[0.04] transition-colors duration-150 w-full justify-center">
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
        <div className="flex justify-end gap-3 border-t border-coral-tree-100 dark:border-white/[0.07] px-6 py-3 shrink-0">
          <button type="button" onClick={onClose} className="cursor-pointer rounded-md px-4 py-2 text-sm text-zinc-600 dark:text-slate-400 hover:bg-zinc-100 dark:hover:bg-white/[0.06]">
            {t("common.cancel") ?? "Hủy"}
          </button>
          <button type="submit" form="disb-form" disabled={saving} className="cursor-pointer rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed">
            {saving ? "Đang lưu..." : (t("common.save") ?? "Lưu")}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ═══ Beneficiary Section Sub-component ═══ */

type BeneficiarySectionProps = {
  line: BeneficiaryLine;
  index: number;
  savedBeneficiaries: Beneficiary[];
  canRemove: boolean;
  onUpdate: (patch: Partial<BeneficiaryLine>) => void;
  onRemove: () => void;
  onSelectSaved: (b: Beneficiary) => void;
  onAddInvoice: () => void;
  onUpdateInvoice: (iIdx: number, patch: Partial<InvoiceLine>) => void;
  onRemoveInvoice: (iIdx: number) => void;
};

function BeneficiarySection({ line, index, savedBeneficiaries, canRemove, onUpdate, onRemove, onSelectSaved, onAddInvoice, onUpdateInvoice, onRemoveInvoice }: BeneficiarySectionProps) {
  const [showSearch, setShowSearch] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  const filteredSaved = savedBeneficiaries.filter((s) =>
    s.name.toLowerCase().includes(line.name.toLowerCase())
  );

  const amtNum = num(line.amount);
  const invoiceTotal = line.invoices.reduce((s, i) => s + num(i.amount), 0);

  return (
    <div className={sectionCls}>
      <div className="flex items-center justify-between mb-3">
        <button type="button" onClick={() => setCollapsed(!collapsed)} className="cursor-pointer flex items-center gap-1 text-sm font-semibold">
          {collapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
          Đơn vị thụ hưởng #{index + 1}
          {line.name && <span className="font-normal text-zinc-500 dark:text-slate-400 ml-1">— {line.name}</span>}
        </button>
        {canRemove && (
          <button type="button" onClick={onRemove} className="cursor-pointer rounded p-1 text-zinc-400 hover:text-red-500 transition-colors duration-150">
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </div>

      {!collapsed && (
        <>
          <div className="grid grid-cols-3 gap-3">
            <label className="block relative">
              <span className={labelCls}>Khách hàng thụ hưởng *</span>
              <input type="text" value={line.name} onChange={(e) => onUpdate({ name: e.target.value, beneficiaryId: null })}
                onFocus={() => setShowSearch(true)} onBlur={() => setTimeout(() => setShowSearch(false), 200)}
                placeholder="Tên đơn vị..." className={inputCls} />
              {showSearch && filteredSaved.length > 0 && (
                <div className="absolute z-10 mt-1 w-full max-h-32 overflow-auto rounded-md border border-zinc-200 dark:border-white/[0.1] bg-white dark:bg-[#1a1a1a] shadow-lg">
                  {filteredSaved.map((s) => (
                    <button key={s.id} type="button" onMouseDown={() => { onSelectSaved(s); setShowSearch(false); }}
                      className="cursor-pointer w-full text-left px-3 py-1.5 text-sm hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors">
                      <span className="font-medium">{s.name}</span>
                      {s.accountNumber && <span className="text-xs text-zinc-400 ml-2">{s.accountNumber}</span>}
                    </button>
                  ))}
                </div>
              )}
            </label>
            <label className="block">
              <span className={labelCls}>Số tài khoản</span>
              <input type="text" value={line.accountNumber} onChange={(e) => onUpdate({ accountNumber: e.target.value })} className={inputCls} />
            </label>
            <label className="block">
              <span className={labelCls}>Ngân hàng thụ hưởng</span>
              <input type="text" value={line.bankName} onChange={(e) => onUpdate({ bankName: e.target.value })} className={inputCls} />
            </label>
          </div>
          <div className="grid grid-cols-2 gap-3 mt-3">
            <label className="block">
              <span className={labelCls}>Số tiền giải ngân *</span>
              <input type="text" inputMode="numeric" value={line.amount} onChange={(e) => onUpdate({ amount: fmtNumber(e.target.value) })} placeholder="0" className={inputCls} />
            </label>
            <label className="block">
              <span className={labelCls}>Bằng chữ</span>
              <input type="text" readOnly value={amtNum > 0 ? numberToVietnameseWords(amtNum) : ""} className={readonlyCls} />
            </label>
          </div>
          <div className="grid grid-cols-2 gap-3 mt-3">
            <label className="block">
              <span className={labelCls}>Trạng thái hóa đơn</span>
              <select value={line.invoiceStatus} onChange={(e) => onUpdate({ invoiceStatus: e.target.value as "pending" | "has_invoice" })} className={`${inputCls} cursor-pointer`}>
                <option value="pending">Nợ hóa đơn</option>
                <option value="has_invoice">Có hóa đơn</option>
              </select>
            </label>
            {line.invoiceStatus === "has_invoice" && (
              <label className="block">
                <span className={labelCls}>Số tiền hóa đơn</span>
                <input type="text" readOnly value={invoiceTotal > 0 ? fmtDisplay(invoiceTotal) : "0"} className={readonlyCls} />
              </label>
            )}
          </div>

          {/* Section 3: Invoices (if has_invoice) */}
          {line.invoiceStatus === "has_invoice" && (
            <div className="mt-3 rounded border border-zinc-200 dark:border-white/[0.07] p-3">
              <h5 className="text-xs font-semibold text-zinc-500 dark:text-slate-400 mb-2">Hóa đơn</h5>
              {line.invoices.map((inv, iIdx) => (
                <div key={inv.tempId} className="grid grid-cols-[1fr_1fr_1fr_1fr_auto] gap-2 mb-2 items-end">
                  <label className="block">
                    <span className="text-[10px] text-zinc-400">Số hóa đơn</span>
                    <input type="text" value={inv.invoiceNumber} onChange={(e) => onUpdateInvoice(iIdx, { invoiceNumber: e.target.value })} className={inputCls} />
                  </label>
                  <label className="block">
                    <span className="text-[10px] text-zinc-400">Ngày hóa đơn</span>
                    <input type="text" value={inv.issueDate} onChange={(e) => onUpdateInvoice(iIdx, { issueDate: formatDateInput(e.target.value) })} placeholder="dd/mm/yyyy" maxLength={10} className={inputCls} />
                  </label>
                  <label className="block">
                    <span className="text-[10px] text-zinc-400">ĐV phát hành</span>
                    <input type="text" value={inv.supplierName} onChange={(e) => onUpdateInvoice(iIdx, { supplierName: e.target.value })} placeholder={line.name || "Nhà cung cấp"} className={inputCls} />
                  </label>
                  <label className="block">
                    <span className="text-[10px] text-zinc-400">Số tiền</span>
                    <input type="text" inputMode="numeric" value={inv.amount} onChange={(e) => onUpdateInvoice(iIdx, { amount: fmtNumber(e.target.value) })} placeholder="0" className={inputCls} />
                  </label>
                  <button type="button" onClick={() => onRemoveInvoice(iIdx)} className="cursor-pointer rounded p-1.5 text-zinc-400 hover:text-red-500 transition-colors duration-150 mb-0.5">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
              <button type="button" onClick={onAddInvoice} className="cursor-pointer flex items-center gap-1 text-xs text-indigo-500 hover:text-indigo-600 transition-colors duration-150 mt-1">
                <Plus className="h-3.5 w-3.5" /> Thêm hóa đơn
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
