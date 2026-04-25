"use client";

import { useEffect, useState } from "react";
import { Download, Loader2, ShoppingCart, Building2, HeartPulse, Wheat, ChevronRight, ChevronLeft, AlertTriangle } from "lucide-react";
import { BaseModal } from "@/components/ui/base-modal";
import { fmtDisplay } from "@/lib/invoice-tracking-format-helpers";
import type { RetailTemplateKey } from "@/services/retail-invoice-report.service";

// ─── Types ──────────────────────────────────────────────────────────────────

type CostItem = {
  name: string;
  unit: string;
  qty: number;
  unitPrice: number;
  amount: number;
};

type LineRow = {
  name: string;
  unit: string;
  qty: number;
  unitPrice: number;
  subtotal: number;
  paQty?: number;
  paUnitPrice?: number;
};

// ─── Template options ────────────────────────────────────────────────────────

const TEMPLATE_OPTIONS: { key: RetailTemplateKey; label: string; icon: typeof ShoppingCart }[] = [
  { key: "tap_hoa",  label: "Tạp hóa / Đồ uống",       icon: ShoppingCart },
  { key: "vlxd",    label: "Vật liệu xây dựng",         icon: Building2 },
  { key: "y_te",    label: "Thiết bị y tế",              icon: HeartPulse },
  { key: "nong_san",label: "Nông sản / Phiếu bán hàng", icon: Wheat },
];

// ─── Shared styles ───────────────────────────────────────────────────────────

const inputCls = "w-full rounded-lg border border-zinc-200 dark:border-white/[0.09] bg-white dark:bg-[#1a1a1a] px-3 py-1.5 text-sm text-zinc-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-brand-500/40";

// ─── Props ───────────────────────────────────────────────────────────────────

