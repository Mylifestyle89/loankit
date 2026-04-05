"use client";

import { useState, useCallback } from "react";
import { Download, Loader2 } from "lucide-react";
import { BaseModal } from "@/components/ui/base-modal";
import { KHCN_DISBURSEMENT_TEMPLATES, type KhcnDisbursementTemplateKey } from "@/services/khcn-disbursement-template-config";
import { saveFileWithPicker } from "@/lib/save-file-with-picker";

type Props = {
  loanId: string;
  disbursementId: string;
  onClose: () => void;
};

const TEMPLATE_LIST = Object.entries(KHCN_DISBURSEMENT_TEMPLATES) as [KhcnDisbursementTemplateKey, { label: string; path: string }][];

export function KhcnDisbursementReportModal({ loanId, disbursementId, onClose }: Props) {
  const [selectedKey, setSelectedKey] = useState<KhcnDisbursementTemplateKey>("bcdxgn");
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");

  const handleGenerate = useCallback(async () => {
    setGenerating(true);
    setError("");
    try {
      const res = await fetch("/api/report/templates/khcn/disbursement", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ loanId, disbursementId, templateKey: selectedKey }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? "Tạo báo cáo thất bại");
      }
      // Direct download (same as KHDN flow)
      const blob = await res.blob();
      const disposition = res.headers.get("Content-Disposition") ?? "";
      const match = disposition.match(/filename\*?=(?:UTF-8'')?([^;\s]+)/);
      const fileName = match ? decodeURIComponent(match[1]) : `${KHCN_DISBURSEMENT_TEMPLATES[selectedKey].label}.docx`;
      await saveFileWithPicker(blob, fileName);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lỗi không xác định");
    } finally {
      setGenerating(false);
    }
  }, [loanId, disbursementId, selectedKey, onClose]);

  return (
    <BaseModal open title="Tạo báo cáo giải ngân (KHCN)" onClose={onClose}>
      <div className="space-y-3">
        <p className="text-sm font-medium text-zinc-600 dark:text-slate-300">Chọn mẫu báo cáo</p>
        {TEMPLATE_LIST.map(([key, tpl]) => (
          <label
            key={key}
            className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition ${
              selectedKey === key
                ? "border-amber-500 bg-amber-50/30 dark:bg-amber-900/20"
                : "border-zinc-200 hover:border-zinc-300 dark:border-slate-600"
            }`}
          >
            <input
              type="radio"
              name="khcn-template"
              checked={selectedKey === key}
              onChange={() => setSelectedKey(key)}
              className="accent-amber-600"
            />
            <span className="text-sm font-medium">{tpl.label}</span>
          </label>
        ))}

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
            className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-amber-600 to-orange-500 px-4 py-2 text-sm font-medium text-white hover:brightness-110 disabled:opacity-50 transition-all"
          >
            {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            {generating ? "Đang tạo..." : "Xem trước & Tải xuống"}
          </button>
        </div>
      </div>
    </BaseModal>
  );
}
