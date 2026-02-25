import { Plus } from "lucide-react";
import { useRef, useState, type DragEvent, type ReactNode } from "react";

type MappingVisualToolbarProps = {
  t: (key: string) => string;
  hasContext: boolean;
  searchTerm: string;
  setSearchTerm: (value: string) => void;
  showUnmappedOnly: boolean;
  setShowUnmappedOnly: (value: boolean) => void;
  onOpenAddFieldModal: () => void;
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
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-zinc-200 bg-white/80 p-2 backdrop-blur-sm">
      <div className={`flex items-center gap-2 w-full md:w-auto transition-opacity duration-300 ${!hasContext ? "opacity-0 pointer-events-none" : "opacity-100"}`}>
        <input
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full md:w-72 rounded-lg border border-zinc-300 px-3 py-1.5 text-sm text-zinc-900 placeholder:text-zinc-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          placeholder={t("mapping.searchPlaceholder")}
        />
        <label className="inline-flex items-center gap-2 rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-xs text-zinc-700">
          <input
            type="checkbox"
            checked={showUnmappedOnly}
            onChange={(e) => setShowUnmappedOnly(e.target.checked)}
            className="h-3.5 w-3.5 rounded border-zinc-300 text-indigo-600 focus:ring-indigo-500"
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
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragActive(true);
          }}
          onDragLeave={() => setIsDragActive(false)}
          onDrop={handleDrop}
          className={`rounded-lg border px-3 py-1.5 text-xs transition-all ${
            isDragActive
              ? "border-indigo-300 bg-indigo-50 text-indigo-700"
              : "border-slate-200/60 bg-slate-50/50 text-slate-600 hover:border-indigo-200 hover:bg-indigo-50/30"
          }`}
        >
          <input
            ref={ocrInputRef}
            type="file"
            accept=".png,.jpg,.jpeg,.webp,.pdf,application/pdf,image/png,image/jpeg,image/webp"
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
            {ocrProcessing ? "Đang OCR..." : "Drop/Pick OCR"}
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div className="h-6 w-px bg-zinc-200 mx-1" />
        {sidebar}
      </div>
    </div>
  );
}
