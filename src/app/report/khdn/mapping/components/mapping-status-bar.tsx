import { useMemo } from "react";
import { Undo2 } from "lucide-react";
import { useLanguage } from "@/components/language-provider";
import { CoverageProgressBar } from "@/components/coverage-progress-bar";
import { computeFieldCoverage } from "@/lib/report/field-sync-utils";
import type { FieldCatalogItem } from "@/lib/report/config-schema";

type MappingStatusBarProps = {
  undoLastAction: () => void;
  undoHistoryLength: number;
  pendingOcrCount: number;
  ocrLogCount: number;
  onOpenOcrReview: () => void;
  fieldCount: number;
  mappedFieldCount: number;
  /** Field catalog + effective values for coverage indicator */
  fieldCatalog?: FieldCatalogItem[];
  effectiveValues?: Record<string, unknown>;
};

export function MappingStatusBar({
  undoLastAction,
  undoHistoryLength,
  pendingOcrCount,
  ocrLogCount,
  onOpenOcrReview,
  fieldCount,
  mappedFieldCount,
  fieldCatalog,
  effectiveValues,
}: MappingStatusBarProps) {
  const { t } = useLanguage();

  const coverage = useMemo(
    () => fieldCatalog && effectiveValues ? computeFieldCoverage(fieldCatalog, effectiveValues) : null,
    [fieldCatalog, effectiveValues],
  );

  return (
    <div className="sticky bottom-0 z-10 flex items-center justify-between border-t border-zinc-200 dark:border-white/[0.08] bg-white/80 dark:bg-[#141414]/90 px-4 py-2 backdrop-blur-sm text-xs">
      {/* Left: Undo */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={undoLastAction}
          disabled={undoHistoryLength === 0}
          className="inline-flex items-center gap-1.5 rounded-md border border-zinc-200 dark:border-white/[0.10] bg-white dark:bg-white/[0.05] px-2.5 py-1.5 font-medium text-zinc-700 dark:text-slate-200 transition-colors hover:bg-zinc-50 dark:hover:bg-white/[0.06] focus-visible:ring-2 focus-visible:ring-amber-500/40 disabled:opacity-40"
        >
          <Undo2 className="h-3.5 w-3.5" />
          {t("mapping.undo")} ({undoHistoryLength}/5)
        </button>
      </div>

      {/* Center: OCR status */}
      <div className="flex items-center gap-3">
        {pendingOcrCount > 0 ? (
          <button
            type="button"
            onClick={onOpenOcrReview}
            className="inline-flex items-center gap-1.5 rounded-full border border-amber-300 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/10 px-2.5 py-1 font-semibold text-amber-700 dark:text-amber-400 transition-colors hover:bg-amber-100 dark:hover:bg-amber-500/20"
          >
            {pendingOcrCount} chờ review
          </button>
        ) : (
          <span className="text-slate-500 dark:text-slate-400">
            OCR: {ocrLogCount} log
          </span>
        )}
      </div>

      {/* Right: Field coverage + count */}
      <div className="flex items-center gap-3 text-slate-600 dark:text-slate-300">
        {coverage && coverage.total > 0 && (
          <CoverageProgressBar filled={coverage.filled} total={coverage.total} />
        )}
        <span className="text-slate-400 dark:text-slate-500">|</span>
        <div className="flex items-center gap-1.5">
          <span className="font-semibold text-amber-600 dark:text-amber-400">{mappedFieldCount}</span>
          <span>/</span>
          <span>{fieldCount}</span>
          <span className="text-slate-500 dark:text-slate-400">mapped</span>
        </div>
      </div>
    </div>
  );
}
