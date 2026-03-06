"use client";

import { useRef, useState } from "react";
import { ChevronsDown, Upload, BarChart3, History, FileText, ChevronDown, ChevronUp } from "lucide-react";
import { useLanguage } from "@/components/language-provider";

type SidebarToolsSectionProps = {
  openMergeGroupsModal: () => void;
  onOpenDocxMerge: () => void;
  onOpenFinancialAnalysis: () => void;
  onOpenSnapshotRestore: () => void;
  onOcrFileSelected: (file: File) => void;
  ocrProcessing: boolean;
  onCloseSidebar: () => void;
};

const BTN_CLASS =
  "flex w-full items-center gap-2 rounded-lg border border-slate-200/60 dark:border-white/[0.07] bg-white/70 dark:bg-[#141414]/90 px-3 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-200 transition-all duration-200 hover:bg-slate-100/50 dark:hover:bg-white/[0.06]";

export function SidebarToolsSection({
  openMergeGroupsModal,
  onOpenDocxMerge,
  onOpenFinancialAnalysis,
  onOpenSnapshotRestore,
  onOcrFileSelected,
  ocrProcessing,
  onCloseSidebar,
}: SidebarToolsSectionProps) {
  const { t } = useLanguage();
  const [sectionOpen, setSectionOpen] = useState(false);
  const ocrInputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={() => setSectionOpen((v) => !v)}
        className="flex w-full items-center justify-between rounded-lg px-1 py-1 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 transition-colors hover:bg-slate-100/60 dark:hover:bg-white/[0.06]"
      >
        <span>2. Các tiện ích</span>
        {sectionOpen
          ? <ChevronUp className="h-4 w-4 text-slate-400 dark:text-slate-500" />
          : <ChevronDown className="h-4 w-4 text-slate-400 dark:text-slate-500" />}
      </button>

      {sectionOpen ? (
        <>
          {/* Merge groups */}
          <button
            type="button"
            onClick={() => { onCloseSidebar(); openMergeGroupsModal(); }}
            className={BTN_CLASS}
          >
            <ChevronsDown className="h-4 w-4 text-slate-600 dark:text-slate-300" />
            {t("mapping.mergeGroups")}
          </button>

          {/* OCR upload */}
          <input
            ref={ocrInputRef}
            type="file"
            accept=".docx,.png,.jpg,.jpeg,.webp,.pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) onOcrFileSelected(file);
              e.target.value = "";
            }}
          />
          <button
            type="button"
            onClick={() => ocrInputRef.current?.click()}
            disabled={ocrProcessing}
            className={BTN_CLASS + " disabled:opacity-60"}
          >
            <Upload className="h-4 w-4 text-slate-600 dark:text-slate-300" />
            {ocrProcessing ? "Đang xử lý OCR..." : "Upload OCR / DOCX"}
          </button>

          {/* Financial analysis */}
          <button
            type="button"
            onClick={() => { onCloseSidebar(); onOpenFinancialAnalysis(); }}
            className={BTN_CLASS}
          >
            <BarChart3 className="h-4 w-4 text-slate-600 dark:text-slate-300" />
            Phân tích tài chính
          </button>

          {/* Backup / restore */}
          <button
            type="button"
            onClick={() => { onCloseSidebar(); onOpenSnapshotRestore(); }}
            className={BTN_CLASS}
          >
            <History className="h-4 w-4 text-slate-600 dark:text-slate-300" />
            Backup / Khôi phục
          </button>

          {/* DOCX merge */}
          <button
            type="button"
            onClick={() => { onCloseSidebar(); onOpenDocxMerge(); }}
            className={BTN_CLASS}
          >
            <FileText className="h-4 w-4 text-slate-600 dark:text-slate-300" />
            Nối DOCX
          </button>
        </>
      ) : null}
    </div>
  );
}
