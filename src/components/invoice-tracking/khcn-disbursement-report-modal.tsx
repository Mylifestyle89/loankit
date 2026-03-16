"use client";

import { useState } from "react";
import { BaseModal } from "@/components/ui/BaseModal";
import { KHCN_DISBURSEMENT_TEMPLATES, type KhcnDisbursementTemplateKey } from "@/services/khcn-disbursement-template-config";

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

  async function handleGenerate() {
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
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${KHCN_DISBURSEMENT_TEMPLATES[selectedKey].label}.docx`;
      a.click();
      URL.revokeObjectURL(url);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lỗi không xác định");
    } finally {
      setGenerating(false);
    }
  }

  return (
    <BaseModal open title="Tạo báo cáo giải ngân (KHCN)" onClose={onClose}>
      <div className="space-y-3">
        <p className="text-sm font-medium text-zinc-600 dark:text-slate-300">Chọn mẫu báo cáo</p>
        {TEMPLATE_LIST.map(([key, tpl]) => (
          <label
            key={key}
            className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition ${
              selectedKey === key
                ? "border-purple-500 bg-purple-50 dark:bg-purple-900/20"
                : "border-zinc-200 hover:border-zinc-300 dark:border-slate-600"
            }`}
          >
            <input
              type="radio"
              name="khcn-template"
              checked={selectedKey === key}
              onChange={() => setSelectedKey(key)}
              className="accent-purple-600"
            />
            <span className="text-sm font-medium">{tpl.label}</span>
          </label>
        ))}

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="rounded-lg border px-4 py-2 text-sm">
            Hủy
          </button>
          <button
            type="button"
            onClick={handleGenerate}
            disabled={generating}
            className="rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700 disabled:opacity-50"
          >
            {generating ? "Đang tạo..." : "Tạo báo cáo"}
          </button>
        </div>
      </div>
    </BaseModal>
  );
}
