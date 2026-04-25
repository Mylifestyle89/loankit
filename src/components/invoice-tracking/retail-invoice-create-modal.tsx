"use client";

/**
 * Retail invoice creation wizard (standalone — no invoiceId required).
 * Used inside DisbursementFormModal to create retail invoice data before saving.
 * Returns item list via onConfirm callback; DOCX generation happens post-save.
 */
import { useEffect, useState } from "react";
import { Loader2, ShoppingCart, Building2, HeartPulse, Wheat, ChevronRight, ChevronLeft, AlertTriangle, Check } from "lucide-react";
import { BaseModal } from "@/components/ui/base-modal";
import { fmtDisplay, fmtNumber } from "@/lib/invoice-tracking-format-helpers";
import type { RetailTemplateKey } from "@/services/retail-invoice-report.service";

// ─── Types ──────────────────────────────────────────────────────────────────

type CostItem = { name: string; unit: string; qty: number; unitPrice: number; amount: number };
type LineRow = { name: string; unit: string; qty: number; unitPrice: number; subtotal: number; paQty?: number; paUnitPrice?: number };

export type RetailInvoiceConfirmResult = {
  templateType: RetailTemplateKey;
  items: CostItem[];
  total: number;
};

// ─── Config ──────────────────────────────────────────────────────────────────

const TEMPLATE_OPTIONS: { key: RetailTemplateKey; label: string; icon: typeof ShoppingCart }[] = [
  { key: "tap_hoa",  label: "Tạp hóa / Đồ uống",       icon: ShoppingCart },
  { key: "vlxd",    label: "Vật liệu xây dựng",         icon: Building2 },
  { key: "y_te",    label: "Thiết bị y tế",              icon: HeartPulse },
  { key: "nong_san",label: "Nông sản / Phiếu bán hàng", icon: Wheat },
];

const inputCls = "w-full rounded-lg border border-zinc-200 dark:border-white/[0.09] bg-white dark:bg-[#1a1a1a] px-3 py-1.5 text-sm text-zinc-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-brand-500/40";

// ─── Props ───────────────────────────────────────────────────────────────────

interface Props {
  loanPlanId?: string | null;
  onConfirm: (result: RetailInvoiceConfirmResult) => void;
  onClose: () => void;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function RetailInvoiceCreateModal({ loanPlanId, onConfirm, onClose }: Props) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [templateType, setTemplateType] = useState<RetailTemplateKey>("tap_hoa");
  const [paItems, setPaItems] = useState<CostItem[]>([]);
  const [selectedNames, setSelectedNames] = useState<Set<string>>(new Set());
  const [rows, setRows] = useState<LineRow[]>([]);
  const [loadingPa, setLoadingPa] = useState(false);

  useEffect(() => {
    if (step !== 2 || !loanPlanId) return;
    setLoadingPa(true);
    fetch(`/api/loan-plans/${loanPlanId}/cost-items`)
      .then(r => r.json())
      .then(d => { if (d.ok) setPaItems(d.costItems ?? []); })
      .catch(() => {})
      .finally(() => setLoadingPa(false));
  }, [step, loanPlanId]);

  function toggleItem(item: CostItem) {
    setSelectedNames(prev => {
      const next = new Set(prev);
      if (next.has(item.name)) next.delete(item.name);
      else next.add(item.name);
      return next;
    });
  }

  function goToStep3() {
    const selected = paItems.filter(i => selectedNames.has(i.name));
    setRows(selected.length > 0
      ? selected.map(i => ({ name: i.name, unit: i.unit, qty: i.qty, unitPrice: i.unitPrice, subtotal: i.qty * i.unitPrice, paQty: i.qty, paUnitPrice: i.unitPrice }))
      : [{ name: "", unit: "", qty: 1, unitPrice: 0, subtotal: 0 }]);
    setStep(3);
  }

  function updateRow(idx: number, field: "qty" | "unitPrice", value: number) {
    setRows(prev => prev.map((r, i) => {
      if (i !== idx) return r;
      const qty = field === "qty" ? value : r.qty;
      const unitPrice = field === "unitPrice" ? value : r.unitPrice;
      return { ...r, qty, unitPrice, subtotal: qty * unitPrice };
    }));
  }

  function updateRowText(idx: number, field: "name" | "unit", value: string) {
    setRows(prev => prev.map((r, i) => i === idx ? { ...r, [field]: value } : r));
  }

  const total = rows.reduce((s, r) => s + r.subtotal, 0);

  function handleConfirm() {
    const items: CostItem[] = rows
      .filter(r => r.name.trim())
      .map(r => ({ name: r.name, unit: r.unit, qty: r.qty, unitPrice: r.unitPrice, amount: r.subtotal }));
    onConfirm({ templateType, items, total: items.reduce((s, i) => s + i.amount, 0) });
  }

