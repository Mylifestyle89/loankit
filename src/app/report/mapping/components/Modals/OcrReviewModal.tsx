"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Check, X, CheckCheck, XCircle, ScanLine } from "lucide-react";

import type { FieldCatalogItem } from "@/lib/report/config-schema";
import type { OcrProcessResponse, OcrSuggestionMap, RepeaterSuggestionItem } from "../../types";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  suggestions: OcrSuggestionMap;
  repeaterSuggestions?: Record<
    string,
    RepeaterSuggestionItem & { status: "pending" | "accepted" | "declined"; source?: "docx_ai" | "ocr_ai" }
  >;
  fieldCatalog: FieldCatalogItem[];
  meta?: OcrProcessResponse["meta"];
  onAcceptOne: (fieldKey: string) => void;
  onDeclineOne: (fieldKey: string) => void;
  onAcceptAll: () => void;
  onDeclineAll: () => void;
  onAcceptRepeaterOne?: (groupPath: string) => void;
  onDeclineRepeaterOne?: (groupPath: string) => void;
  onAcceptRepeaterAll?: () => void;
  onDeclineRepeaterAll?: () => void;
};

export function OcrReviewModal({
  isOpen,
  onClose,
  suggestions,
  repeaterSuggestions,
  fieldCatalog,
  meta,
  onAcceptOne,
  onDeclineOne,
  onAcceptAll,
  onDeclineAll,
  onAcceptRepeaterOne,
  onDeclineRepeaterOne,
  onAcceptRepeaterAll,
  onDeclineRepeaterAll,
}: Props) {
  const labelByKey = Object.fromEntries(fieldCatalog.map((f) => [f.field_key, f.label_vi]));

  const entries = Object.values(suggestions).sort((a, b) => {
    const order = { pending: 0, accepted: 1, declined: 2 };
    return order[a.status] - order[b.status];
  });

  const pendingCount = entries.filter((e) => e.status === "pending").length;
  const total = entries.length;
  const repeaterEntries = Object.values(repeaterSuggestions ?? {}).sort((a, b) => {
    const order = { pending: 0, accepted: 1, declined: 2 };
    return order[a.status] - order[b.status];
  });
  const pendingRepeaterCount = repeaterEntries.filter((e) => e.status === "pending").length;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
        >
          <motion.div
            initial={{ opacity: 0, y: 32, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.98 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="w-full max-w-2xl rounded-2xl border border-slate-200/60 dark:border-white/[0.08] bg-white/95 dark:bg-[#0f1629]/90 shadow-[0_8px_40px_rgb(0,0,0,0.12)] dark:shadow-[0_8px_40px_rgb(0,0,0,0.5)] backdrop-blur-md flex flex-col max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center gap-3 border-b border-slate-200/60 dark:border-white/[0.07] px-6 py-4 flex-shrink-0">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-100 dark:bg-indigo-500/15">
                <ScanLine className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                  Kết quả OCR
                </h2>
                <div className="mt-0.5 flex items-center gap-2 flex-wrap">
                  {meta && (
                    <>
                      <span className="rounded-full border border-slate-200 dark:border-white/[0.09] bg-slate-100 dark:bg-white/[0.06] px-2 py-0.5 text-[10px] font-medium text-slate-600 dark:text-slate-400">
                        {meta.provider === "vision"
                          ? "Gemini Vision"
                          : meta.provider === "docx_ai"
                            ? "DOCX AI Extract"
                            : "Tesseract OCR"}
                      </span>
                      <span className="text-[10px] text-slate-400 dark:text-slate-500">
                        {meta.extractedTextLength.toLocaleString()} ký tự
                        {typeof meta.paragraphCount === "number"
                          ? ` • ${meta.paragraphCount.toLocaleString()} đoạn`
                          : ""}
                      </span>
                    </>
                  )}
                  {pendingCount > 0 && (
                    <span className="rounded-full border border-amber-300 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-700 dark:text-amber-400">
                      {pendingCount} chờ xác nhận / {total}
                    </span>
                  )}
                  {pendingCount === 0 && total > 0 && (
                    <span className="rounded-full border border-emerald-200 dark:border-emerald-500/30 bg-emerald-50 dark:bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:text-emerald-400">
                      Đã xử lý {total} trường
                    </span>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg p-1.5 text-slate-400 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-white/[0.07] hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto min-h-0">
              {repeaterEntries.length > 0 && (
                <div className="border-b border-slate-200/60 dark:border-white/[0.07]">
                  <div className="px-4 py-2.5 bg-violet-50/50 dark:bg-violet-500/5">
                    <p className="text-xs font-semibold text-violet-700 dark:text-violet-400">
                      Repeater suggestions ({pendingRepeaterCount} pending / {repeaterEntries.length} groups)
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
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between gap-3 border-t border-slate-200/60 dark:border-white/[0.07] px-6 py-4 flex-shrink-0">
              <div className="flex items-center gap-2">
                {pendingCount > 0 && (
                  <>
                    <button
                      type="button"
                      onClick={onDeclineAll}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 dark:border-rose-500/30 px-3 py-1.5 text-sm font-medium text-rose-700 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors"
                    >
                      <XCircle className="h-4 w-4" />
                      Decline All
                    </button>
                    <button
                      type="button"
                      onClick={onAcceptAll}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-1.5 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 transition-colors"
                    >
                      <CheckCheck className="h-4 w-4" />
                      Accept All ({pendingCount})
                    </button>
                  </>
                )}
                {pendingRepeaterCount > 0 && (
                  <>
                    <button
                      type="button"
                      onClick={onDeclineRepeaterAll}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 dark:border-rose-500/30 px-3 py-1.5 text-sm font-medium text-rose-700 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors"
                    >
                      <XCircle className="h-4 w-4" />
                      Decline Repeater ({pendingRepeaterCount})
                    </button>
                    <button
                      type="button"
                      onClick={onAcceptRepeaterAll}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-violet-600 px-4 py-1.5 text-sm font-medium text-white shadow-sm hover:bg-violet-700 transition-colors"
                    >
                      <CheckCheck className="h-4 w-4" />
                      Accept Repeater ({pendingRepeaterCount})
                    </button>
                  </>
                )}
              </div>
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg px-4 py-1.5 text-sm font-medium text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/[0.06] hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
              >
                Đóng
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
