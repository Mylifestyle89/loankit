"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Search, Plus, Settings, Link, X } from "lucide-react";
import { useFieldTemplateStore } from "../../stores/use-field-template-store";
import { useCustomerStore } from "../../stores/use-customer-store";

type TemplatePickerModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (templateId: string) => void;
  onCreateNew: () => void;
  onEditTemplate: () => void;
  onAttachTemplate: () => void;
};

export function TemplatePickerModal({
  isOpen,
  onClose,
  onSelect,
  onCreateNew,
  onEditTemplate,
  onAttachTemplate,
}: TemplatePickerModalProps) {
  const { fieldTemplates, allFieldTemplates, selectedFieldTemplateId } = useFieldTemplateStore();
  const selectedCustomerId = useCustomerStore((s) => s.selectedCustomerId);
  const [query, setQuery] = useState("");
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);

  useEffect(() => { setPortalTarget(document.body); }, []);

  useEffect(() => {
    if (isOpen) setQuery("");
  }, [isOpen]);

  // Escape to close
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isOpen, onClose]);

  const normalizedQuery = query.trim().toLowerCase();

  const filteredCustomer = useMemo(
    () => fieldTemplates.filter((t) => !normalizedQuery || t.name.toLowerCase().includes(normalizedQuery)),
    [fieldTemplates, normalizedQuery],
  );

  const filteredMaster = useMemo(
    () => allFieldTemplates.filter((t) => !normalizedQuery || t.name.toLowerCase().includes(normalizedQuery)),
    [allFieldTemplates, normalizedQuery],
  );

  if (!isOpen || !portalTarget) return null;

  const hasCustomer = !!selectedCustomerId;

  return createPortal(
    <AnimatePresence>
      {/* Backdrop */}
      <motion.div
        key="backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 z-[110] bg-black/20 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <motion.div
        key="modal"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 z-[111] flex items-center justify-center p-4"
      >
        <div role="dialog" aria-modal="true" aria-label="Chọn mẫu dữ liệu" className="w-full max-w-lg rounded-xl border border-zinc-200 dark:border-white/[0.07] bg-white dark:bg-[#141414] shadow-2xl">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-zinc-200 dark:border-white/[0.07] px-5 py-3.5">
            <h3 className="text-base font-semibold text-zinc-800 dark:text-slate-200">Chọn mẫu dữ liệu</h3>
            <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-zinc-500 dark:text-slate-400 hover:bg-zinc-100 dark:hover:bg-white/[0.06] transition-colors">
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Search */}
          <div className="px-5 pt-4 pb-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400 dark:text-slate-500" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Tìm mẫu dữ liệu..."
                autoFocus
                className="w-full rounded-lg border border-zinc-200 dark:border-white/[0.09] bg-zinc-50 dark:bg-white/[0.04] pl-9 pr-3 py-2 text-sm text-zinc-900 dark:text-slate-100 placeholder:text-zinc-400 dark:placeholder:text-slate-500 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-400/30"
              />
            </div>
          </div>

          {/* Template list */}
          <div className="max-h-72 overflow-y-auto px-5 py-2 space-y-3">
            {/* Customer templates */}
            {hasCustomer && filteredCustomer.length > 0 && (
              <div>
                <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-slate-400">
                  Mẫu của khách hàng
                </p>
                <div className="space-y-1">
                  {filteredCustomer.map((tpl) => (
                    <TemplateRow
                      key={tpl.id}
                      name={tpl.name}
                      isSelected={tpl.id === selectedFieldTemplateId}
                      onClick={() => onSelect(tpl.id)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Master templates */}
            {filteredMaster.length > 0 && (
              <div>
                <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-slate-400">
                  Mẫu chung
                </p>
                <div className="space-y-1">
                  {filteredMaster.map((tpl) => (
                    <TemplateRow
                      key={tpl.id}
                      name={tpl.name}
                      isSelected={tpl.id === selectedFieldTemplateId}
                      onClick={() => onSelect(tpl.id)}
                    />
                  ))}
                </div>
              </div>
            )}

            {filteredCustomer.length === 0 && filteredMaster.length === 0 && (
              <p className="py-4 text-center text-sm text-zinc-500 dark:text-slate-400">Không tìm thấy mẫu dữ liệu</p>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap items-center gap-2 border-t border-zinc-200 dark:border-white/[0.07] px-5 py-3">
            <button
              type="button"
              onClick={onCreateNew}
              className="flex items-center gap-1.5 rounded-lg border border-zinc-200 dark:border-white/[0.09] bg-white dark:bg-[#141414] px-3 py-2 text-xs font-medium text-zinc-700 dark:text-slate-200 transition-colors hover:bg-zinc-50 dark:hover:bg-white/[0.06]"
            >
              <Plus className="h-3.5 w-3.5" />
              Tạo mẫu mới
            </button>
            <button
              type="button"
              onClick={onAttachTemplate}
              disabled={!selectedFieldTemplateId}
              className="flex items-center gap-1.5 rounded-lg border border-zinc-200 dark:border-white/[0.09] bg-white dark:bg-[#141414] px-3 py-2 text-xs font-medium text-zinc-700 dark:text-slate-200 transition-colors hover:bg-zinc-50 dark:hover:bg-white/[0.06] disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Link className="h-3.5 w-3.5" />
              Áp dụng mẫu
            </button>
            <button
              type="button"
              onClick={onEditTemplate}
              className="flex items-center gap-1.5 rounded-lg border border-zinc-200 dark:border-white/[0.09] bg-white dark:bg-[#141414] px-3 py-2 text-xs font-medium text-zinc-700 dark:text-slate-200 transition-colors hover:bg-zinc-50 dark:hover:bg-white/[0.06]"
            >
              <Settings className="h-3.5 w-3.5" />
              Chỉnh sửa tên mẫu
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>,
    portalTarget,
  );
}

/** Single template row — extracted for readability */
function TemplateRow({ name, isSelected, onClick }: { name: string; isSelected: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center rounded-lg px-3 py-2.5 text-left text-sm transition-colors ${
        isSelected
          ? "bg-brand-50 dark:bg-brand-500/15 text-brand-600 dark:text-brand-300 font-medium"
          : "text-zinc-700 dark:text-slate-200 hover:bg-zinc-50 dark:hover:bg-white/[0.05]"
      }`}
    >
      <span className="truncate">{name}</span>
      {isSelected && <span className="ml-auto text-xs text-brand-500 dark:text-brand-400">Đang dùng</span>}
    </button>
  );
}
