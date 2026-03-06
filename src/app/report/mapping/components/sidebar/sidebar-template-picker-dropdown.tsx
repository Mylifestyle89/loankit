"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Search, Library } from "lucide-react";
import type { FieldTemplateItem } from "../../types";

function formatRelativeTime(iso?: string): string {
  if (!iso) return "vừa xong";
  const ms = Date.now() - new Date(iso).getTime();
  if (Number.isNaN(ms) || ms < 0) return "vừa xong";
  const minute = 60_000;
  const hour = 60 * minute;
  const day = 24 * hour;
  if (ms < hour) return `${Math.max(1, Math.floor(ms / minute))} phút trước`;
  if (ms < day) return `${Math.floor(ms / hour)} giờ trước`;
  return `${Math.floor(ms / day)} ngày trước`;
}

type TemplatePickerDropdownProps = {
  open: boolean;
  query: string;
  onQueryChange: (q: string) => void;
  selectedCustomerId: string;
  selectedFieldTemplateId: string;
  filteredInstances: FieldTemplateItem[];
  filteredMasters: FieldTemplateItem[];
  isMappingValid: boolean;
  onSelect: (id: string) => void;
};

export function TemplatePickerDropdown({
  open,
  query,
  onQueryChange,
  selectedCustomerId,
  selectedFieldTemplateId,
  filteredInstances,
  filteredMasters,
  isMappingValid,
  onSelect,
}: TemplatePickerDropdownProps) {
  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          className="absolute z-20 mt-2 w-full overflow-hidden rounded-xl border border-slate-200 dark:border-white/[0.07] bg-white dark:bg-[#141414]/90 shadow-xl"
        >
          {/* Search input */}
          <div className="border-b border-slate-200 dark:border-white/[0.07] p-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
              <input
                value={query}
                onChange={(e) => onQueryChange(e.target.value)}
                placeholder="Tìm template..."
                className="h-9 w-full rounded-lg border border-slate-200 dark:border-white/[0.09] dark:bg-white/[0.05] dark:text-slate-100 pl-8 pr-2 text-sm focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-400/20 dark:focus:ring-violet-400/20"
              />
            </div>
          </div>

          <div className="max-h-72 overflow-y-auto p-2">
            {/* Customer instances */}
            {selectedCustomerId && filteredInstances.length > 0 ? (
              <div className="mb-2">
                <p className="px-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-violet-500">Hồ sơ hiện tại</p>
                {filteredInstances.map((tpl) => (
                  <button
                    key={tpl.id}
                    type="button"
                    onClick={() => onSelect(tpl.id)}
                    className={`mb-1 flex w-full items-start justify-between rounded-lg px-2 py-2 text-left transition-colors ${
                      selectedFieldTemplateId === tpl.id
                        ? "bg-violet-50 dark:bg-violet-500/10 text-violet-700 dark:text-violet-400"
                        : "hover:bg-slate-100/70 dark:hover:bg-white/[0.06] text-slate-700 dark:text-slate-200"
                    }`}
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium">{tpl.name}</span>
                      <span className="block truncate text-[11px] text-slate-500 dark:text-slate-400">
                        Cập nhật {formatRelativeTime(tpl.created_at)}
                      </span>
                    </span>
                    <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-emerald-50 dark:bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700 dark:text-emerald-400">
                      <span className={`h-1.5 w-1.5 rounded-full ${isMappingValid ? "bg-emerald-500" : "bg-amber-400"}`} />
                      {isMappingValid ? "Đã hoàn thiện" : "Đang soạn thảo"}
                    </span>
                  </button>
                ))}
              </div>
            ) : null}

            {/* Library masters */}
            <div>
              <p className="px-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Thư viện mẫu</p>
              {filteredMasters.length > 0 ? (
                filteredMasters.map((tpl) => (
                  <button
                    key={tpl.id}
                    type="button"
                    onClick={() => onSelect(tpl.id)}
                    className={`mb-1 flex w-full items-start justify-between rounded-lg px-2 py-2 text-left transition-colors ${
                      selectedFieldTemplateId === tpl.id
                        ? "bg-slate-100 dark:bg-white/[0.06] text-slate-800 dark:text-slate-200"
                        : "hover:bg-slate-100/70 dark:hover:bg-white/[0.06] text-slate-700 dark:text-slate-200"
                    }`}
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium">{tpl.name}</span>
                      <span className="block truncate text-[11px] text-slate-500 dark:text-slate-400">Mẫu chuẩn hệ thống</span>
                    </span>
                    <span className="ml-2 inline-flex items-center rounded-full bg-slate-100 dark:bg-white/[0.06] px-1.5 py-0.5 text-[10px] font-medium text-slate-600 dark:text-slate-300">
                      <Library className="mr-1 h-3 w-3" />Library
                    </span>
                  </button>
                ))
              ) : (
                <p className="rounded-lg border border-dashed border-slate-200 dark:border-white/[0.10] bg-slate-50 dark:bg-white/[0.04] px-3 py-2 text-xs text-slate-500 dark:text-slate-400">
                  Không tìm thấy template phù hợp.
                </p>
              )}
            </div>

            {selectedCustomerId && filteredInstances.length === 0 ? (
              <p className="mt-2 rounded-lg border border-violet-100 dark:border-violet-500/30 bg-violet-50 dark:bg-violet-500/10 px-3 py-2 text-xs text-violet-700 dark:text-violet-400">
                Chọn mẫu từ thư viện để bắt đầu tạo hồ sơ.
              </p>
            ) : null}
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
