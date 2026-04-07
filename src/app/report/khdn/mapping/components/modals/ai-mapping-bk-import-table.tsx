"use client";

// BK Import grouped field table — renders collapsible group sections with per-field checkboxes

import { motion } from "framer-motion";
import { ChevronDown, ChevronRight, ArrowRight } from "lucide-react";
import { translateFieldLabelVi } from "@/lib/report/field-labels";

type BkImportTableProps = {
  bkGroupedValues: Record<string, Array<{ key: string; value: string }>>;
  bkAccepted: Record<string, boolean>;
  setBkAccepted: (v: Record<string, boolean> | ((prev: Record<string, boolean>) => Record<string, boolean>)) => void;
  bkExpandedGroups: Record<string, boolean>;
  setBkExpandedGroups: (v: Record<string, boolean> | ((prev: Record<string, boolean>) => Record<string, boolean>)) => void;
  bkSelectedCount: number;
  bkTotalCount: number;
  bkResult: { values: Record<string, unknown>; metadata?: { sourceFile?: string } } | null;
};

export function BkImportTable({
  bkGroupedValues,
  bkAccepted,
  setBkAccepted,
  bkExpandedGroups,
  setBkExpandedGroups,
  bkSelectedCount,
  bkTotalCount,
  bkResult,
}: BkImportTableProps) {
  if (!bkResult || Object.keys(bkGroupedValues).length === 0) return null;

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
      {/* Summary bar */}
      <div className="flex items-center justify-between rounded-lg bg-slate-50/80 px-3 py-2 dark:bg-white/[0.04]">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
            {bkResult.metadata?.sourceFile}
          </span>
          <span className="text-[11px] text-slate-500 dark:text-slate-400">
            &mdash; {bkSelectedCount}/{bkTotalCount} trường đã chọn
          </span>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => {
              const next: Record<string, boolean> = {};
              for (const key of Object.keys(bkResult.values)) next[key] = true;
              setBkAccepted(next);
            }}
            className="text-[11px] font-medium text-brand-500 hover:underline dark:text-brand-400"
          >
            Chọn tất cả
          </button>
          <button
            type="button"
            onClick={() => {
              const next: Record<string, boolean> = {};
              for (const key of Object.keys(bkResult.values)) next[key] = false;
              setBkAccepted(next);
            }}
            className="text-[11px] font-medium text-slate-500 hover:underline dark:text-slate-400"
          >
            Bỏ chọn
          </button>
        </div>
      </div>

      {/* Grouped field list */}
      <div className="space-y-1.5">
        {Object.entries(bkGroupedValues).map(([groupKey, fields]) => {
          const isExpanded = bkExpandedGroups[groupKey] ?? false;
          const groupSelected = fields.filter((f) => bkAccepted[f.key]).length;
          const groupLabel =
            translateFieldLabelVi(groupKey) !== groupKey ? translateFieldLabelVi(groupKey) : groupKey;

          return (
            <div
              key={groupKey}
              className="rounded-lg border border-slate-200/60 bg-white/50 dark:border-white/[0.07] dark:bg-white/[0.03]"
            >
              {/* Group header */}
              <div className="flex w-full items-center gap-2 px-3 py-2 transition-colors hover:bg-slate-50/80 dark:hover:bg-white/[0.04]">
                <button
                  type="button"
                  onClick={() =>
                    setBkExpandedGroups((prev) => ({ ...prev, [groupKey]: !isExpanded }))
                  }
                  className="flex flex-1 items-center gap-2 text-left"
                >
                  {isExpanded
                    ? <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
                    : <ChevronRight className="h-3.5 w-3.5 text-slate-400" />}
                  <span className="flex-1 text-xs font-semibold text-slate-700 dark:text-slate-200">
                    {groupLabel}
                  </span>
                  <span className="rounded-full bg-brand-100/80 px-2 py-0.5 text-[10px] font-medium text-brand-600 dark:bg-brand-500/15 dark:text-brand-400">
                    {groupSelected}/{fields.length}
                  </span>
                </button>
                <input
                  type="checkbox"
                  aria-label={`Chọn tất cả ${groupLabel}`}
                  checked={groupSelected === fields.length}
                  onChange={(ev) => {
                    const checked = ev.target.checked;
                    setBkAccepted((prev) => {
                      const next = { ...prev };
                      for (const f of fields) next[f.key] = checked;
                      return next;
                    });
                  }}
                  className="h-3.5 w-3.5 rounded border-slate-300 text-brand-500 focus:ring-brand-500"
                />
              </div>

              {/* Group fields */}
              {isExpanded && (
                <div className="border-t border-slate-100/80 dark:border-white/[0.05]">
                  {fields.map((field, idx) => {
                    const label = translateFieldLabelVi(field.key);
                    const truncValue =
                      field.value.length > 60 ? field.value.slice(0, 60) + "..." : field.value;
                    return (
                      <motion.label
                        key={field.key}
                        initial={{ opacity: 0, x: -6 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.02 }}
                        className={`flex cursor-pointer items-start gap-2.5 border-b border-slate-100/60 px-3 py-2 last:border-b-0 transition-colors dark:border-white/[0.04] ${
                          bkAccepted[field.key]
                            ? "bg-brand-50/30 dark:bg-brand-500/5"
                            : "bg-transparent hover:bg-slate-50/50 dark:hover:bg-white/[0.02]"
                        }`}
                      >
                        <input
                          type="checkbox"
                          aria-label={label}
                          checked={bkAccepted[field.key] ?? false}
                          onChange={() =>
                            setBkAccepted((prev) => ({ ...prev, [field.key]: !prev[field.key] }))
                          }
                          className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 rounded border-slate-300 text-brand-500 focus:ring-brand-500"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span
                              className="text-xs font-medium text-slate-700 dark:text-slate-200"
                              title={field.key}
                            >
                              {label}
                            </span>
                            <ArrowRight className="h-3 w-3 flex-shrink-0 text-slate-300 dark:text-slate-600" />
                            <span
                              className="min-w-0 truncate rounded bg-slate-100/80 px-1.5 py-0.5 text-[11px] font-mono text-slate-600 dark:bg-white/[0.06] dark:text-slate-300"
                              title={field.key}
                            >
                              {field.key.split(".").pop()}
                            </span>
                          </div>
                          <p
                            className="mt-0.5 truncate text-[11px] text-slate-500 dark:text-slate-400"
                            title={field.value}
                          >
                            {truncValue}
                          </p>
                        </div>
                      </motion.label>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}
