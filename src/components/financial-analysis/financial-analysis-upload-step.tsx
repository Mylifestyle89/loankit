"use client";

/**
 * financial-analysis-upload-step.tsx
 *
 * Step 1 UI for FinancialAnalysisModal: drag-drop / click-to-upload Excel file.
 */

import { type DragEvent, type RefObject } from "react";
import { Loader2, Upload } from "lucide-react";

type Props = {
  fileInputRef: RefObject<HTMLInputElement | null>;
  isDragActive: boolean;
  uploading: boolean;
  onDragOver: (e: DragEvent<HTMLDivElement>) => void;
  onDragLeave: () => void;
  onDrop: (e: DragEvent<HTMLDivElement>) => void;
  onFileChange: (file: File) => void;
};

export function FinancialAnalysisUploadStep({
  fileInputRef,
  isDragActive,
  uploading,
  onDragOver,
  onDragLeave,
  onDrop,
  onFileChange,
}: Props) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-600 dark:text-slate-300">
        Upload file Excel Báo Cáo Tài Chính (BCTC) để trích xuất dữ liệu CDKT, KQKD và các chỉ số tài chính.
      </p>
      <div
        role="button"
        tabIndex={0}
        aria-label="Khu vực kéo thả file Excel"
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        onClick={() => fileInputRef.current?.click()}
        onKeyDown={(e) => e.key === "Enter" && fileInputRef.current?.click()}
        className={`flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed px-6 py-12 transition-colors ${
          isDragActive
            ? "border-emerald-400 bg-emerald-50 dark:bg-emerald-500/10"
            : "border-slate-300 dark:border-white/[0.10] hover:border-emerald-300 dark:hover:border-emerald-500/40 hover:bg-slate-50 dark:hover:bg-white/[0.03]"
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) onFileChange(file);
            e.target.value = "";
          }}
        />
        {uploading
          ? <Loader2 className="h-10 w-10 animate-spin text-emerald-500" />
          : <Upload className={`h-10 w-10 ${isDragActive ? "text-emerald-500" : "text-slate-400 dark:text-slate-500"}`} />
        }
        <div className="text-center">
          <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
            {uploading ? "Đang trích xuất dữ liệu..." : "Kéo thả hoặc click để chọn file"}
          </p>
          <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
            .xlsx, .xls — tối đa 20MB
          </p>
        </div>
      </div>
    </div>
  );
}
