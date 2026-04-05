"use client";

import { useCallback, useMemo, useState } from "react";
import { ChevronDown, ChevronRight, ClipboardCopy, Check, Search } from "lucide-react";
import { KHCN_PLACEHOLDER_GROUPS } from "@/lib/report/khcn-placeholder-registry";

/**
 * Collapsible panel showing all KHCN template placeholders.
 * Click any placeholder to copy [placeholder] to clipboard.
 */
export function KhcnPlaceholderPanel() {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [copied, setCopied] = useState<string | null>(null);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  const filtered = useMemo(() => {
    if (!search.trim()) return KHCN_PLACEHOLDER_GROUPS;
    const q = search.toLowerCase();
    return KHCN_PLACEHOLDER_GROUPS
      .map((g) => ({
        ...g,
        items: g.items.filter((item) => item.toLowerCase().includes(q)),
      }))
      .filter((g) => g.items.length > 0);
  }, [search]);

  const totalCount = useMemo(
    () => KHCN_PLACEHOLDER_GROUPS.reduce((s, g) => s + g.items.length, 0),
    [],
  );

  const copyToClipboard = useCallback((placeholder: string) => {
    const text = `[${placeholder}]`;
    // Use execCommand fallback for iframe/embedded contexts
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(text).catch(() => {
        execCopyFallback(text);
      });
    } else {
      execCopyFallback(text);
    }
    setCopied(placeholder);
    setTimeout(() => setCopied(null), 1500);
  }, []);

  const toggleGroup = useCallback((label: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(label)) next.delete(label);
      else next.add(label);
      return next;
    });
  }, []);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 rounded-lg border border-dashed border-amber-300 dark:border-amber-500/30 px-3 py-2 text-xs font-medium text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-500/10 transition-colors"
      >
        <ClipboardCopy className="h-3.5 w-3.5" />
        Danh sách placeholder ({totalCount})
      </button>
    );
  }

  return (
    <div className="rounded-xl border border-amber-200 dark:border-amber-500/20 bg-amber-50/50 dark:bg-amber-950/20 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-amber-100/50 dark:bg-amber-900/20 border-b border-amber-200 dark:border-amber-500/15">
        <span className="text-xs font-semibold text-amber-700 dark:text-amber-300">
          Placeholder tham chiếu ({totalCount})
        </span>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-xs text-amber-500 hover:text-amber-700 dark:hover:text-amber-300 transition-colors"
        >
          Thu gọn
        </button>
      </div>

      {/* Search */}
      <div className="px-3 py-2 border-b border-amber-200/50 dark:border-amber-500/10">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-amber-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm placeholder..."
            className="w-full rounded-md border border-amber-200 dark:border-amber-500/20 bg-white dark:bg-[#1a1a1a] pl-8 pr-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-amber-400"
          />
        </div>
      </div>

      {/* Groups */}
      <div className="max-h-80 overflow-y-auto divide-y divide-amber-100 dark:divide-amber-500/10">
        {filtered.map((group) => {
          const isExpanded = expandedGroups.has(group.label) || search.trim().length > 0;
          return (
            <div key={group.label}>
              <button
                type="button"
                onClick={() => toggleGroup(group.label)}
                className="flex w-full items-center gap-2 px-3 py-2 text-xs font-medium text-amber-700 dark:text-amber-300 hover:bg-amber-100/50 dark:hover:bg-amber-500/10 transition-colors"
              >
                {isExpanded
                  ? <ChevronDown className="h-3 w-3 shrink-0" />
                  : <ChevronRight className="h-3 w-3 shrink-0" />}
                <span className="flex-1 text-left">{group.label}</span>
                <span className="text-amber-400 text-[10px]">{group.items.length}</span>
              </button>
              {isExpanded && (
                <div className="flex flex-wrap gap-1.5 px-3 pb-2.5">
                  {group.items.map((item) => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => copyToClipboard(item)}
                      title={`Copy [${item}]`}
                      className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[11px] font-mono transition-all duration-150 ${
                        copied === item
                          ? "border-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                          : "border-amber-200 dark:border-amber-500/20 bg-white dark:bg-[#1a1a1a] text-zinc-700 dark:text-zinc-300 hover:border-amber-400 hover:bg-amber-50 dark:hover:bg-amber-500/10 cursor-pointer"
                      }`}
                    >
                      {copied === item
                        ? <Check className="h-3 w-3" />
                        : <ClipboardCopy className="h-2.5 w-2.5 opacity-40" />}
                      {item}
                    </button>
                  ))}
                  {group.loop && (
                    <span className="text-[10px] text-amber-400 self-center ml-1">
                      (loop: {group.loop})
                    </span>
                  )}
                </div>
              )}
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div className="px-3 py-4 text-xs text-zinc-400 text-center">Không tìm thấy</div>
        )}
      </div>
    </div>
  );
}

/** Fallback copy using deprecated execCommand for iframe contexts */
function execCopyFallback(text: string) {
  const ta = document.createElement("textarea");
  ta.value = text;
  ta.style.position = "fixed";
  ta.style.left = "-9999px";
  document.body.appendChild(ta);
  ta.select();
  document.execCommand("copy");
  document.body.removeChild(ta);
}