interface RetailInvoiceModalProps {
  invoiceId: string;
  invoiceNumber: string;
  supplierName: string;
  loanPlanId?: string | null;
  onClose: () => void;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function RetailInvoiceModal({ invoiceId, invoiceNumber, supplierName, loanPlanId, onClose }: RetailInvoiceModalProps) {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [templateType, setTemplateType] = useState<RetailTemplateKey>("tap_hoa");
  const [paItems, setPaItems] = useState<CostItem[]>([]);
  const [selectedNames, setSelectedNames] = useState<Set<string>>(new Set());
  const [rows, setRows] = useState<LineRow[]>([]);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [loadingPa, setLoadingPa] = useState(false);

  // Fetch PA cost items when reaching Step 2
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
    const newRows: LineRow[] = selected.length > 0
      ? selected.map(i => ({
          name: i.name, unit: i.unit,
          qty: i.qty, unitPrice: i.unitPrice,
          subtotal: i.qty * i.unitPrice,
          paQty: i.qty, paUnitPrice: i.unitPrice,
        }))
      : [{ name: "", unit: "", qty: 1, unitPrice: 0, subtotal: 0 }];
    setRows(newRows);
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

  function addRow() {
    setRows(prev => [...prev, { name: "", unit: "", qty: 1, unitPrice: 0, subtotal: 0 }]);
  }

  function removeRow(idx: number) {
    setRows(prev => prev.filter((_, i) => i !== idx));
  }

  function updateRowText(idx: number, field: "name" | "unit", value: string) {
    setRows(prev => prev.map((r, i) => i === idx ? { ...r, [field]: value } : r));
  }

  const total = rows.reduce((s, r) => s + r.subtotal, 0);

  async function handleGenerate() {
    setGenerating(true);
    setError("");
    try {
      // Save items first
      const items = rows.map(r => ({ name: r.name, unit: r.unit, qty: r.qty, unitPrice: r.unitPrice, amount: r.subtotal }));
      await fetch(`/api/invoices/${invoiceId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items, templateType }),
      });

      // Generate DOCX
      const res = await fetch(`/api/invoices/${invoiceId}/retail-doc`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ templateType }),
      });
      if (!res.ok) {
        const d = await res.json();
        setError(d.error ?? "Không thể tạo hóa đơn");
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `HoaDon_${invoiceNumber}_${templateType}.docx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setError("Lỗi kết nối");
    } finally {
      setGenerating(false);
    }
  }

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <BaseModal open onClose={onClose} title="Tạo chứng từ mua hàng" maxWidthClassName="max-w-3xl">

      {/* Progress steps */}
      <div className="flex items-center gap-2 mb-5 text-xs text-zinc-400 dark:text-slate-500">
        {["Loại HĐ", "Chọn hàng", "Bảng chi tiết", "Tải xuống"].map((label, i) => (
          <div key={label} className="flex items-center gap-2">
            <span className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-semibold ${step === i + 1 ? "bg-brand-500 text-white" : step > i + 1 ? "bg-emerald-500 text-white" : "bg-zinc-200 dark:bg-white/10 text-zinc-500"}`}>
              {i + 1}
            </span>
            <span className={step === i + 1 ? "text-brand-500 font-medium" : ""}>{label}</span>
            {i < 3 && <ChevronRight className="h-3 w-3" />}
          </div>
        ))}
      </div>

      {/* ── Step 1: Chọn loại hóa đơn ── */}
      {step === 1 && (
        <div>
          <p className="mb-3 text-sm text-zinc-500 dark:text-slate-400">Chọn loại chứng từ phù hợp với mục đích sử dụng vốn:</p>
          <div className="grid grid-cols-2 gap-3">
            {TEMPLATE_OPTIONS.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                type="button"
                onClick={() => setTemplateType(key)}
                className={`flex items-center gap-3 rounded-xl border p-4 text-left transition-all ${
                  templateType === key
                    ? "border-brand-400 bg-brand-50 dark:bg-brand-500/10 dark:border-brand-500/50"
                    : "border-zinc-200 dark:border-white/[0.08] hover:border-brand-200 dark:hover:border-brand-500/20"
                }`}
              >
                <Icon className={`h-5 w-5 shrink-0 ${templateType === key ? "text-brand-500" : "text-zinc-400"}`} />
                <span className={`text-sm font-medium ${templateType === key ? "text-brand-600 dark:text-brand-400" : "text-zinc-700 dark:text-slate-300"}`}>
                  {label}
                </span>
              </button>
            ))}
          </div>
          <div className="mt-5 flex justify-end">
            <button type="button" onClick={() => setStep(2)}
              className="cursor-pointer inline-flex items-center gap-1.5 rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 transition-colors">
              Tiếp theo <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* ── Step 2: Chọn items từ PA ── */}
      {step === 2 && (
        <div>
          {!loanPlanId ? (
            <p className="mb-4 text-sm text-zinc-500 dark:text-slate-400 rounded-lg bg-zinc-50 dark:bg-white/[0.03] p-3">
              Khoản vay chưa liên kết Phương án kinh doanh. Bạn có thể nhập danh sách hàng thủ công ở bước tiếp theo.
            </p>
          ) : loadingPa ? (
            <div className="flex items-center gap-2 py-6 text-sm text-zinc-400"><Loader2 className="h-4 w-4 animate-spin" /> Đang tải danh sách hàng hóa...</div>
          ) : paItems.length === 0 ? (
            <p className="text-sm text-zinc-400 dark:text-slate-500">Phương án kinh doanh chưa có danh mục chi phí.</p>
          ) : (
            <>
              <p className="mb-3 text-sm text-zinc-500 dark:text-slate-400">Chọn mặt hàng muốn đưa vào hóa đơn:</p>
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
                      <tr key={item.name}
                        onClick={() => toggleItem(item)}
                        className="cursor-pointer border-t border-zinc-100 dark:border-white/[0.05] hover:bg-brand-50/50 dark:hover:bg-brand-500/5 transition-colors">
                        <td className="px-3 py-2">
                          <input type="checkbox" readOnly checked={selectedNames.has(item.name)}
                            className="h-4 w-4 rounded border-zinc-300 text-brand-500" />
                        </td>
                        <td className="px-3 py-2 text-zinc-700 dark:text-slate-300">{item.name}</td>
                        <td className="px-3 py-2 text-center text-zinc-500 dark:text-slate-400">{item.unit}</td>
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
              className="cursor-pointer inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 dark:border-white/[0.08] px-4 py-2 text-sm text-zinc-600 dark:text-slate-400 hover:bg-zinc-50 dark:hover:bg-white/[0.04]">
              <ChevronLeft className="h-4 w-4" /> Quay lại
            </button>
            <button type="button" onClick={goToStep3}
              className="cursor-pointer inline-flex items-center gap-1.5 rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600">
              Tiếp theo <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* ── Step 3: Bảng hóa đơn ── */}
      {step === 3 && (
        <div>
          <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-white/[0.07]">
            <table className="w-full text-sm">
              <thead className="bg-zinc-50 dark:bg-white/[0.03]">
                <tr>
                  <th className="px-2 py-2 text-center font-medium text-zinc-500 dark:text-slate-400 w-8">STT</th>
                  <th className="px-3 py-2 text-left font-medium text-zinc-500 dark:text-slate-400">Tên hàng hóa</th>
                  <th className="px-2 py-2 text-center font-medium text-zinc-500 dark:text-slate-400 w-16">ĐVT</th>
                  <th className="px-2 py-2 text-right font-medium text-zinc-500 dark:text-slate-400 w-20">Số lượng</th>
                  <th className="px-2 py-2 text-right font-medium text-zinc-500 dark:text-slate-400 w-28">Đơn giá</th>
                  <th className="px-2 py-2 text-right font-medium text-zinc-500 dark:text-slate-400 w-28">Thành tiền</th>
                  <th className="w-8"></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, idx) => {
                  const qtyWarn = row.paQty !== undefined && row.qty > row.paQty;
                  const priceWarn = row.paUnitPrice !== undefined && row.unitPrice > row.paUnitPrice * 1.2;
                  return (
                    <tr key={idx} className="border-t border-zinc-100 dark:border-white/[0.05]">
                      <td className="px-2 py-1.5 text-center text-zinc-400">{idx + 1}</td>
                      <td className="px-2 py-1.5">
                        <input value={row.name} onChange={e => updateRowText(idx, "name", e.target.value)}
                          className={inputCls} placeholder="Tên mặt hàng" />
                      </td>
                      <td className="px-2 py-1.5">
                        <input value={row.unit} onChange={e => updateRowText(idx, "unit", e.target.value)}
                          className={inputCls} placeholder="ĐVT" />
                      </td>
                      <td className="px-2 py-1.5">
                        <div className="flex items-center gap-1">
                          <input type="number" min={0} value={row.qty}
                            onChange={e => updateRow(idx, "qty", Number(e.target.value))}
                            className={`${inputCls} text-right ${qtyWarn ? "border-yellow-400 dark:border-yellow-500/50" : ""}`} />
                          {qtyWarn && <span title={`Vượt SL PA (${row.paQty})`}><AlertTriangle className="h-3.5 w-3.5 shrink-0 text-yellow-500" /></span>}
                        </div>
                      </td>
                      <td className="px-2 py-1.5">
                        <div className="flex items-center gap-1">
                          <input type="number" min={0} value={row.unitPrice}
                            onChange={e => updateRow(idx, "unitPrice", Number(e.target.value))}
                            className={`${inputCls} text-right ${priceWarn ? "border-yellow-400 dark:border-yellow-500/50" : ""}`} />
                          {priceWarn && <span title="Đơn giá vượt PA 20%"><AlertTriangle className="h-3.5 w-3.5 shrink-0 text-yellow-500" /></span>}
                        </div>
                      </td>
                      <td className="px-2 py-1.5 text-right tabular-nums text-zinc-700 dark:text-slate-300">
                        {fmtDisplay(row.subtotal)}
                      </td>
                      <td className="px-2 py-1.5">
                        <button type="button" onClick={() => removeRow(idx)}
                          className="cursor-pointer text-zinc-300 dark:text-slate-600 hover:text-red-500 transition-colors text-xs">✕</button>
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

          <button type="button" onClick={addRow}
            className="cursor-pointer mt-2 text-xs text-brand-500 hover:text-brand-600 transition-colors">
            + Thêm dòng
          </button>

          <div className="mt-4 rounded-lg bg-zinc-50 dark:bg-white/[0.03] px-3 py-2 text-sm text-zinc-500 dark:text-slate-400">
            <span className="font-medium text-zinc-600 dark:text-slate-300">Bằng chữ: </span>
            <span className="italic">{fmtDisplay(total)} đồng</span>
          </div>

          <div className="mt-5 flex justify-between">
            <button type="button" onClick={() => setStep(2)}
              className="cursor-pointer inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 dark:border-white/[0.08] px-4 py-2 text-sm text-zinc-600 dark:text-slate-400 hover:bg-zinc-50 dark:hover:bg-white/[0.04]">
              <ChevronLeft className="h-4 w-4" /> Quay lại
            </button>
            <button type="button" onClick={() => setStep(4)} disabled={rows.length === 0}
              className="cursor-pointer inline-flex items-center gap-1.5 rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-40 disabled:cursor-not-allowed">
              Tiếp theo <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* ── Step 4: Tải xuống ── */}
      {step === 4 && (
        <div className="space-y-4">
          <div className="rounded-xl border border-zinc-200 dark:border-white/[0.07] bg-zinc-50 dark:bg-white/[0.03] p-4 space-y-1">
            <p className="text-sm"><span className="font-medium text-zinc-600 dark:text-slate-300">Loại HĐ:</span> {TEMPLATE_OPTIONS.find(t => t.key === templateType)?.label}</p>
            <p className="text-sm"><span className="font-medium text-zinc-600 dark:text-slate-300">Số hóa đơn:</span> {invoiceNumber}</p>
            <p className="text-sm"><span className="font-medium text-zinc-600 dark:text-slate-300">Nhà cung cấp:</span> {supplierName}</p>
            <p className="text-sm"><span className="font-medium text-zinc-600 dark:text-slate-300">Số dòng hàng:</span> {rows.length}</p>
            <p className="text-sm"><span className="font-medium text-zinc-600 dark:text-slate-300">Tổng cộng:</span> <span className="font-semibold text-brand-600 dark:text-brand-400">{fmtDisplay(total)} đồng</span></p>
          </div>

          {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

          <div className="flex justify-between">
            <button type="button" onClick={() => setStep(3)}
              className="cursor-pointer inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 dark:border-white/[0.08] px-4 py-2 text-sm text-zinc-600 dark:text-slate-400 hover:bg-zinc-50 dark:hover:bg-white/[0.04]">
              <ChevronLeft className="h-4 w-4" /> Quay lại
            </button>
            <button type="button" onClick={handleGenerate} disabled={generating}
              className="cursor-pointer inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-5 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
              {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              {generating ? "Đang tạo..." : "Tải DOCX"}
            </button>
          </div>
        </div>
      )}
    </BaseModal>
  );
}
