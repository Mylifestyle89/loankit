"use client";

import { useMemo, useState, useCallback } from "react";
import { Check, ChevronDown, ChevronRight, Pencil } from "lucide-react";
import type { FieldCatalogItem } from "@/lib/report/config-schema";

/** Một field đã được AI match */
export type SuggestReviewItem = {
  fieldKey: string;       // wordPlaceholder (field_key)
  excelHeader: string;    // matched excel header
  labelVi: string;        // label tiếng Việt
  group: string;          // auto-detected group
  type: FieldCatalogItem["type"];
};

type Props = {
  items: SuggestReviewItem[];
  onConfirm: (selected: SuggestReviewItem[], groupLabels: Record<string, string>) => void;
  onCancel: () => void;
};

/** Phân tích tiền tố từ field key để tự động nhóm group */
function detectGroup(fieldKey: string): string {
  // Dạng A.general.xxx → group = A.general
  const parts = fieldKey.split(".");
  if (parts.length >= 2) return `${parts[0]}.${parts[1]}`;
  return parts[0] || "other";
}

/** Nhãn mặc định cho các group phổ biến */
const DEFAULT_GROUP_LABELS: Record<string, string> = {
  "A.general": "Thông tin chung",
  "A.credit": "Thông tin tín dụng",
  "A.proposal": "Đề xuất vay vốn",
  "A.management": "Quản trị điều hành",
  "A.economic_docs": "Hồ sơ kinh tế",
  "A.collateral": "Tài sản bảo đảm",
  "B.financial": "Phân tích tài chính",
  "B.plan": "Kế hoạch hạn mức",
  "B.risk": "Đánh giá rủi ro",
  HDTD: "Hợp đồng tín dụng",
  "SĐ": "Quyền sử dụng đất",
  TS: "Tài sản",
  KH: "Khách hàng",
};

const inputCls =
  "w-full rounded border border-slate-200 bg-white/80 px-2 py-1 text-xs outline-none focus:border-violet-400 dark:border-white/10 dark:bg-white/5 dark:text-slate-200";

