// FieldRow display — label input, technical key, sample data, confidence score, OCR accept/decline

import { FileText, Check, X } from "lucide-react";
import type { FieldCatalogItem } from "@/lib/report/config-schema";
import type { ExtractSuggestionSource } from "../types";

type OcrSuggestion = {
  proposedValue: string;
  confidenceScore: number;
  status: "pending" | "accepted" | "declined";
  source?: ExtractSuggestionSource;
};

type FieldRowDisplayProps = {
  field: FieldCatalogItem;
  showTechnicalKeys: boolean;
  sampleData: string;
  confidenceScore: number;
  templateUsage?: string[];
  ocrSuggestion?: OcrSuggestion;
  onFieldLabelChange: (fieldKey: string, labelVi: string) => void;
  onAcceptOcrSuggestion?: (fieldKey: string) => void;
  onDeclineOcrSuggestion?: (fieldKey: string) => void;
  navigateField: (e: React.KeyboardEvent<HTMLElement>, col: "label" | "value" | "type") => void;
};

export function FieldRowDisplay({
  field,
  showTechnicalKeys,
  sampleData,
  confidenceScore,
  templateUsage,
  ocrSuggestion,
  onFieldLabelChange,
  onAcceptOcrSuggestion,
  onDeclineOcrSuggestion,
  navigateField,
}: FieldRowDisplayProps) {
  const hasPendingOcr = ocrSuggestion?.status === "pending";

  return (
    <div className="flex min-w-0 items-start gap-2 pt-0.5">
      <div className="min-w-0 flex-1">
        <input
          value={field.label_vi}
          onChange={(e) => onFieldLabelChange(field.field_key, e.target.value)}
          onKeyDown={(e) => navigateField(e, "label")}
          data-field-col="label"
          aria-label="Tên hiển thị field"
          className="w-full truncate rounded border border-transparent bg-transparent px-2 py-1 text-sm font-medium text-zinc-800 dark:text-slate-200 transition-colors hover:border-zinc-200 focus:border-amber-500 focus:bg-white dark:focus:bg-white/[0.06] focus:outline-none focus:ring-1 focus:ring-amber-500"
          title={field.label_vi}
        />
        {showTechnicalKeys && (
          <p className="mt-0.5 px-2 font-mono text-[10px] text-zinc-700 dark:text-slate-400">
            {field.field_key}
          </p>
        )}
        <div className="mt-0.5 flex items-center justify-between gap-2 px-2">
          <p className="truncate text-[10px] text-zinc-400 dark:text-slate-500" title={sampleData || "Chưa có dữ liệu mẫu"}>
            Sample Data: {sampleData || "—"}
          </p>
          {templateUsage && templateUsage.length > 0 && (
            <span
              className="inline-flex flex-shrink-0 items-center gap-0.5 rounded-full bg-amber-100 dark:bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700 dark:text-amber-400"
              title={`Dùng trong: ${templateUsage.join(", ")}`}
            >
              <FileText className="h-2.5 w-2.5" />
              {templateUsage.length}
            </span>
          )}
          <span
            className={`inline-flex flex-shrink-0 items-center rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
              confidenceScore >= 90
                ? "bg-emerald-100 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                : confidenceScore >= 60
                  ? "bg-amber-100 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400"
                  : "bg-rose-100 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400"
            }`}
            title="Confidence Score (heuristic)"
          >
            {confidenceScore}%
          </span>
        </div>

        {/* OCR pending review badge */}
        {hasPendingOcr && (
          <div className="mt-1 flex flex-wrap items-center gap-1.5 px-1">
            <span className="rounded-full border border-amber-200 dark:border-amber-500/30 bg-amber-100 dark:bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-700 dark:text-amber-400">
              Pending Review ({Math.round((ocrSuggestion?.confidenceScore ?? 0) * 100)}%)
            </span>
            <span
              className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
                ocrSuggestion?.source === "docx_ai"
                  ? "bg-amber-100 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400"
                  : "bg-sky-100 dark:bg-sky-500/10 text-sky-700 dark:text-sky-400"
              }`}
            >
              {ocrSuggestion?.source === "docx_ai" ? "DOCX" : "OCR"}
            </span>
            <p
              className="text-[10px] text-amber-700 dark:text-amber-400 px-1 truncate max-w-[200px]"
              title={ocrSuggestion?.proposedValue}
            >
              → {ocrSuggestion?.proposedValue}
            </p>
            <button
              type="button"
              onClick={() => onAcceptOcrSuggestion?.(field.field_key)}
              className="inline-flex items-center gap-1 rounded-md border border-emerald-200 dark:border-emerald-500/30 bg-emerald-50 dark:bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:text-emerald-400 transition-colors hover:bg-emerald-100 dark:hover:bg-emerald-500/20"
            >
              <Check className="h-3 w-3" />
              Accept
            </button>
            <button
              type="button"
              onClick={() => onDeclineOcrSuggestion?.(field.field_key)}
              className="inline-flex items-center gap-1 rounded-md border border-rose-200 dark:border-rose-500/30 bg-rose-50 dark:bg-rose-500/10 px-2 py-0.5 text-[10px] font-semibold text-rose-700 dark:text-rose-400 transition-colors hover:bg-rose-100 dark:hover:bg-rose-500/20"
            >
              <X className="h-3 w-3" />
              Decline
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
