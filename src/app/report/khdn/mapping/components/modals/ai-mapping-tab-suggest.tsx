"use client";

// Suggest tab for AiMappingModal — AI header-to-placeholder mapping with two-panel canvas view

import { type RefObject, useMemo } from "react";
import { motion } from "framer-motion";
import { MappingCanvas, type MappingLink } from "../mapping-canvas";
import { MappingChip } from "./ai-mapping-chip";
import { getChipVariant } from "./ai-mapping-modal-utils";
import { AiSuggestReviewTable, buildReviewItems, type SuggestReviewItem } from "./ai-suggest-review-table";
import { SuggestForm } from "./ai-mapping-suggest-form";
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
  // Pre-compute mapped headers for O(1) lookup
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
            <SuggestForm
              sourceScrollRef={sourceScrollRef}
              headersRaw={headersRaw}
              setHeadersRaw={setHeadersRaw}
              parsedHeaders={parsedHeaders}
              includeGrouping={includeGrouping}
              setIncludeGrouping={setIncludeGrouping}
              loading={loading}
              error={error}
              hoveredKey={hoveredKey}
              setHoveredKey={setHoveredKey}
              docxParsing={docxParsing}
              docxFileName={docxFileName}
              docxFields={docxFields}
              handleDocxTemplateFile={handleDocxTemplateFile}
              runSuggestion={runSuggestion}
              t={t}
              mappedHeadersSet={mappedHeadersSet}
            />
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
                    className="h-3.5 w-3.5 rounded border-slate-300 text-brand-500 focus:ring-brand-500"
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
                <div className="rounded-lg border border-brand-200/80 bg-brand-50/60 px-3 py-2 text-xs font-medium text-brand-700">
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
        <div className="border-t border-brand-200/50 px-4 py-3 dark:border-white/[0.07]">
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
            className="rounded-lg bg-brand-500 px-3 py-1.5 text-sm text-white shadow-sm shadow-brand-500/25 transition-colors hover:brightness-110 disabled:opacity-60"
          >
            {t("mapping.aiSuggest.accept")}
          </button>
        </div>
      )}
    </>
  );
}