  return (
    <BaseModal open onClose={onClose} title="Chứng từ mua hàng" maxWidthClassName="max-w-2xl">
      {/* Steps */}
      <div className="flex items-center gap-2 mb-5 text-xs text-zinc-400 dark:text-slate-500">
        {["Loại HĐ", "Chọn hàng", "Bảng chi tiết"].map((label, i) => (
          <div key={label} className="flex items-center gap-2">
            <span className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-semibold ${step === i + 1 ? "bg-brand-500 text-white" : step > i + 1 ? "bg-emerald-500 text-white" : "bg-zinc-200 dark:bg-white/10 text-zinc-500"}`}>
              {step > i + 1 ? <Check className="h-3 w-3" /> : i + 1}
            </span>
            <span className={step === i + 1 ? "text-brand-500 font-medium" : ""}>{label}</span>
            {i < 2 && <ChevronRight className="h-3 w-3" />}
          </div>
        ))}
      </div>

      {/* Step 1 */}
      {step === 1 && (
        <div>
          <div className="grid grid-cols-2 gap-3">
            {TEMPLATE_OPTIONS.map(({ key, label, icon: Icon }) => (
              <button key={key} type="button" onClick={() => setTemplateType(key)}
                className={`flex items-center gap-3 rounded-xl border p-3.5 text-left transition-all ${templateType === key ? "border-brand-400 bg-brand-50 dark:bg-brand-500/10 dark:border-brand-500/50" : "border-zinc-200 dark:border-white/[0.08] hover:border-brand-200 dark:hover:border-brand-500/20"}`}>
                <Icon className={`h-4 w-4 shrink-0 ${templateType === key ? "text-brand-500" : "text-zinc-400"}`} />
                <span className={`text-sm font-medium ${templateType === key ? "text-brand-600 dark:text-brand-400" : "text-zinc-700 dark:text-slate-300"}`}>{label}</span>
              </button>
            ))}
          </div>
          <div className="mt-5 flex justify-end">
            <button type="button" onClick={() => setStep(2)}
              className="cursor-pointer inline-flex items-center gap-1.5 rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600">
              Tiếp theo <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Step 2 */}
      {step === 2 && (
        <div>
          {!loanPlanId ? (
            <p className="mb-4 text-sm text-zinc-500 dark:text-slate-400 bg-zinc-50 dark:bg-white/[0.03] rounded-lg p-3">
              Khoản vay chưa liên kết Phương án kinh doanh. Bạn có thể nhập danh sách hàng thủ công.
            </p>
          ) : loadingPa ? (
            <div className="flex items-center gap-2 py-6 text-sm text-zinc-400"><Loader2 className="h-4 w-4 animate-spin" /> Đang tải...</div>
          ) : paItems.length === 0 ? (
            <p className="text-sm text-zinc-400">Phương án kinh doanh chưa có danh mục chi phí.</p>
          ) : (
            <>
              <p className="mb-3 text-sm text-zinc-500 dark:text-slate-400">Chọn mặt hàng từ phương án kinh doanh:</p>
              <div className="rounded-lg border border-zinc-200 dark:border-white/[0.07] overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-zinc-50 dark:bg-white/[0.03]">
                    <tr>
                      <th className="w-8 px-3 py-2"></th>
                      <th className="px-3 py-2 text-left font-medium text-zinc-500 dark:text-slate-400">Tên hàng</th>
                      <th className="px-3 py-2 text-center font-medium text-zinc-500 dark:text-slate-400">ĐVT</th>
                      <th className="px-3 py-2 text-right font-medium text-zinc-500 dark:text-slate-400">SL (PA)</th>
                      <th className="px-3 py-2 text-right font-medium text-zinc-500 dark:text-slate-400">Đơn giá (PA)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paItems.map(item => (
                      <tr key={item.name} onClick={() => toggleItem(item)}
                        className="cursor-pointer border-t border-zinc-100 dark:border-white/[0.05] hover:bg-brand-50/50 dark:hover:bg-brand-500/5">
                        <td className="px-3 py-2">
                          <input type="checkbox" readOnly checked={selectedNames.has(item.name)} className="h-4 w-4 rounded border-zinc-300 text-brand-500" />
                        </td>
                        <td className="px-3 py-2 text-zinc-700 dark:text-slate-300">{item.name}</td>
                        <td className="px-3 py-2 text-center text-zinc-500">{item.unit}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{item.qty}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{fmtDisplay(item.unitPrice)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
          <div className="mt-5 flex justify-between">
            <button type="button" onClick={() => setStep(1)}
              className="cursor-pointer inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 dark:border-white/[0.08] px-4 py-2 text-sm text-zinc-600 dark:text-slate-400 hover:bg-zinc-50">
              <ChevronLeft className="h-4 w-4" /> Quay lại
            </button>
            <button type="button" onClick={goToStep3}
              className="cursor-pointer inline-flex items-center gap-1.5 rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600">
              Tiếp theo <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Step 3 */}
      {step === 3 && (
        <div>
          <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-white/[0.07]">
            <table className="w-full text-sm">
              <thead className="bg-zinc-50 dark:bg-white/[0.03]">
                <tr>
                  <th className="px-2 py-2 text-center font-medium text-zinc-500 w-8">STT</th>
                  <th className="px-3 py-2 text-left font-medium text-zinc-500">Tên hàng hóa</th>
                  <th className="px-2 py-2 text-center font-medium text-zinc-500 w-16">ĐVT</th>
                  <th className="px-2 py-2 text-right font-medium text-zinc-500 w-20">Số lượng</th>
                  <th className="px-2 py-2 text-right font-medium text-zinc-500 w-28">Đơn giá</th>
                  <th className="px-2 py-2 text-right font-medium text-zinc-500 w-28">Thành tiền</th>
                  <th className="w-6"></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, idx) => {
                  const qtyWarn = row.paQty !== undefined && row.qty > row.paQty;
                  const priceWarn = row.paUnitPrice !== undefined && row.unitPrice > row.paUnitPrice * 1.2;
                  return (
                    <tr key={idx} className="border-t border-zinc-100 dark:border-white/[0.05]">
                      <td className="px-2 py-1.5 text-center text-zinc-400 text-xs">{idx + 1}</td>
                      <td className="px-2 py-1.5">
                        <input value={row.name} onChange={e => updateRowText(idx, "name", e.target.value)} className={inputCls} placeholder="Tên mặt hàng" />
                      </td>
                      <td className="px-2 py-1.5">
                        <input value={row.unit} onChange={e => updateRowText(idx, "unit", e.target.value)} className={inputCls} placeholder="ĐVT" />
                      </td>
                      <td className="px-2 py-1.5">
                        <div className="flex items-center gap-0.5">
                          <input type="number" min={0} value={row.qty} onChange={e => updateRow(idx, "qty", Number(e.target.value))}
                            className={`${inputCls} text-right ${qtyWarn ? "border-yellow-400" : ""}`} />
                          {qtyWarn && <span title={`Vượt SL PA (${row.paQty})`}><AlertTriangle className="h-3 w-3 text-yellow-500 shrink-0" /></span>}
                        </div>
                      </td>
                      <td className="px-2 py-1.5">
                        <div className="flex items-center gap-0.5">
                          <input type="number" min={0} value={row.unitPrice} onChange={e => updateRow(idx, "unitPrice", Number(e.target.value))}
                            className={`${inputCls} text-right ${priceWarn ? "border-yellow-400" : ""}`} />
                          {priceWarn && <span title="Vượt PA 20%"><AlertTriangle className="h-3 w-3 text-yellow-500 shrink-0" /></span>}
                        </div>
                      </td>
                      <td className="px-2 py-1.5 text-right tabular-nums text-zinc-700 dark:text-slate-300">{fmtDisplay(row.subtotal)}</td>
                      <td className="px-2 py-1.5">
                        <button type="button" onClick={() => setRows(prev => prev.filter((_, i) => i !== idx))}
                          className="cursor-pointer text-zinc-300 hover:text-red-500 transition-colors text-xs">✕</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-zinc-200 dark:border-white/[0.1] bg-zinc-50 dark:bg-white/[0.03]">
                  <td colSpan={5} className="px-3 py-2 text-right text-sm font-semibold text-zinc-700 dark:text-slate-300">Tổng cộng:</td>
                  <td className="px-2 py-2 text-right tabular-nums font-semibold text-brand-600 dark:text-brand-400">{fmtDisplay(total)}</td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
          <button type="button" onClick={() => setRows(prev => [...prev, { name: "", unit: "", qty: 1, unitPrice: 0, subtotal: 0 }])}
            className="cursor-pointer mt-2 text-xs text-brand-500 hover:text-brand-600">
            + Thêm dòng
          </button>

          <div className="mt-5 flex justify-between">
            <button type="button" onClick={() => setStep(2)}
              className="cursor-pointer inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 dark:border-white/[0.08] px-4 py-2 text-sm text-zinc-600 dark:text-slate-400 hover:bg-zinc-50">
              <ChevronLeft className="h-4 w-4" /> Quay lại
            </button>
            <button type="button" onClick={handleConfirm} disabled={rows.every(r => !r.name.trim())}
              className="cursor-pointer inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed">
              <Check className="h-4 w-4" /> Xác nhận ({fmtDisplay(total)}đ)
            </button>
          </div>
        </div>
      )}
    </BaseModal>
  );
}
