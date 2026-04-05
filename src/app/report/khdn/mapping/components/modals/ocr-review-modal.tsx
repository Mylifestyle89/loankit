"use client";

import { AnimatePresence, motion } from "framer-motion";
import { X, CheckCheck, XCircle, ScanLine } from "lucide-react";

import type { FieldCatalogItem } from "@/lib/report/config-schema";
import type { OcrProcessResponse, OcrSuggestionMap, RepeaterSuggestionItem } from "../../types";
import { OcrReviewFieldList } from "./ocr-review-field-list";

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
  const entries = Object.values(suggestions);
  const pendingCount = entries.filter((e) => e.status === "pending").length;
  const total = entries.length;

  const repeaterEntries = Object.values(repeaterSuggestions ?? {});
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
            className="w-full max-w-2xl rounded-2xl border border-slate-200/60 dark:border-white/[0.08] bg-white/95 dark:bg-[#141414]/90 shadow-[0_8px_40px_rgb(0,0,0,0.12)] dark:shadow-[0_8px_40px_rgb(0,0,0,0.5)] backdrop-blur-md flex flex-col max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center gap-3 border-b border-slate-200/60 dark:border-white/[0.07] px-6 py-4 flex-shrink-0">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-500/15">
                <ScanLine className="h-4 w-4 text-amber-600 dark:text-amber-400" />
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

            {/* Body — field list + repeater list */}
            <div className="flex-1 overflow-y-auto min-h-0">
              <OcrReviewFieldList
                suggestions={suggestions}
                repeaterSuggestions={repeaterSuggestions}
                fieldCatalog={fieldCatalog}
                onAcceptOne={onAcceptOne}
                onDeclineOne={onDeclineOne}
                onAcceptRepeaterOne={onAcceptRepeaterOne}
                onDeclineRepeaterOne={onDeclineRepeaterOne}
              />
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
                      className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-amber-600 to-orange-500 px-4 py-1.5 text-sm font-medium text-white shadow-sm hover:brightness-110 transition-colors"
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
                      className="inline-flex items-center gap-1.5 rounded-lg bg-amber-600 px-4 py-1.5 text-sm font-medium text-white shadow-sm hover:bg-amber-700 transition-colors"
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
