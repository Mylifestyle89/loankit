"use client";

// BK Import tab for AiMappingModal — imports .BK / .json files from Agribank APC system

import { type ChangeEvent } from "react";
import { motion } from "framer-motion";
import { Upload, Database, AlertCircle, CheckCircle2, Check } from "lucide-react";
import type { BkImportResult } from "./ai-mapping-modal-types";
import { BkImportTable } from "./ai-mapping-bk-import-table";

type BkImportTabProps = {
  // File state
  bkFile: File | null;
  bkImporting: boolean;
  bkResult: BkImportResult | null;
  bkError: string;
  // Selection state
  bkAccepted: Record<string, boolean>;
  setBkAccepted: (v: Record<string, boolean> | ((prev: Record<string, boolean>) => Record<string, boolean>)) => void;
  bkExpandedGroups: Record<string, boolean>;
  setBkExpandedGroups: (v: Record<string, boolean> | ((prev: Record<string, boolean>) => Record<string, boolean>)) => void;
  // Mode state
  bkMode: "data-only" | "template-and-data";
  setBkMode: (v: "data-only" | "template-and-data") => void;
  bkTemplateName: string;
  setBkTemplateName: (v: string) => void;
  // Computed
  bkSelectedCount: number;
  bkTotalCount: number;
  bkGroupedValues: Record<string, Array<{ key: string; value: string }>>;
  // Handlers
  handleBkFileImport: (e: ChangeEvent<HTMLInputElement>) => void;
  handleBkApplySelected: () => void;
  onApplyBkImport?: unknown; // used only for disabled check
};

