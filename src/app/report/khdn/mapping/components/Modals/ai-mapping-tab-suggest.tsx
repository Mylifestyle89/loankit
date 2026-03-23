"use client";

// Suggest tab for AiMappingModal — AI header-to-placeholder mapping with two-panel canvas view

import { type RefObject, useMemo } from "react";
import { motion } from "framer-motion";
import { Bot, FileText, ArrowRight, Check } from "lucide-react";
import { suggestAliasForPlaceholder } from "@/lib/report/placeholder-utils";
import { MappingCanvas, type MappingLink } from "../MappingCanvas";
import { MappingChip } from "./ai-mapping-chip";
import { getChipVariant } from "./ai-mapping-modal-utils";
import { AiSuggestReviewTable, buildReviewItems, type SuggestReviewItem } from "./ai-suggest-review-table";
import type { FieldCatalogItem } from "@/lib/report/config-schema";

type SuggestTabProps = {
  // Canvas refs
  canvasContainerRef: RefObject<HTMLDivElement | null>;
  sourceScrollRef: RefObject<HTMLDivElement | null>;
  targetScrollRef: RefObject<HTMLDivElement | null>;
  // Header state
  headersRaw: string;
  setHeadersRaw: (v: string) => void;
  parsedHeaders: string[];
  includeGrouping: boolean;
  setIncludeGrouping: (v: boolean) => void;
  // Suggestion state
  loading: boolean;
  error: string;
  suggestion: Record<string, string>;
  grouping: { groupKey: string; repeatKey: string } | undefined;
  suggestionVersion: number;
  mappingLinks: MappingLink[];
  // Placeholder display
  placeholderList: string[];
  rows: Array<{ placeholder: string; placeholderLabel: string; header: string }>;
  matchedCount: number;
  showVietnameseAlias: boolean;
  setShowVietnameseAlias: (v: boolean) => void;
  // Hover
  hoveredKey: string | null;
  setHoveredKey: (key: string | null) => void;
  handleChipHover: (key: string | null) => void;
  // DOCX extraction
  docxParsing: boolean;
  docxFileName: string;
  docxFields: string[];
  handleDocxTemplateFile: (file: File) => void;
  // Review
  showReview: boolean;
  setShowReview: (v: boolean) => void;
  fieldCatalog: FieldCatalogItem[];
  handleReviewConfirm: (selected: SuggestReviewItem[], groupLabels: Record<string, string>) => void;
  // Actions
  runSuggestion: () => void;
  acceptSuggestion: () => void;
  onClose: () => void;
  t: (key: string) => string;
};