export function AiSuggestReviewTable({ items, onConfirm, onCancel }: Props) {
  // Check/uncheck mỗi field
  const [checked, setChecked] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    for (const item of items) init[item.fieldKey] = true;
    return init;
  });

  // Expand/collapse group
  const [expanded, setExpanded] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    for (const item of items) init[item.group] = true;
    return init;
  });

  // Cho user đổi tên group
  const [groupLabels, setGroupLabels] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    for (const item of items) {
      if (!init[item.group]) {
        init[item.group] = DEFAULT_GROUP_LABELS[item.group] || item.group;
      }
    }
    return init;
  });

  // Group đang edit tên
  const [editingGroup, setEditingGroup] = useState<string | null>(null);

  // Nhóm items theo group
  const grouped = useMemo(() => {
    const map: Record<string, SuggestReviewItem[]> = {};
    for (const item of items) {
      if (!map[item.group]) map[item.group] = [];
      map[item.group].push(item);
    }
    return map;
  }, [items]);

  const groupKeys = useMemo(() => Object.keys(grouped), [grouped]);

  const selectedCount = useMemo(
    () => Object.values(checked).filter(Boolean).length,
    [checked],
  );

  const toggleField = useCallback((key: string) => {
    setChecked((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const toggleGroup = useCallback(
    (groupKey: string) => {
      const groupItems = grouped[groupKey] ?? [];
      const allChecked = groupItems.every((i) => checked[i.fieldKey]);
      setChecked((prev) => {
        const next = { ...prev };
        for (const item of groupItems) next[item.fieldKey] = !allChecked;
        return next;
      });
    },
    [grouped, checked],
  );

  const toggleExpand = useCallback((groupKey: string) => {
    setExpanded((prev) => ({ ...prev, [groupKey]: !prev[groupKey] }));
  }, []);

  const handleConfirm = useCallback(() => {
    const selected = items.filter((i) => checked[i.fieldKey]);
    if (selected.length === 0) return;
    onConfirm(selected, groupLabels);
  }, [items, checked, groupLabels, onConfirm]);

  return (
    <div className="flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Đã tìm thấy <span className="font-semibold text-violet-600">{items.length}</span> trường
          phù hợp. Chọn trường cần áp dụng vào field template:
        </p>
        <div className="flex gap-1.5">
          <button
            className="rounded px-2 py-1 text-xs text-slate-500 hover:bg-slate-100 dark:hover:bg-white/5"
            onClick={() => {
              const next: Record<string, boolean> = {};
              for (const i of items) next[i.fieldKey] = true;
              setChecked(next);
            }}
          >
            Chọn tất cả
          </button>
          <button
            className="rounded px-2 py-1 text-xs text-slate-500 hover:bg-slate-100 dark:hover:bg-white/5"
            onClick={() => {
              const next: Record<string, boolean> = {};
              for (const i of items) next[i.fieldKey] = false;
              setChecked(next);
            }}
          >
            Bỏ chọn
          </button>
        </div>
      </div>

      {/* Grouped checklist */}
      <div className="max-h-[50vh] overflow-y-auto rounded-lg border border-slate-200/50 dark:border-white/10">
        {groupKeys.map((groupKey) => {
          const groupItems = grouped[groupKey];
          const groupCheckedCount = groupItems.filter((i) => checked[i.fieldKey]).length;
          const allGroupChecked = groupCheckedCount === groupItems.length;
          const isExpanded = expanded[groupKey] ?? true;

          return (
            <div key={groupKey} className="border-b border-slate-100 last:border-b-0 dark:border-white/5">
              {/* Group header */}
              <div className="flex items-center gap-2 bg-slate-50/80 px-3 py-2 dark:bg-white/[0.03]">
                <button onClick={() => toggleExpand(groupKey)} className="text-slate-400">
                  {isExpanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                </button>
                <input
                  type="checkbox"
                  checked={allGroupChecked}
                  onChange={() => toggleGroup(groupKey)}
                  className="h-3.5 w-3.5 accent-violet-500"
                />
                {editingGroup === groupKey ? (
                  <input
                    className={inputCls + " max-w-[200px]"}
                    value={groupLabels[groupKey] ?? groupKey}
                    autoFocus
                    onChange={(e) =>
                      setGroupLabels((prev) => ({ ...prev, [groupKey]: e.target.value }))
                    }
                    onBlur={() => setEditingGroup(null)}
                    onKeyDown={(e) => e.key === "Enter" && setEditingGroup(null)}
                  />
                ) : (
                  <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                    {groupLabels[groupKey] ?? groupKey}
                  </span>
                )}
                <button
                  onClick={() => setEditingGroup(editingGroup === groupKey ? null : groupKey)}
                  className="text-slate-400 hover:text-violet-500"
                  title="Đổi tên nhóm"
                >
                  <Pencil className="h-3 w-3" />
                </button>
                <span className="ml-auto text-[10px] text-slate-400">
                  {groupCheckedCount}/{groupItems.length}
                </span>
              </div>

              {/* Field rows */}
              {isExpanded && (
                <div className="divide-y divide-slate-50 dark:divide-white/[0.03]">
                  {groupItems.map((item) => (
                    <label
                      key={item.fieldKey}
                      className="flex cursor-pointer items-center gap-3 px-4 py-1.5 hover:bg-violet-50/40 dark:hover:bg-violet-500/5"
                    >
                      <input
                        type="checkbox"
                        checked={checked[item.fieldKey] ?? false}
                        onChange={() => toggleField(item.fieldKey)}
                        className="h-3.5 w-3.5 accent-violet-500"
                      />
                      <div className="min-w-0 flex-1">
                        <span className="text-xs text-slate-700 dark:text-slate-300">
                          {item.labelVi}
                        </span>
                        <span className="ml-2 text-[10px] text-slate-400">{item.fieldKey}</span>
                      </div>
                      <span className="shrink-0 rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400">
                        ← {item.excelHeader}
                      </span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between">
        <span className="text-xs text-slate-500">
          {selectedCount} / {items.length} trường được chọn
        </span>
        <div className="flex gap-2">
          <button
            onClick={onCancel}
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-50 dark:border-white/10 dark:text-slate-400 dark:hover:bg-white/5"
          >
            Quay lại
          </button>
          <button
            onClick={handleConfirm}
            disabled={selectedCount === 0}
            className="flex items-center gap-1.5 rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-medium text-white shadow-sm hover:bg-violet-700 disabled:opacity-40"
          >
            <Check className="h-3.5 w-3.5" />
            Áp dụng {selectedCount} trường
          </button>
        </div>
      </div>
    </div>
  );
}

/** Utility: tạo SuggestReviewItem[] từ AI suggestion result */
export function buildReviewItems(
  suggestion: Record<string, string>,
  fieldCatalog: FieldCatalogItem[],
): SuggestReviewItem[] {
  const catalogMap = new Map(fieldCatalog.map((f) => [f.field_key, f]));

  return Object.entries(suggestion).map(([fieldKey, excelHeader]) => {
    const existing = catalogMap.get(fieldKey);
    return {
      fieldKey,
      excelHeader,
      labelVi: existing?.label_vi ?? fieldKey,
      group: existing?.group ?? detectGroup(fieldKey),
      type: existing?.type ?? "text",
    };
  });
}
