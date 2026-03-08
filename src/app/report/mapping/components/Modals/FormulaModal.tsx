"use client";

import { useRef, useState } from "react";
import { X } from "lucide-react";
import type { FieldCatalogItem } from "@/lib/report/config-schema";

type FormulaModalProps = {
  isOpen: boolean;
  onClose: () => void;
  field: FieldCatalogItem | null;
  currentFormula: string;
  onSave: (fieldKey: string, formula: string) => void;
  onClear: (fieldKey: string) => void;
};

export function FormulaModal({
  isOpen,
  onClose,
  field,
  currentFormula,
  onSave,
  onClear,
}: FormulaModalProps) {
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement | null>(null);

  if (!isOpen || !field) return null;

  const handleSave = () => {
    setError("");
    const trimmed = (inputRef.current?.value ?? currentFormula).trim();
    if (!trimmed) {
      onClear(field.field_key);
      onClose();
      return;
    }
    if (field.type === "date" && /[*/]/.test(trimmed)) {
      setError("Field kiểu ngày chỉ cho phép phép cộng (+) và trừ (-).");
      return;
    }
    setError("");
    onSave(field.field_key, trimmed);
    onClose();
  };

  const allowedTypes =
    field.type === "number" || field.type === "percent" || field.type === "date" || field.type === "text";
  if (!allowedTypes) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-xl bg-white dark:bg-[#141414]/90 shadow-2xl">
        <div className="flex items-center justify-between border-b border-zinc-200 dark:border-white/[0.07] px-4 py-3">
          <h3 className="text-base font-semibold text-zinc-800 dark:text-slate-100">Công thức: {field.label_vi}</h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1.5 text-zinc-500 dark:text-slate-300 hover:bg-violet-50/50 dark:hover:bg-white/[0.07]"
            aria-label="Đóng"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="p-4 space-y-3">
          <p className="text-xs text-zinc-500 dark:text-slate-300">
            Trường kiểu Số, Phần trăm, Ngày và Text có thể dùng công thức. Dùng mã trường hoặc Alias (gạch dưới thay khoảng trắng).
            Với field ngày: dùng + / -; ví dụ `Ngay_hop_dong + 10d`, `Ngay_hop_dong + 2m`, `Ngay_hop_dong + 1y`, `Ngay_ket_thuc - Ngay_bat_dau`.
            Với field số/phần trăm: hỗ trợ ROUND, ROUNDUP, ROUNDDOWN (ví dụ `ROUND(Doanh_thu/3,2)`).
            Với field text: hỗ trợ DOCSO và DOCSOCODONVI (ví dụ `DOCSOCODONVI(TSBD.Gia_tri_tai_san,{'\"'}đồng{'\"'})`).
          </p>
          <label className="block">
            <span className="text-sm font-medium text-violet-800 dark:text-slate-200">Biểu thức</span>
            <input
              key={`${field.field_key}:${currentFormula}`}
              ref={inputRef}
              type="text"
              defaultValue={currentFormula}
              placeholder="Ví dụ: Doanh_thu - Chi_phí"
              className="mt-1 w-full rounded border border-zinc-200 dark:border-white/[0.09] dark:bg-white/[0.05] dark:text-slate-100 px-3 py-2 text-sm font-sans placeholder:text-zinc-400 dark:placeholder:text-slate-500 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
            />
          </label>
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
        </div>
        <div className="flex justify-end gap-2 border-t border-zinc-100 dark:border-white/[0.07] px-4 py-3">
          {currentFormula ? (
            <button
              type="button"
              onClick={() => {
                onClear(field.field_key);
                onClose();
              }}
              className="rounded-md border border-red-200 bg-white dark:bg-white/[0.05] dark:border-white/[0.09] px-3 py-1.5 text-sm text-red-700 dark:text-rose-400 hover:bg-red-50"
            >
              Xóa công thức
            </button>
          ) : null}
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-zinc-200 dark:border-white/[0.09] bg-white dark:bg-white/[0.05] dark:text-slate-200 px-3 py-1.5 text-sm text-violet-700 hover:bg-violet-50/30 dark:hover:bg-white/[0.06]"
          >
            Hủy
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="rounded-md bg-gradient-to-r from-violet-600 to-fuchsia-600 px-3 py-1.5 text-sm text-white hover:brightness-110"
          >
            Áp dụng
          </button>
        </div>
      </div>
    </div>
  );
}