export function BkImportTab({
  bkFile,
  bkImporting,
  bkResult,
  bkError,
  bkAccepted,
  setBkAccepted,
  bkExpandedGroups,
  setBkExpandedGroups,
  bkMode,
  setBkMode,
  bkTemplateName,
  setBkTemplateName,
  bkSelectedCount,
  bkTotalCount,
  bkGroupedValues,
  handleBkFileImport,
  handleBkApplySelected,
  onApplyBkImport,
}: BkImportTabProps) {
  return (
    <div className="space-y-4 px-4 py-4">
      {/* Header info + upload button */}
      <div className="rounded-xl border border-blue-200/60 bg-gradient-to-br from-blue-50/80 via-blue-50/40 to-amber-50/40 p-3 dark:border-blue-500/25 dark:from-blue-500/10 dark:via-blue-500/5 dark:to-amber-500/5">
        <div className="flex items-center gap-3">
          <Database className="h-5 w-5 flex-shrink-0 text-blue-600 dark:text-blue-400" />
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-300">Import dữ liệu .BK</h3>
            <p className="text-xs text-blue-700/70 dark:text-blue-300/60">
              Hệ thống Agribank (APC) &mdash; Tự động match với các field hiện tại
            </p>
          </div>
          <label className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-blue-300 bg-white/80 px-3 py-1.5 text-xs font-semibold text-blue-700 shadow-sm transition-all hover:bg-blue-50 hover:border-blue-400 hover:shadow dark:border-blue-500/40 dark:bg-white/[0.06] dark:text-blue-300 dark:hover:bg-blue-500/10">
            <Upload className="h-3.5 w-3.5" />
            {bkFile ? "Chọn lại" : "Chọn file .BK"}
            <input
              type="file"
              accept=".bk,.json"
              className="hidden"
              onChange={handleBkFileImport}
              disabled={bkImporting}
            />
          </label>
        </div>
      </div>

      {/* Loading spinner */}
      {bkImporting && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex items-center justify-center gap-2 rounded-lg bg-blue-50/60 px-3 py-4 dark:bg-blue-500/10"
        >
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-blue-300 border-t-blue-600 dark:border-blue-500/30 dark:border-t-blue-400" />
          <span className="text-sm font-medium text-blue-700 dark:text-blue-300">Đang phân tích file...</span>
        </motion.div>
      )}

      {/* Error */}
      {bkError && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex items-start gap-2 rounded-lg bg-red-50/60 px-3 py-2.5 dark:bg-red-500/10"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-red-600 dark:text-red-400" />
          <span className="text-sm font-medium text-red-700 dark:text-red-300">{bkError}</span>
        </motion.div>
      )}

      {/* Empty state */}
      {!bkFile && !bkResult && !bkImporting && (
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-blue-200/60 bg-white/50 px-4 py-10 dark:border-blue-500/20 dark:bg-white/[0.02]">
          <Database className="h-10 w-10 text-blue-300 dark:text-blue-500/50" />
          <div className="text-center">
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">Chưa có file nào được chọn</p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Upload file .bk hoặc .json từ hệ thống Agribank (APC)
            </p>
          </div>
        </div>
      )}

      {/* Review table */}
      {bkResult && !bkError && Object.keys(bkGroupedValues).length > 0 && (
        <div className="space-y-3">
          {/* Success indicator */}
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            <span className="text-xs font-medium text-emerald-700 dark:text-emerald-300">
              Phân tích thành công
            </span>
          </div>

          {/* Grouped field table */}
          <BkImportTable
            bkGroupedValues={bkGroupedValues}
            bkAccepted={bkAccepted}
            setBkAccepted={setBkAccepted}
            bkExpandedGroups={bkExpandedGroups}
            setBkExpandedGroups={setBkExpandedGroups}
            bkSelectedCount={bkSelectedCount}
            bkTotalCount={bkTotalCount}
            bkResult={bkResult}
          />

          {/* Mode selector */}
          <div className="rounded-lg border border-slate-200/60 bg-white/60 p-3 dark:border-white/[0.07] dark:bg-white/[0.03]">
            <p className="mb-2 text-xs font-semibold text-slate-700 dark:text-slate-300">Chọn cách import</p>
            <div className="space-y-2">
              <label
                className={`flex cursor-pointer items-start gap-2.5 rounded-lg border px-3 py-2.5 transition-colors ${
                  bkMode === "data-only"
                    ? "border-amber-300 bg-amber-50/40 dark:border-amber-500/30 dark:bg-amber-500/10"
                    : "border-slate-200/60 bg-transparent hover:bg-slate-50/50 dark:border-white/[0.07] dark:hover:bg-white/[0.03]"
                }`}
              >
                <input
                  type="radio"
                  name="bkMode"
                  value="data-only"
                  checked={bkMode === "data-only"}
                  onChange={() => setBkMode("data-only")}
                  className="mt-0.5 h-3.5 w-3.5 text-amber-600 focus:ring-amber-500"
                />
                <div>
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">Chỉ import dữ liệu</span>
                  <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                    Điền giá trị vào các field đã có sẵn trên form
                  </p>
                </div>
              </label>
              <label
                className={`flex cursor-pointer items-start gap-2.5 rounded-lg border px-3 py-2.5 transition-colors ${
                  bkMode === "template-and-data"
                    ? "border-amber-300 bg-amber-50/40 dark:border-amber-500/30 dark:bg-amber-500/10"
                    : "border-slate-200/60 bg-transparent hover:bg-slate-50/50 dark:border-white/[0.07] dark:hover:bg-white/[0.03]"
                }`}
              >
                <input
                  type="radio"
                  name="bkMode"
                  value="template-and-data"
                  checked={bkMode === "template-and-data"}
                  onChange={() => setBkMode("template-and-data")}
                  className="mt-0.5 h-3.5 w-3.5 text-amber-600 focus:ring-amber-500"
                />
                <div className="flex-1">
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">Tạo template mới + dữ liệu</span>
                  <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                    Tự động tạo cấu trúc field mới và điền dữ liệu cho khách hàng
                  </p>
                  {bkMode === "template-and-data" && (
                    <input
                      type="text"
                      value={bkTemplateName}
                      onChange={(e) => setBkTemplateName(e.target.value)}
                      placeholder="Nhập tên template..."
                      className="mt-2 h-8 w-full rounded-lg border border-amber-200/80 bg-white/80 px-2.5 text-xs text-slate-800 placeholder:text-slate-400 focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-400/20 dark:border-amber-500/30 dark:bg-white/[0.05] dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:ring-amber-400/20"
                    />
                  )}
                </div>
              </label>
            </div>
          </div>

          {/* Apply button */}
          <div className="flex items-center justify-between border-t border-slate-200/50 pt-3 dark:border-white/[0.07]">
            <span className="text-xs text-slate-500 dark:text-slate-400">
              {bkSelectedCount} trường
              {bkMode === "template-and-data" ? " sẽ tạo template + điền dữ liệu" : " sẽ được điền vào form"}
            </span>
            <button
              type="button"
              onClick={handleBkApplySelected}
              disabled={bkSelectedCount === 0 || !onApplyBkImport}
              className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-blue-600 to-amber-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-all hover:from-blue-700 hover:to-amber-700 disabled:opacity-50"
            >
              <Check className="h-4 w-4" />
              {bkMode === "template-and-data"
                ? `Tạo template + áp dụng ${bkSelectedCount} trường`
                : `Áp dụng ${bkSelectedCount} trường đã chọn`}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
