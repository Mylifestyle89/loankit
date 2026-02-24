import { Download, FileText, Plus } from "lucide-react";
import { useMemo, type ReactNode } from "react";

type MappingVisualToolbarProps = {
  t: (key: string) => string;
  hasContext: boolean;
  searchTerm: string;
  setSearchTerm: (value: string) => void;
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
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-coral-tree-200 bg-white p-2">
      <div className={`flex items-center gap-2 w-full md:w-auto transition-opacity duration-300 ${!hasContext ? "opacity-0 pointer-events-none" : "opacity-100"}`}>
        <input
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full md:w-72 rounded-md border border-coral-tree-300 px-3 py-1.5 text-sm placeholder:text-coral-tree-700"
          placeholder={t("mapping.searchPlaceholder")}
        />
        <button
          type="button"
          onClick={onOpenAddFieldModal}
          className="flex flex-shrink-0 items-center gap-1.5 rounded-md bg-coral-tree-700 px-3 py-1.5 text-sm text-white hover:bg-coral-tree-800"
        >
          <Plus className="h-4 w-4" />
          {t("mapping.newFieldTitle")}
        </button>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={onExportAndOpenDocx}
          disabled={exportingDocx}
          className="flex items-center gap-1.5 rounded-md border border-coral-tree-300 bg-white px-3 py-1.5 text-sm font-medium text-coral-tree-900 hover:bg-coral-tree-50 hover:text-coral-tree-950 disabled:opacity-75"
          title={t("mapping.exportOpenDocx")}
        >
          <FileText className="h-4 w-4" />
          {exportingDocx ? "..." : "Xem Docx"}
        </button>

        {lastExportedDocxPath ? (
          <a
            href={downloadHref}
            className="flex items-center gap-1.5 rounded-md border border-coral-tree-300 bg-white px-2 py-1.5 text-sm hover:bg-coral-tree-50"
            title={t("mapping.downloadDocx")}
          >
            <Download className="h-4 w-4 text-coral-tree-800" />
          </a>
        ) : null}

        <div className="h-6 w-px bg-coral-tree-200 mx-1" />
        {sidebar}
      </div>
    </div>
  );
}
