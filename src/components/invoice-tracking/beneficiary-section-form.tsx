"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, Plus, Trash2 } from "lucide-react";
import { fmtNumber, fmtDisplay } from "@/lib/invoice-tracking-format-helpers";
import { numberToVietnameseWords } from "@/lib/number-to-vietnamese-words";
import { inputCls, readonlyCls, labelCls, sectionCls } from "./form-styles";

/* ── Types (shared with disbursement-form-modal) ── */
export type InvoiceLine = {
  tempId: string;
  supplierName: string;
  invoiceNumber: string;
  issueDate: string;
  amount: string;
};

export type BeneficiaryLine = {
  tempId: string;
  beneficiaryId: string | null;
  name: string;
  accountNumber: string;
  bankName: string;
  amount: string;
  invoiceStatus: "pending" | "has_invoice";
  invoices: InvoiceLine[];
};

export type SavedBeneficiary = {
  id: string;
  name: string;
  accountNumber: string | null;
  bankName: string | null;
};

function num(s: string): number { return Number(s.replace(/\D/g, "")) || 0; }

/* ── Props ── */
type Props = {
  line: BeneficiaryLine;
  index: number;
  savedBeneficiaries: SavedBeneficiary[];
  canRemove: boolean;
  formatDateInput: (raw: string) => string;
  onUpdate: (patch: Partial<BeneficiaryLine>) => void;
  onRemove: () => void;
  onSelectSaved: (b: SavedBeneficiary) => void;
  onAddInvoice: () => void;
  onUpdateInvoice: (iIdx: number, patch: Partial<InvoiceLine>) => void;
  onRemoveInvoice: (iIdx: number) => void;
};

/** Collapsible beneficiary section with inline invoice editing */
export function BeneficiarySection({
  line, index, savedBeneficiaries, canRemove, formatDateInput: fmtDateInput,
  onUpdate, onRemove, onSelectSaved, onAddInvoice, onUpdateInvoice, onRemoveInvoice,
}: Props) {
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

          {/* Invoices sub-section (if has_invoice) */}
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
                    <input type="text" value={inv.issueDate} onChange={(e) => onUpdateInvoice(iIdx, { issueDate: fmtDateInput(e.target.value) })} placeholder="dd/mm/yyyy" maxLength={10} className={inputCls} />
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
