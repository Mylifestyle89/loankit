"use client";

// ─── AiResultRow sub-component (memoized) ────────────────────────────────────
// Memoized để tránh re-render toàn bộ list khi user gõ 1 field

import { memo } from "react";
import { RotateCcw } from "lucide-react";

export const AiResultRow = memo(function AiResultRow({
  fieldKey,
  label,
  value,
  originalValue,
  onChange,
}: {
  fieldKey: string;
  label: string;
  value: string;
  originalValue: string;
  onChange: (key: string, val: string) => void;
}) {
  const isDirty = value !== originalValue;
  return (
    <div className="space-y-1.5 rounded-lg border border-slate-200 dark:border-white/[0.07] p-3">
      <div className="flex items-start justify-between gap-2">
        <label className="text-xs font-semibold text-slate-700 dark:text-slate-200">
          {label}
          <span className="ml-2 font-mono font-normal text-slate-400 dark:text-slate-500">
            [{fieldKey}]
          </span>
        </label>
        {isDirty && (
          <button
            type="button"
            onClick={() => onChange(fieldKey, originalValue)}
            title="Khôi phục giá trị AI gốc"
            className="flex-shrink-0 rounded p-1 text-slate-400 dark:text-slate-500 hover:text-orange-600 dark:hover:text-orange-400 hover:bg-slate-100 dark:hover:bg-white/[0.07] transition-colors"
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
      <textarea
        value={value}
        onChange={(e) => onChange(fieldKey, e.target.value)}
        rows={3}
        className="w-full resize-y rounded-lg border border-slate-200 dark:border-white/[0.09] bg-white dark:bg-white/[0.05] px-3 py-2 text-sm text-slate-800 dark:text-slate-100 focus:border-emerald-400 focus:outline-none focus:ring-1 focus:ring-emerald-400/30"
      />
      {isDirty && (
        <p className="text-[10px] text-amber-500 dark:text-amber-400">
          ● Đã chỉnh sửa
        </p>
      )}
    </div>
  );
});
