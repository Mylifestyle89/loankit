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
      <div className="w-full max-w-md rounded-xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-blue-chill-200 px-4 py-3">
          <h3 className="text-base font-semibold text-blue-chill-900">Công thức: {field.label_vi}</h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1.5 text-blue-chill-600 hover:bg-blue-chill-100"
            aria-label="Đóng"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="p-4 space-y-3">
          <p className="text-xs text-blue-chill-600">
            Trường kiểu Số, Phần trăm, Ngày và Text có thể dùng công thức. Dùng mã trường hoặc Alias (gạch dưới thay khoảng trắng).
            Với field ngày: dùng + / -; ví dụ `Ngay_hop_dong + 10d`, `Ngay_hop_dong + 2m`, `Ngay_hop_dong + 1y`, `Ngay_ket_thuc - Ngay_bat_dau`.
            Với field số/phần trăm: hỗ trợ ROUND, ROUNDUP, ROUNDDOWN (ví dụ `ROUND(Doanh_thu/3,2)`).
            Với field text: hỗ trợ DOCSO và DOCSOCODONVI (ví dụ `DOCSOCODONVI(TSBD.Gia_tri_tai_san,{'\"'}đồng{'\"'})`).
          </p>
          <label className="block">
            <span className="text-sm font-medium text-blue-chill-800">Biểu thức</span>
            <input
              key={`${field.field_key}:${currentFormula}`}
              ref={inputRef}
              type="text"
              defaultValue={currentFormula}
              placeholder="Ví dụ: Doanh_thu - Chi_phí"
              className="mt-1 w-full rounded border border-blue-chill-200 px-3 py-2 text-sm font-sans placeholder:text-blue-chill-400 focus:border-blue-chill-500 focus:outline-none focus:ring-1 focus:ring-blue-chill-500"
            />
          </label>
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
        </div>
        <div className="flex justify-end gap-2 border-t border-blue-chill-100 px-4 py-3">
          {currentFormula ? (
            <button
              type="button"
              onClick={() => {
                onClear(field.field_key);
                onClose();
              }}
              className="rounded-md border border-red-200 bg-white px-3 py-1.5 text-sm text-red-700 hover:bg-red-50"
            >
              Xóa công thức
            </button>
          ) : null}
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-blue-chill-200 bg-white px-3 py-1.5 text-sm text-blue-chill-700 hover:bg-blue-chill-50"
          >
            Hủy
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="rounded-md bg-blue-chill-700 px-3 py-1.5 text-sm text-white hover:bg-blue-chill-800"
          >
            Áp dụng
          </button>
        </div>
      </div>
    </div>
  );
}
