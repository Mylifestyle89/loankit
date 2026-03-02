import { BarChart3, History, Plus } from "lucide-react";
import { useRef, useState, type DragEvent, type ReactNode } from "react";

type MappingVisualToolbarProps = {
  t: (key: string) => string;
  hasContext: boolean;
  searchTerm: string;
  setSearchTerm: (value: string) => void;
  showUnmappedOnly: boolean;
  setShowUnmappedOnly: (value: boolean) => void;
  onOpenAddFieldModal: () => void;
  onOpenFinancialAnalysis?: () => void;
  onOpenSnapshotRestore?: () => void;
  sidebar: ReactNode;
  ocrProcessing?: boolean;
  onOcrFileSelected?: (file: File) => void;
};

export function MappingVisualToolbar({
  t,
  hasContext,
  searchTerm,
  setSearchTerm,
  showUnmappedOnly,
  setShowUnmappedOnly,
  onOpenAddFieldModal,
  onOpenFinancialAnalysis,
  onOpenSnapshotRestore,
  sidebar,
  ocrProcessing = false,
  onOcrFileSelected,
}: MappingVisualToolbarProps) {
  const [isDragActive, setIsDragActive] = useState(false);
  const ocrInputRef = useRef<HTMLInputElement | null>(null);

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragActive(false);
    const file = event.dataTransfer.files?.[0];
    if (file && onOcrFileSelected) onOcrFileSelected(file);
  };

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-zinc-200 dark:border-white/[0.08] bg-white/80 dark:bg-[#0f1629]/90 p-2 backdrop-blur-sm">
      <div className={`flex items-center gap-2 w-full md:w-auto transition-opacity duration-300 ${!hasContext ? "opacity-0 pointer-events-none" : "opacity-100"}`}>
        <input
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full md:w-72 rounded-lg border border-zinc-300 dark:border-white/[0.10] px-3 py-1.5 text-sm text-zinc-900 dark:text-slate-100 dark:bg-white/[0.05] placeholder:text-zinc-500 dark:placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          placeholder={t("mapping.searchPlaceholder")}
        />
        <label className="inline-flex items-center gap-2 rounded-lg border border-zinc-300 dark:border-white/[0.10] bg-white dark:bg-[#0f1629]/90 px-3 py-1.5 text-xs text-zinc-700 dark:text-slate-200">
          <input
            type="checkbox"
            checked={showUnmappedOnly}
            onChange={(e) => setShowUnmappedOnly(e.target.checked)}
            className="h-3.5 w-3.5 rounded border-zinc-300 dark:border-white/[0.10] text-indigo-600 focus:ring-indigo-500"
          />
          Chưa mapping
        </label>
        <button
          type="button"
          onClick={onOpenAddFieldModal}
          className="flex flex-shrink-0 items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-sm text-white shadow-glow transition-colors hover:bg-indigo-700"
        >
          <Plus className="h-4 w-4" />
          {t("mapping.newFieldTitle")}
        </button>
        {onOpenFinancialAnalysis && (
          <button
            type="button"
            onClick={onOpenFinancialAnalysis}
            disabled={!hasContext}
            title="Phân tích Tài chính từ BCTC Excel"
            className="flex flex-shrink-0 items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-sm text-white shadow-sm transition-colors hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <BarChart3 className="h-4 w-4" />
            Phân tích TC
          </button>
        )}
        {onOpenSnapshotRestore && (
          <button
            type="button"
            onClick={onOpenSnapshotRestore}
            title="Khôi phục dữ liệu từ bản lưu tự động"
            className="flex flex-shrink-0 items-center gap-1.5 rounded-lg border border-slate-200/60 dark:border-white/[0.07] bg-slate-50/50 dark:bg-white/[0.04] px-3 py-1.5 text-sm font-medium text-slate-700 dark:text-slate-200 transition-colors hover:bg-indigo-50/30 dark:hover:bg-indigo-500/10"
          >
            <History className="h-4 w-4" />
            Backup
          </button>
        )}
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragActive(true);
          }}
          onDragLeave={() => setIsDragActive(false)}
          onDrop={handleDrop}
          className={`rounded-lg border px-3 py-1.5 text-xs transition-all ${
            isDragActive
              ? "border-indigo-300 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400"
              : "border-slate-200/60 dark:border-white/[0.07] bg-slate-50/50 dark:bg-white/[0.04] text-slate-600 dark:text-slate-300 hover:border-indigo-200 hover:bg-indigo-50/30 dark:hover:bg-white/[0.05]"
          }`}
        >
          <input
            ref={ocrInputRef}
            type="file"
            accept=".docx,.png,.jpg,.jpeg,.webp,.pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/pdf,image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file && onOcrFileSelected) onOcrFileSelected(file);
              e.target.value = "";
            }}
          />
          <button
            type="button"
            onClick={() => ocrInputRef.current?.click()}
            disabled={ocrProcessing || !onOcrFileSelected}
            className="font-medium disabled:opacity-50"
          >
            {ocrProcessing ? "Đang xử lý..." : "Drop/Pick OCR/DOCX"}
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div className="h-6 w-px bg-zinc-200 dark:bg-white/[0.08] mx-1" />
        {sidebar}
      </div>
    </div>
  );
}
