"use client";

// OCR review field list — table of scalar fields + repeater group suggestions

import { Check, X } from "lucide-react";
import type { OcrSuggestionMap, RepeaterSuggestionItem } from "../../types";
import type { FieldCatalogItem } from "@/lib/report/config-schema";

type OcrReviewFieldListProps = {
  suggestions: OcrSuggestionMap;
  repeaterSuggestions?: Record<
    string,
    RepeaterSuggestionItem & { status: "pending" | "accepted" | "declined"; source?: "docx_ai" | "ocr_ai" }
  >;
  fieldCatalog: FieldCatalogItem[];
  onAcceptOne: (fieldKey: string) => void;
  onDeclineOne: (fieldKey: string) => void;
  onAcceptRepeaterOne?: (groupPath: string) => void;
  onDeclineRepeaterOne?: (groupPath: string) => void;
};

export function OcrReviewFieldList({
  suggestions,
  repeaterSuggestions,
  fieldCatalog,
  onAcceptOne,
  onDeclineOne,
  onAcceptRepeaterOne,
  onDeclineRepeaterOne,
}: OcrReviewFieldListProps) {
  const labelByKey = Object.fromEntries(fieldCatalog.map((f) => [f.field_key, f.label_vi]));

  const entries = Object.values(suggestions).sort((a, b) => {
    const order = { pending: 0, accepted: 1, declined: 2 };
    return order[a.status] - order[b.status];
  });

  const repeaterEntries = Object.values(repeaterSuggestions ?? {}).sort((a, b) => {
    const order = { pending: 0, accepted: 1, declined: 2 };
    return order[a.status] - order[b.status];
  });

  return (
    <>
      {/* Repeater suggestions section */}
      {repeaterEntries.length > 0 && (
        <div className="border-b border-slate-200/60 dark:border-white/[0.07]">
          <div className="px-4 py-2.5 bg-violet-50/50 dark:bg-violet-500/5">
            <p className="text-xs font-semibold text-violet-700 dark:text-violet-400">
              Repeater suggestions ({repeaterEntries.filter((e) => e.status === "pending").length} pending / {repeaterEntries.length} groups)
            </p>
          </div>
          <div className="p-4 space-y-2">
            {repeaterEntries.map((item) => {
              const isPending = item.status === "pending";
              const isAccepted = item.status === "accepted";
              return (
                <div
                  key={item.groupPath}
                  className={`rounded-xl border px-3 py-2 ${
                    isPending
                      ? "border-violet-200/70 bg-violet-50/40 dark:border-violet-500/30 dark:bg-violet-500/10"
                      : isAccepted
                        ? "border-emerald-200/70 bg-emerald-50/40 dark:border-emerald-500/30 dark:bg-emerald-500/10"
                        : "border-slate-200/70 bg-slate-50/40 dark:border-white/[0.08] dark:bg-white/[0.04] opacity-60"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 truncate" title={item.groupPath}>
                        {item.groupPath}
                      </p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        {item.rows.length} bản ghi • conf {Math.round((item.confidenceScore ?? 0) * 100)}%
                      </p>
                    </div>
                    {isPending ? (
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => onAcceptRepeaterOne?.(item.groupPath)}
                          className="inline-flex items-center gap-1 rounded border border-emerald-200 dark:border-emerald-500/30 bg-emerald-50 dark:bg-emerald-500/10 px-2 py-1 text-[10px] font-semibold text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 transition-colors"
                        >
                          <Check className="h-3 w-3" />
                          Accept
                        </button>
                        <button
                          type="button"
                          onClick={() => onDeclineRepeaterOne?.(item.groupPath)}
                          className="inline-flex items-center gap-1 rounded border border-rose-200 dark:border-rose-500/30 bg-rose-50 dark:bg-rose-500/10 px-2 py-1 text-[10px] font-semibold text-rose-700 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-500/20 transition-colors"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ) : (
                      <span className={`text-[10px] font-semibold ${isAccepted ? "text-emerald-600 dark:text-emerald-400" : "text-slate-400"}`}>
                        {isAccepted ? "✓ Accepted" : "✗ Declined"}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Scalar field table */}
      {entries.length === 0 ? (
        <p className="px-6 py-8 text-center text-sm text-slate-400 dark:text-slate-500">
          Không có gợi ý nào được tạo.
        </p>
      ) : (
        <table className="w-full text-sm">
          <thead className="sticky top-0 z-10">
            <tr className="border-b border-slate-200/70 dark:border-white/[0.07] bg-slate-50/90 dark:bg-white/[0.04] backdrop-blur-sm text-left">
              <th className="px-4 py-2.5 text-xs font-semibold text-slate-600 dark:text-slate-400">Trường</th>
              <th className="px-4 py-2.5 text-xs font-semibold text-slate-600 dark:text-slate-400">Giá trị gợi ý</th>
              <th className="px-4 py-2.5 text-xs font-semibold text-slate-600 dark:text-slate-400 w-20 text-center">Nguồn</th>
              <th className="px-4 py-2.5 text-xs font-semibold text-slate-600 dark:text-slate-400 w-16 text-center">Conf.</th>
              <th className="px-4 py-2.5 text-xs font-semibold text-slate-600 dark:text-slate-400 w-28" />
            </tr>
          </thead>
          <tbody>
            {entries.map((item) => {
              const isPending = item.status === "pending";
              const isAccepted = item.status === "accepted";
              const fieldLabel = labelByKey[item.fieldKey] ?? item.fieldKey;
              const confPct = Math.round(item.confidenceScore * 100);

              return (
                <tr
                  key={item.fieldKey}
                  className={`border-t border-slate-100 dark:border-white/[0.05] transition-colors ${
                    isPending
                      ? "bg-amber-50/50 dark:bg-amber-500/5"
                      : isAccepted
                      ? "bg-emerald-50/30 dark:bg-emerald-500/5"
                      : "opacity-40"
                  }`}
                >
                  <td className="px-4 py-2.5 font-medium text-slate-700 dark:text-slate-300 max-w-[160px] truncate" title={fieldLabel}>
                    {fieldLabel}
                  </td>
                  <td className="px-4 py-2.5 text-slate-600 dark:text-slate-400 max-w-[200px] truncate" title={item.proposedValue}>
                    {item.proposedValue}
                  </td>
                  <td className="px-4 py-2.5 text-center">
                    <span
                      className={`inline-flex rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
                        item.source === "docx_ai"
                          ? "bg-violet-100 dark:bg-violet-500/10 text-violet-700 dark:text-violet-400"
                          : "bg-sky-100 dark:bg-sky-500/10 text-sky-700 dark:text-sky-400"
                      }`}
                    >
                      {item.source === "docx_ai" ? "DOCX" : "OCR"}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-center">
                    <span className={`inline-block rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
                      confPct >= 80
                        ? "bg-emerald-100 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                        : confPct >= 60
                        ? "bg-amber-100 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400"
                        : "bg-rose-100 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400"
                    }`}>
                      {confPct}%
                    </span>
                  </td>
                  <td className="px-4 py-2">
                    {isPending ? (
                      <div className="flex items-center gap-1.5 justify-end">
                        <button
                          type="button"
                          onClick={() => onAcceptOne(item.fieldKey)}
                          className="inline-flex items-center gap-1 rounded border border-emerald-200 dark:border-emerald-500/30 bg-emerald-50 dark:bg-emerald-500/10 px-2 py-1 text-[10px] font-semibold text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 transition-colors"
                        >
                          <Check className="h-3 w-3" />
                          Accept
                        </button>
                        <button
                          type="button"
                          onClick={() => onDeclineOne(item.fieldKey)}
                          className="inline-flex items-center gap-1 rounded border border-rose-200 dark:border-rose-500/30 bg-rose-50 dark:bg-rose-500/10 px-2 py-1 text-[10px] font-semibold text-rose-700 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-500/20 transition-colors"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ) : (
                      <span className={`text-[10px] font-semibold ${isAccepted ? "text-emerald-600 dark:text-emerald-400" : "text-slate-400"}`}>
                        {isAccepted ? "✓ Accepted" : "✗ Declined"}
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </>
  );
}
