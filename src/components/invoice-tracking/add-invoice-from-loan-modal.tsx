"use client";

import { useState } from "react";
import { Loader2, Plus } from "lucide-react";

import { BaseModal } from "@/components/ui/BaseModal";
import { useLanguage } from "@/components/language-provider";

type Props = {
  disbursementId: string;
  beneficiaryLineId: string;
  beneficiaryName: string;
  defaultAmount: number;
  onClose: () => void;
  onCreated: () => void;
};

export function AddInvoiceFromLoanModal({
  disbursementId,
  beneficiaryLineId,
  beneficiaryName,
  defaultAmount,
  onClose,
  onCreated,
}: Props) {
  const { t } = useLanguage();
  const [form, setForm] = useState({
    invoiceNumber: "",
    supplierName: beneficiaryName,
    amount: String(defaultAmount),
    issueDate: new Date().toISOString().slice(0, 10),
    dueDate: "",
    notes: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (key: string, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async () => {
    if (!form.invoiceNumber || !form.supplierName || !form.amount || !form.issueDate || !form.dueDate) {
      setError("Vui lòng điền đầy đủ các trường bắt buộc.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch(`/api/disbursements/${disbursementId}/invoices`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          invoiceNumber: form.invoiceNumber,
          supplierName: form.supplierName,
          amount: Number(form.amount),
          issueDate: form.issueDate,
          dueDate: form.dueDate,
          notes: form.notes || undefined,
          disbursementBeneficiaryId: beneficiaryLineId,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Tạo hóa đơn thất bại");
      if (data.duplicateWarning) {
        console.warn("Duplicate warning:", data.duplicateWarning);
      }
      onCreated();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lỗi không xác định");
    } finally {
      setSubmitting(false);
    }
  };

  const inputCls =
    "w-full rounded-md border border-zinc-200 dark:border-white/10 bg-white dark:bg-[#1a1a1a] px-3 py-1.5 text-sm text-zinc-800 dark:text-slate-200 placeholder:text-zinc-400 dark:placeholder:text-slate-500 focus:border-violet-400 focus:outline-none focus:ring-1 focus:ring-violet-500/40";
  const labelCls = "block text-xs text-zinc-500 dark:text-slate-400 mb-1";

  return (
    <BaseModal
      open
      onClose={onClose}
      title={t("invoices.addInvoice") ?? "Bổ sung hóa đơn"}
      maxWidthClassName="max-w-lg"
      footer={
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer rounded-lg border border-zinc-300 dark:border-white/10 px-4 py-2 text-sm font-medium text-zinc-700 dark:text-slate-300 hover:bg-zinc-100 dark:hover:bg-white/5 transition-colors"
          >
            {t("common.cancel") ?? "Hủy"}
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting}
            className="cursor-pointer flex items-center gap-2 rounded-lg bg-gradient-to-r from-violet-600 to-fuchsia-600 px-4 py-2 text-sm font-medium text-white hover:brightness-110 disabled:opacity-50 transition-all"
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            {submitting ? "Đang lưu..." : (t("invoices.addInvoice") ?? "Thêm hóa đơn")}
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="rounded-lg bg-zinc-50 dark:bg-white/5 px-3 py-2 text-sm text-zinc-600 dark:text-slate-400">
          Đơn vị thụ hưởng: <span className="font-medium text-zinc-800 dark:text-slate-200">{beneficiaryName}</span>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Số hóa đơn *</label>
            <input type="text" value={form.invoiceNumber} onChange={(e) => handleChange("invoiceNumber", e.target.value)} placeholder="VD: 0001234" className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Nhà cung cấp *</label>
            <input type="text" value={form.supplierName} onChange={(e) => handleChange("supplierName", e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Số tiền *</label>
            <input type="number" value={form.amount} onChange={(e) => handleChange("amount", e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Ngày hóa đơn *</label>
            <input type="date" value={form.issueDate} onChange={(e) => handleChange("issueDate", e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Hạn thanh toán *</label>
            <input type="date" value={form.dueDate} onChange={(e) => handleChange("dueDate", e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Ghi chú</label>
            <input type="text" value={form.notes} onChange={(e) => handleChange("notes", e.target.value)} placeholder="(tùy chọn)" className={inputCls} />
          </div>
        </div>

        {error && (
          <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/40 px-3 py-2 text-sm text-red-700 dark:text-red-400">
            {error}
          </div>
        )}
      </div>
    </BaseModal>
  );
}
