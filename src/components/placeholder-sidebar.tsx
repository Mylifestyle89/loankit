"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { ChevronDown, ChevronRight, Copy, Check, Search, PanelRightClose, PanelRightOpen, GripVertical } from "lucide-react";

type FieldCatalogItem = {
  field_key: string;
  label_vi: string;
  group: string;
  type: string;
};

type Props = {
  fieldCatalog: FieldCatalogItem[];
};

const MIN_WIDTH = 200;
const MAX_WIDTH = 560;
const DEFAULT_WIDTH = 288; // w-72

export function PlaceholderSidebar({ fieldCatalog }: Props) {
  const [search, setSearch] = useState("");
  const [collapsed, setCollapsed] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [width, setWidth] = useState(DEFAULT_WIDTH);
  const [displayMode, setDisplayMode] = useState<"alias" | "technical">("alias");

  // Resize drag state
  const dragging = useRef(false);
  const startX = useRef(0);
  const startW = useRef(0);

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      dragging.current = true;
      startX.current = e.clientX;
      startW.current = width;
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    },
    [width],
  );

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragging.current) return;
    // Drag left = increase width (sidebar is on the right)
    const delta = startX.current - e.clientX;
    const next = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, startW.current + delta));
    setWidth(next);
  }, []);

  const onPointerUp = useCallback(() => {
    dragging.current = false;
  }, []);

  const fieldsByGroup = useMemo(() => {
    const q = search.toLowerCase().trim();
    const filtered = q
      ? fieldCatalog.filter(
        (f) =>
          f.field_key.toLowerCase().includes(q) ||
          f.label_vi.toLowerCase().includes(q) ||
          f.group.toLowerCase().includes(q),
      )
      : fieldCatalog;

    const groups: Record<string, FieldCatalogItem[]> = {};
    for (const f of filtered) {
      const g = f.group || "Khác";
      (groups[g] ??= []).push(f);
    }
    return groups;
  }, [fieldCatalog, search]);

  const groupNames = useMemo(
    () => Object.keys(fieldsByGroup).sort((a, b) => a.localeCompare(b, "vi")),
    [fieldsByGroup],
  );

  // Auto-expand all groups when searching
  const effectiveExpanded = search.trim()
    ? new Set(groupNames)
    : expandedGroups;

  function toggleGroup(group: string) {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(group)) next.delete(group);
      else next.add(group);
      return next;
    });
  }

  function expandAll() {
    setExpandedGroups(new Set(groupNames));
  }

  function copyPlaceholder(field: FieldCatalogItem) {
    // Copy value based on current mode: user-friendly alias or technical key.
    const tag = displayMode === "alias" ? (field.label_vi || field.field_key) : field.field_key;
    const placeholder = `[${tag}]`;

    const handleSuccess = () => {
      setCopiedKey(field.field_key);
      setTimeout(() => setCopiedKey(null), 1500);
    };

    const fallbackCopy = () => {
      const textArea = document.createElement("textarea");
      textArea.value = placeholder;
      // Tránh việc scroll đến textarea
      textArea.style.position = "fixed";
      textArea.style.top = "0";
      textArea.style.left = "0";
      textArea.style.width = "2em";
      textArea.style.height = "2em";
      textArea.style.padding = "0";
      textArea.style.border = "none";
      textArea.style.outline = "none";
      textArea.style.boxShadow = "none";
      textArea.style.background = "transparent";
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();

      try {
        const successful = document.execCommand('copy');
        if (successful) {
          handleSuccess();
        } else {
          console.error("Fallback copy command was unsuccessful");
        }
      } catch (err) {
        console.error("Fallback copy failed", err);
      } finally {
        document.body.removeChild(textArea);
      }
    };

    // Bỏ qua navigator.clipboard vì API này đang bị block bởi chính sách permissions policy của iframe/document
    // và có thể văng lỗi cứng (uncaught) trước khi vào block .catch.
    fallbackCopy();
  }

  if (collapsed) {
    return (
      <button
        type="button"
        onClick={() => setCollapsed(false)}
        title="Mở danh sách placeholder"
        className="flex h-full w-10 flex-col items-center justify-center border-l border-slate-200/70 bg-slate-50/80 text-slate-500 transition-colors hover:bg-orange-50 hover:text-orange-600 dark:border-white/[0.08] dark:bg-[#141414] dark:text-slate-400 dark:hover:bg-orange-500/10 dark:hover:text-orange-400"
      >
        <PanelRightOpen className="h-4 w-4" />
        <span className="mt-2 text-[10px] font-medium [writing-mode:vertical-rl]">Placeholder</span>
      </button>
    );
  }

  const totalFields = fieldCatalog.length;
  const filteredCount = Object.values(fieldsByGroup).reduce((s, arr) => s + arr.length, 0);

  return (
    <div className="relative flex h-full flex-col border-l border-slate-200/70 bg-white dark:border-white/[0.08] dark:bg-[#141414]" style={{ width }}>
      {/* Resize handle */}
      <div
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        className="absolute left-0 top-0 bottom-0 z-20 flex w-3 -translate-x-1/2 cursor-col-resize items-center justify-center opacity-0 transition-opacity hover:opacity-100"
      >
        <div className="flex h-8 w-4 items-center justify-center rounded-md bg-slate-200/90 shadow-sm dark:bg-white/[0.12]">
          <GripVertical className="h-3 w-3 text-slate-500 dark:text-slate-400" />
        </div>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-200/70 px-3 py-2 dark:border-white/[0.08]">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">Placeholder</p>
          <p className="text-[11px] text-slate-400 dark:text-slate-500">
            {search.trim() ? `${filteredCount}/${totalFields}` : `${totalFields}`} trường
          </p>
        </div>
        <button
          type="button"
          onClick={() => setCollapsed(true)}
          title="Thu gọn sidebar"
          className="rounded-md p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-white/[0.06] dark:hover:text-slate-300"
        >
          <PanelRightClose className="h-4 w-4" />
        </button>
      </div>

      {/* Search */}
      <div className="border-b border-slate-200/70 px-3 py-2 dark:border-white/[0.08]">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm placeholder..."
            className="h-8 w-full rounded-lg border border-slate-200 bg-slate-50/50 pl-8 pr-3 text-xs text-slate-700 placeholder:text-slate-400 focus:border-orange-400 focus:outline-none focus:ring-1 focus:ring-orange-400 dark:border-white/[0.09] dark:bg-white/[0.04] dark:text-slate-200 dark:placeholder:text-slate-500"
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between gap-1 border-b border-slate-200/70 px-3 py-1.5 dark:border-white/[0.08]">
        <div className="inline-flex items-center rounded-lg border border-slate-200 bg-slate-50/80 p-0.5 dark:border-white/[0.10] dark:bg-white/[0.04]">
          <button
            type="button"
            onClick={() => setDisplayMode("alias")}
            className={`rounded-md px-2 py-1 text-[11px] font-medium transition-colors ${displayMode === "alias"
                ? "bg-orange-600 text-white"
                : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/[0.08]"
              }`}
          >
            Alias
          </button>
          <button
            type="button"
            onClick={() => setDisplayMode("technical")}
            className={`rounded-md px-2 py-1 text-[11px] font-medium transition-colors ${displayMode === "technical"
                ? "bg-orange-600 text-white"
                : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/[0.08]"
              }`}
          >
            Mã kỹ thuật
          </button>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={expandAll}
            className="rounded px-2 py-0.5 text-[11px] font-medium text-orange-600 transition-colors hover:bg-orange-50 dark:text-orange-400 dark:hover:bg-orange-500/10"
          >
            Mở tất cả
          </button>
          <button
            type="button"
            onClick={() => setExpandedGroups(new Set())}
            className="rounded px-2 py-0.5 text-[11px] font-medium text-slate-500 transition-colors hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-white/[0.06]"
          >
            Thu gọn
          </button>
        </div>
      </div>

      {/* Field list */}
      <div className="flex-1 overflow-y-auto">
        {groupNames.length === 0 && (
          <p className="px-3 py-6 text-center text-xs text-slate-400 dark:text-slate-500">
            {search.trim() ? "Không tìm thấy placeholder phù hợp." : "Chưa có field template."}
          </p>
        )}

        {groupNames.map((group) => {
          const fields = fieldsByGroup[group];
          const isExpanded = effectiveExpanded.has(group);

          return (
            <div key={group} className="border-b border-slate-100 last:border-0 dark:border-white/[0.04]">
              <button
                type="button"
                onClick={() => toggleGroup(group)}
                className="flex w-full items-center gap-1.5 px-3 py-2 text-left text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-white/[0.04]"
              >
                {isExpanded ? (
                  <ChevronDown className="h-3.5 w-3.5 flex-shrink-0 text-slate-400" />
                ) : (
                  <ChevronRight className="h-3.5 w-3.5 flex-shrink-0 text-slate-400" />
                )}
                <span className="flex-1 truncate">{group}</span>
                <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-500 dark:bg-white/[0.06] dark:text-slate-400">
                  {fields.length}
                </span>
              </button>

              {isExpanded && (
                <div className="pb-1">
                  {fields.map((field) => {
                    const isCopied = copiedKey === field.field_key;
                    const placeholderTag =
                      displayMode === "alias" ? (field.label_vi || field.field_key) : field.field_key;
                    const subline =
                      displayMode === "alias" ? field.field_key : (field.label_vi || field.field_key);
                    return (
                      <button
                        key={field.field_key}
                        type="button"
                        onClick={() => copyPlaceholder(field)}
                        title={`Copy [${placeholderTag}]`}
                        className="group flex w-full items-center gap-2 px-3 py-1.5 text-left transition-colors hover:bg-orange-50/60 dark:hover:bg-orange-500/10"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs font-medium text-slate-700 dark:text-slate-200">
                            [{placeholderTag}]
                          </p>
                          <p className="truncate text-[10px] text-slate-400 dark:text-slate-500">
                            {subline}
                          </p>
                        </div>
                        <span className="flex-shrink-0">
                          {isCopied ? (
                            <Check className="h-3.5 w-3.5 text-emerald-500" />
                          ) : (
                            <Copy className="h-3.5 w-3.5 text-slate-300 transition-colors group-hover:text-orange-500 dark:text-slate-600 dark:group-hover:text-orange-400" />
                          )}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer hint */}
      <div className="border-t border-slate-200/70 px-3 py-2 dark:border-white/[0.08]">
        <p className="text-[10px] leading-relaxed text-slate-400 dark:text-slate-500">
          Click để copy placeholder, sau đó paste (Ctrl+V) vào vị trí mong muốn trong trình soạn thảo.
        </p>
      </div>
    </div>
  );
}
