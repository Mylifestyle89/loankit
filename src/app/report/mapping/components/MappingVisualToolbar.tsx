import { Download, FileText, Plus } from "lucide-react";
import { useMemo, type ReactNode } from "react";

type MappingVisualToolbarProps = {
  t: (key: string) => string;
  hasContext: boolean;
  searchTerm: string;
  setSearchTerm: (value: string) => void;
  showUnmappedOnly: boolean;
  setShowUnmappedOnly: (value: boolean) => void;
  onOpenAddFieldModal: () => void;
  exportingDocx: boolean;
  onExportAndOpenDocx: () => void;
  lastExportedDocxPath: string;
  sidebar: ReactNode;
};

export function MappingVisualToolbar({
  t,
  hasContext,
  searchTerm,
  setSearchTerm,
  showUnmappedOnly,
  setShowUnmappedOnly,
  onOpenAddFieldModal,
  exportingDocx,
  onExportAndOpenDocx,
  lastExportedDocxPath,
  sidebar,
}: MappingVisualToolbarProps) {
  const downloadHref = useMemo(
    () =>
      lastExportedDocxPath
        ? `/api/report/file?path=${encodeURIComponent(lastExportedDocxPath)}&download=1`
        : "",
    [lastExportedDocxPath],
  );

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
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={onExportAndOpenDocx}
          disabled={exportingDocx}
          className="flex items-center gap-1.5 rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-800 transition-colors hover:bg-indigo-50 hover:text-indigo-900 disabled:opacity-75"
          title={t("mapping.exportOpenDocx")}
        >
          <FileText className="h-4 w-4" />
          {exportingDocx ? "..." : "Xem Docx"}
        </button>

        {lastExportedDocxPath ? (
          <a
            href={downloadHref}
            className="flex items-center gap-1.5 rounded-lg border border-zinc-300 bg-white px-2 py-1.5 text-sm transition-colors hover:bg-indigo-50"
            title={t("mapping.downloadDocx")}
          >
            <Download className="h-4 w-4 text-indigo-700" />
          </a>
        ) : null}

        <div className="h-6 w-px bg-zinc-200 mx-1" />
        {sidebar}
      </div>
    </div>
  );
}
