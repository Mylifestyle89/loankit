"use client";

import { useState } from "react";
import { ListPlus, Plus, Trash2 } from "lucide-react";
import { useDropdownOptions } from "@/lib/hooks/use-dropdown-options";
import { useDropdownContext } from "@/lib/hooks/dropdown-options-context";

/**
 * Smart field: auto-renders as <select> when dropdown options exist for fieldKey,
 * or as plain <input> when none exist. Users can add options on the fly via [+].
 *
 * Supports two modes:
 * - Standalone: fetches its own options via useDropdownOptions(fieldKey)
 * - Batched: reads from DropdownOptionsProvider context (1 API call per section)
 */
export function SmartField({
  fieldKey,
  value,
  onChange,
  className = "",
  placeholder,
}: {
  fieldKey: string;
  value: string;
  onChange: (val: string) => void;
  className?: string;
  placeholder?: string;
}) {
  // Try batch context first, fallback to individual fetch
  const ctx = useDropdownContext();
  const standalone = useDropdownOptions(ctx ? "" : fieldKey); // skip fetch when context exists
  const items = ctx ? ctx.getOptions(fieldKey) : standalone.items;
  const loading = ctx ? ctx.loading : standalone.loading;

  const [showManager, setShowManager] = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const [adding, setAdding] = useState(false);

  const hasOptions = items.length > 0;

  async function handleAdd() {
    const trimmed = newLabel.trim();
    if (!trimmed) return;
    setAdding(true);
    if (ctx) {
      await ctx.addOption(fieldKey, trimmed);
    } else {
      await standalone.addOption(trimmed);
    }
    setNewLabel("");
    setAdding(false);
  }

  async function handleDelete(id: string) {
    if (ctx) {
      await ctx.deleteOption(id, fieldKey);
    } else {
      await standalone.deleteOption(id);
    }
  }

  return (
    <div className="relative group/smart">
      <div className="flex items-center gap-1">
        {/* Auto-switch: select when options exist, input when not */}
        {hasOptions ? (
          <select
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className={className}
            disabled={loading}
          >
            <option value="">{placeholder ?? "-- Chọn --"}</option>
            {items.map((opt) => (
              <option key={opt.id} value={opt.label}>{opt.label}</option>
            ))}
          </select>
        ) : (
          <input
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className={className}
            placeholder={placeholder}
            disabled={loading}
          />
        )}

        {/* Toggle manager button — always visible when has options, hover-only otherwise */}
        <button
          type="button"
          onClick={() => setShowManager(!showManager)}
          className={`shrink-0 p-1.5 rounded-md hover:bg-zinc-100 dark:hover:bg-white/[0.06] transition-all ${
            hasOptions ? "" : "opacity-0 group-hover/smart:opacity-100"
          }`}
          title={hasOptions ? "Quản lý danh sách" : "Tạo danh sách chọn nhanh"}
        >
          {hasOptions
            ? <ListPlus className="h-3.5 w-3.5 text-violet-500" />
            : <Plus className="h-3.5 w-3.5 text-zinc-400" />}
        </button>
      </div>

      {/* Inline options manager popover */}
      {showManager && (
        <div className="absolute z-50 top-full mt-1 right-0 w-64 rounded-xl border border-zinc-200 dark:border-white/[0.08] bg-white dark:bg-[#1a1a1a] shadow-lg p-3 space-y-2">
          <p className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">
            {hasOptions ? "Quản lý danh sách" : "Tạo danh sách chọn nhanh"}
          </p>

          {/* Existing options */}
          {hasOptions && (
            <ul className="space-y-1 max-h-40 overflow-y-auto">
              {items.map((opt) => (
                <li key={opt.id} className="flex items-center justify-between group px-2 py-1 rounded-md hover:bg-zinc-50 dark:hover:bg-white/[0.04]">
                  <span className="text-xs text-zinc-700 dark:text-zinc-300">{opt.label}</span>
                  <button
                    type="button"
                    onClick={() => handleDelete(opt.id)}
                    className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-red-50 dark:hover:bg-red-500/10 transition-all"
                  >
                    <Trash2 className="h-3 w-3 text-red-400" />
                  </button>
                </li>
              ))}
            </ul>
          )}

          {!hasOptions && (
            <p className="text-xs text-zinc-400 dark:text-zinc-500 px-1">
              Thêm options để chuyển field này thành dropdown
            </p>
          )}

          {/* Add new */}
          <div className="flex gap-1.5">
            <input
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAdd()}
              placeholder="Thêm mới..."
              className="flex-1 rounded-md border border-zinc-200 dark:border-white/[0.10] bg-white dark:bg-white/[0.04] px-2 py-1 text-xs outline-none focus:ring-1 focus:ring-violet-500/40"
            />
            <button
              type="button"
              onClick={handleAdd}
              disabled={adding || !newLabel.trim()}
              className="rounded-md bg-violet-600 px-2 py-1 text-xs font-medium text-white disabled:opacity-40 hover:brightness-110 transition-all"
            >
              {adding ? "..." : "Thêm"}
            </button>
          </div>

          <button
            type="button"
            onClick={() => setShowManager(false)}
            className="w-full text-center text-[11px] text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 pt-1"
          >
            Đóng
          </button>
        </div>
      )}
    </div>
  );
}
