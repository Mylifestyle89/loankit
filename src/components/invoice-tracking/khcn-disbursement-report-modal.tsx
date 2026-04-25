"use client";

import { useState, useCallback, useEffect } from "react";
import { Download, Loader2 } from "lucide-react";
import { BaseModal } from "@/components/ui/base-modal";
import { KHCN_DISBURSEMENT_TEMPLATES, type KhcnDisbursementTemplateKey } from "@/services/khcn-disbursement-template-config";
import type { RetailTemplateKey } from "@/services/retail-invoice-report.service";
import { saveFileWithPicker } from "@/lib/save-file-with-picker";

type Props = {
  loanId: string;
  disbursementId: string;
  onClose: () => void;
};

type TemplateMode =
  | { kind: "report"; key: KhcnDisbursementTemplateKey }
  | { kind: "retail"; key: RetailTemplateKey };

const TEMPLATE_LIST = Object.entries(KHCN_DISBURSEMENT_TEMPLATES) as [KhcnDisbursementTemplateKey, { label: string }][];

const RETAIL_LABEL: Record<RetailTemplateKey, string> = {
  tap_hoa:  "Hóa đơn tạp hóa / Đồ uống",
  vlxd:    "Hóa đơn vật liệu xây dựng",
  y_te:    "Hóa đơn thiết bị y tế",
  nong_san:"Phiếu bán hàng nông sản",
};

export function KhcnDisbursementReportModal({ loanId, disbursementId, onClose }: Props) {
  const [selected, setSelected] = useState<TemplateMode>({ kind: "report", key: "bcdxgn" });
  const [retailType, setRetailType] = useState<RetailTemplateKey | null>(null);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");

  // Detect stored retail invoice template type for this disbursement
  useEffect(() => {
    fetch(`/api/disbursements/${disbursementId}/retail-doc`)
      .then(r => r.json())
      .then(d => { if (d.ok && d.templateType) setRetailType(d.templateType as RetailTemplateKey); })
      .catch(() => {});
  }, [disbursementId]);

  const handleGenerate = useCallback(async () => {
    setGenerating(true);
    setError("");
    try {
      let res: Response;

      if (selected.kind === "report") {
        res = await fetch("/api/report/templates/khcn/disbursement", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ loanId, disbursementId, templateKey: selected.key }),
        });
      } else {
        res = await fetch(`/api/disbursements/${disbursementId}/retail-doc`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ templateType: selected.key }),
        });
      }

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? "Tạo báo cáo thất bại");
      }

      const blob = await res.blob();
      const disposition = res.headers.get("Content-Disposition") ?? "";
      const match = disposition.match(/filename\*?=(?:UTF-8'')?([^;\s]+)/);
      const fallbackName = selected.kind === "report"
        ? `${KHCN_DISBURSEMENT_TEMPLATES[selected.key].label}.docx`
        : `HoaDon_${selected.key}.docx`;
      await saveFileWithPicker(blob, match ? decodeURIComponent(match[1]) : fallbackName);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lỗi không xác định");
    } finally {
      setGenerating(false);
    }
  }, [loanId, disbursementId, selected, onClose]);

  const isSelected = (mode: TemplateMode) =>
    mode.kind === selected.kind && mode.key === selected.key;

  const radioItem = (mode: TemplateMode, label: string) => (
    <label
      key={`${mode.kind}-${mode.key}`}
      className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition ${
        isSelected(mode)
          ? "border-brand-500 bg-brand-50/30 dark:bg-brand-800/20"
          : "border-zinc-200 hover:border-zinc-300 dark:border-slate-600"
      }`}
    >
      <input
        type="radio"
        name="khcn-template"
        checked={isSelected(mode)}
        onChange={() => setSelected(mode)}
        className="accent-brand-500"
      />
      <span className="text-sm font-medium">{label}</span>
    </label>
  );

  return (
    <BaseModal open title="Tạo báo cáo giải ngân (KHCN)" onClose={onClose}>
      <div className="space-y-3">
        <p className="text-sm font-medium text-zinc-600 dark:text-slate-300">Chọn mẫu báo cáo</p>

        {TEMPLATE_LIST.map(([key, tpl]) => radioItem({ kind: "report", key }, tpl.label))}

        {/* Retail invoice — only show the type that was already stored for this disbursement */}
        {retailType && (
          <div className="pt-1">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-400 dark:text-slate-500">
              Hóa đơn bán lẻ
            </p>
            {radioItem({ kind: "retail", key: retailType }, RETAIL_LABEL[retailType])}
          </div>
        )}

        {error && (
          <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/40 px-3 py-2 text-sm text-red-700 dark:text-red-400">
            {error}
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="rounded-lg border border-zinc-300 dark:border-white/10 px-4 py-2 text-sm hover:bg-zinc-100 dark:hover:bg-white/5 transition-colors">
            Hủy
          </button>
          <button
            type="button"
            onClick={handleGenerate}
            disabled={generating}
            className="flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:brightness-110 disabled:opacity-50 transition-all"
          >
            {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            {generating ? "Đang tạo..." : "Xem trước & Tải xuống"}
          </button>
        </div>
      </div>
    </BaseModal>
  );
}