export function SuggestTab({
  canvasContainerRef,
  sourceScrollRef,
  targetScrollRef,
  headersRaw,
  setHeadersRaw,
  parsedHeaders,
  includeGrouping,
  setIncludeGrouping,
  loading,
  error,
  suggestion,
  grouping,
  suggestionVersion,
  mappingLinks,
  placeholderList,
  rows,
  matchedCount,
  showVietnameseAlias,
  setShowVietnameseAlias,
  hoveredKey,
  setHoveredKey,
  handleChipHover,
  docxParsing,
  docxFileName,
  docxFields,
  handleDocxTemplateFile,
  showReview,
  setShowReview,
  fieldCatalog,
  handleReviewConfirm,
  runSuggestion,
  acceptSuggestion,
  onClose,
  t,
}: SuggestTabProps) {
  // Pre-compute mapped headers for O(1) lookup instead of O(n) per header
  const mappedHeadersSet = useMemo(() => new Set(Object.values(suggestion)), [suggestion]);

  return (
    <>
      {/* Two-panel mapping area with Bezier overlay */}
      <div ref={canvasContainerRef} className="relative flex-shrink-0 p-4">
        <MappingCanvas
          links={mappingLinks}
          containerRef={canvasContainerRef}
          sourceScrollRef={sourceScrollRef}
          targetScrollRef={targetScrollRef}
          animationKey={suggestionVersion}
          hoveredKey={hoveredKey}
        />

        <div className="grid gap-4 md:grid-cols-2 md:min-h-[280px]">
          {/* Panel: Source (Excel) */}
          <motion.div
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.25 }}
            className="panel-flex-safe flex h-full flex-col overflow-hidden rounded-xl border border-slate-200/50 bg-white/40 shadow-sm backdrop-blur-md dark:border-white/[0.07] dark:bg-white/[0.04]"
          >
            <div className="border-b border-slate-200/50 px-4 py-2.5 dark:border-white/[0.07]">
              <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Source (Excel)</h4>
            </div>
            <div ref={sourceScrollRef} className="min-h-0 flex-1 overflow-y-auto p-4">
              <div className="space-y-3">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
                  {t("mapping.aiSuggest.headersLabel")}
                </label>
                <textarea
                  value={headersRaw}
                  onChange={(e) => setHeadersRaw(e.target.value)}
                  rows={5}
                  placeholder={t("mapping.aiSuggest.headersPlaceholder")}
                  className="w-full rounded-lg border border-slate-200/80 bg-white/80 px-3 py-2 text-sm placeholder:text-slate-400 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500 dark:border-white/[0.08] dark:bg-white/[0.04] dark:text-slate-100 dark:placeholder:text-slate-500"
                />
                <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200">
                  <input
                    type="checkbox"
                    checked={includeGrouping}
                    onChange={(e) => setIncludeGrouping(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-violet-600 focus:ring-violet-500"
                  />
                  {t("mapping.aiSuggest.includeGrouping")}
                </label>
                <button
                  type="button"
                  onClick={() => void runSuggestion()}
                  disabled={loading}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-violet-600 to-fuchsia-600 px-3 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:brightness-110 disabled:opacity-70"
                >
                  <Bot className="h-4 w-4" />
                  {loading ? t("mapping.aiSuggest.loading") : t("mapping.aiSuggest.runGemini")}
                </button>
                {error ? <p className="text-sm text-rose-600">{error}</p> : null}
              </div>

              {/* DOCX Template field extraction */}
              <div className="mt-4 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                    Trích xuất từ Template DOCX
                  </span>
                  <label className="flex cursor-pointer items-center gap-1.5 rounded-md border border-slate-200 dark:border-white/[0.10] bg-white dark:bg-white/[0.04] px-2 py-1 text-[11px] font-medium text-slate-600 dark:text-slate-300 hover:border-violet-300 hover:text-violet-600 dark:hover:border-violet-500/40 dark:hover:text-violet-400 transition-colors">
                    <FileText className="h-3 w-3 flex-shrink-0" />
                    {docxParsing
                      ? "Đang đọc..."
                      : docxFileName
                        ? docxFileName.replace(/\.docx$/i, "").slice(0, 20)
                        : "Chọn .docx"}
                    <input
                      type="file"
                      accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        e.target.value = "";
                        if (f) void handleDocxTemplateFile(f);
                      }}
                    />
                  </label>
                </div>
                {docxFields.length > 0 && (
                  <div className="space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] text-slate-400 dark:text-slate-500">
                        {docxFields.length} field tìm thấy
                      </span>
                      <button
                        type="button"
                        onClick={() => setHeadersRaw(docxFields.join("\n"))}
                        className="flex items-center gap-1 rounded border border-violet-300 dark:border-violet-500/30 bg-violet-50 dark:bg-violet-500/10 px-2 py-0.5 text-[11px] font-medium text-violet-700 dark:text-violet-400 hover:bg-violet-100 dark:hover:bg-violet-500/20 transition-colors"
                      >
                        <ArrowRight className="h-3 w-3" />
                        Dùng làm Headers
                      </button>
                    </div>
                    <div className="flex flex-col gap-1">
                      {docxFields.map((field) => {
                        const matches = suggestAliasForPlaceholder(field, parsedHeaders);
                        const hasMatch = matches.length > 0;
                        return (
                          <div key={field} className="space-y-0.5">
                            <div
                              className={`flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs font-medium ${
                                hasMatch
                                  ? "border-violet-400/70 dark:border-violet-400/30 bg-violet-100/60 dark:bg-violet-500/20 text-violet-800 dark:text-violet-300"
                                  : "border-violet-200/70 dark:border-violet-500/20 bg-violet-50/50 dark:bg-violet-500/10 text-violet-700 dark:text-violet-400"
                              }`}
                            >
                              <span className="text-violet-500 dark:text-violet-400 select-none">[</span>
                              <span className="min-w-0 truncate font-sans" title={field}>{field}</span>
                              <span className="text-violet-500 dark:text-violet-400 select-none">]</span>
                            </div>
                            {hasMatch && (
                              <div className="pl-2 text-[10px] text-slate-500 dark:text-slate-400">
                                → {matches.join(", ")}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Parsed Excel header chips */}
              {parsedHeaders.length > 0 && (
                <div className="mt-4 space-y-1.5">
                  <span className="block text-xs font-medium text-slate-500 dark:text-slate-400">
                    Headers ({parsedHeaders.length})
                  </span>
                  <div className="flex flex-col gap-1.5">
                    {parsedHeaders.map((header) => {
                      const isMapped = mappedHeadersSet.has(header);
                      return (
                        <div
                          key={header}
                          data-header={header}
                          className={`flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-shadow ${
                            isMapped
                              ? "border-violet-200/80 bg-violet-50/60 text-violet-700 dark:border-violet-500/30 dark:bg-violet-500/10 dark:text-violet-400"
                              : "border-slate-200/80 bg-slate-50/60 text-slate-600 dark:border-white/[0.07] dark:bg-white/[0.04] dark:text-slate-300"
                          } ${hoveredKey === header ? "shadow-md ring-1 ring-violet-300/60" : ""}`}
                          onMouseEnter={() => setHoveredKey(header)}
                          onMouseLeave={() => setHoveredKey(null)}
                        >
                          <span className="min-w-0 truncate" title={header}>{header}</span>
                          {isMapped && <Check className="h-3 w-3 flex-shrink-0 text-emerald-500" />}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </motion.div>

          {/* Panel: Target (Template) */}
          <motion.div
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.25 }}
            className="panel-flex-safe flex h-full flex-col overflow-hidden rounded-xl border border-slate-200/50 bg-white/40 shadow-sm backdrop-blur-md dark:border-white/[0.07] dark:bg-white/[0.04]"
          >
            <div className="border-b border-slate-200/50 px-4 py-2.5 dark:border-white/[0.07]">
              <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Target (Template)</h4>
            </div>
            <div ref={targetScrollRef} className="min-h-0 flex-1 overflow-y-auto p-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
                    {t("mapping.aiSuggest.placeholderCount").replace("{count}", String(placeholderList.length))}
                  </p>
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
                    {t("mapping.aiSuggest.matchedCount").replace("{count}", String(matchedCount))}
                  </p>
                </div>
                <label className="inline-flex items-center gap-2 rounded-lg border border-slate-200/80 bg-white/70 px-2.5 py-1.5 text-xs font-medium text-slate-700 dark:border-white/[0.07] dark:bg-white/[0.04] dark:text-slate-200">
                  <input
                    type="checkbox"
                    checked={showVietnameseAlias}
                    onChange={(e) => setShowVietnameseAlias(e.target.checked)}
                    className="h-3.5 w-3.5 rounded border-slate-300 text-violet-600 focus:ring-violet-500"
                  />
                  Alias Việt
                </label>
              </div>
              {placeholderList.length === 0 ? (
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {t("mapping.aiSuggest.err.noPlaceholders")}
                </p>
              ) : (
                <div className="space-y-2" key={`mapping-chips-${suggestionVersion}`}>
                  {rows.map((row, idx) => (
                    <MappingChip
                      key={row.placeholder}
                      placeholder={row.placeholder}
                      placeholderLabel={showVietnameseAlias ? row.placeholderLabel : row.placeholder}
                      mappedHeader={row.header}
                      variant={getChipVariant(row.placeholder, grouping)}
                      index={idx}
                      staggerDelay={0.04}
                      onHover={handleChipHover}
                    />
                  ))}
                </div>
              )}
              {grouping ? (
                <div className="rounded-lg border border-amber-200/80 bg-amber-50/60 px-3 py-2 text-xs font-medium text-amber-800">
                  {t("mapping.aiSuggest.groupingResult")
                    .replace("{groupKey}", grouping.groupKey)
                    .replace("{repeatKey}", grouping.repeatKey)}
                </div>
              ) : null}
            </div>
          </motion.div>
        </div>
      </div>

      {/* Review table — hiện sau khi user bấm "Chấp nhận gợi ý" */}
      {showReview && (
        <div className="border-t border-violet-200/50 px-4 py-3 dark:border-white/[0.07]">
          <AiSuggestReviewTable
            items={buildReviewItems(suggestion, fieldCatalog)}
            onConfirm={handleReviewConfirm}
            onCancel={() => setShowReview(false)}
          />
        </div>
      )}

      {/* Footer — hidden when review is showing */}
      {!showReview && (
        <div className="flex justify-end gap-2 border-t border-white/40 px-4 py-3 dark:border-white/[0.07]">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-zinc-200 bg-white/60 px-3 py-1.5 text-sm text-zinc-700 backdrop-blur-sm transition-colors hover:bg-white/80 dark:border-white/[0.08] dark:bg-white/[0.04] dark:text-slate-200 dark:hover:bg-white/[0.08]"
          >
            {t("mapping.changeGroup.cancel")}
          </button>
          <button
            type="button"
            onClick={acceptSuggestion}
            disabled={matchedCount === 0}
            className="rounded-lg bg-gradient-to-r from-violet-600 to-fuchsia-600 px-3 py-1.5 text-sm text-white shadow-sm shadow-violet-500/25 transition-colors hover:brightness-110 disabled:opacity-60"
          >
            {t("mapping.aiSuggest.accept")}
          </button>
        </div>
      )}
    </>
  );
}
