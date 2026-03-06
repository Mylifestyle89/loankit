import { PanelRightClose, PanelRightOpen, Plus } from "lucide-react";

type MappingVisualToolbarProps = {
  t: (key: string) => string;
  hasContext: boolean;
  searchTerm: string;
  setSearchTerm: (value: string) => void;
  showUnmappedOnly: boolean;
  setShowUnmappedOnly: (value: boolean) => void;
  showTechnicalKeys: boolean;
  setShowTechnicalKeys: (v: boolean) => void;
  onOpenAddFieldModal: () => void;
  onToggleSidebar: () => void;
  sidebarOpen: boolean;
};

export function MappingVisualToolbar({
  t,
  hasContext,
  searchTerm,
  setSearchTerm,
  showUnmappedOnly,
  setShowUnmappedOnly,
  showTechnicalKeys,
  setShowTechnicalKeys,
  onOpenAddFieldModal,
  onToggleSidebar,
  sidebarOpen,
}: MappingVisualToolbarProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-zinc-200 dark:border-white/[0.08] bg-white/80 dark:bg-[#141414]/90 p-2 backdrop-blur-sm">
      <div className={`flex items-center gap-2 w-full md:w-auto transition-opacity duration-300 ${!hasContext ? "opacity-0 pointer-events-none" : "opacity-100"}`}>
        <input
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full md:w-72 rounded-lg border border-zinc-300 dark:border-white/[0.10] px-3 py-1.5 text-sm text-zinc-900 dark:text-slate-100 dark:bg-white/[0.05] placeholder:text-zinc-500 dark:placeholder:text-slate-400 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500/40"
          placeholder={t("mapping.searchPlaceholder")}
        />
        <label className="inline-flex items-center gap-2 rounded-lg border border-zinc-300 dark:border-white/[0.10] bg-white dark:bg-[#141414]/90 px-3 py-1.5 text-xs text-zinc-700 dark:text-slate-200">
          <input
            type="checkbox"
            checked={showUnmappedOnly}
            onChange={(e) => setShowUnmappedOnly(e.target.checked)}
            className="h-3.5 w-3.5 rounded border-zinc-300 dark:border-white/[0.10] text-violet-600 focus:ring-violet-500/40"
          />
          Chưa mapping
        </label>
        <label className="inline-flex items-center gap-2 rounded-lg border border-zinc-300 dark:border-white/[0.10] bg-white dark:bg-[#141414]/90 px-3 py-1.5 text-xs text-zinc-700 dark:text-slate-200">
          <input
            type="checkbox"
            checked={showTechnicalKeys}
            onChange={(e) => setShowTechnicalKeys(e.target.checked)}
            className="h-3.5 w-3.5 rounded border-zinc-300 dark:border-white/[0.10] text-violet-600 focus:ring-violet-500/40"
          />
          Technical keys
        </label>
        <button
          type="button"
          onClick={onOpenAddFieldModal}
          className="flex flex-shrink-0 items-center gap-1.5 rounded-lg bg-gradient-to-r from-violet-600 to-fuchsia-600 px-3 py-1.5 text-sm text-white shadow-sm shadow-violet-500/25 transition-all duration-200 hover:shadow-md hover:shadow-violet-500/30 hover:brightness-110"
        >
          <Plus className="h-4 w-4" />
          {t("mapping.newFieldTitle")}
        </button>
      </div>

      <div className="flex items-center gap-2">
        <div className="h-6 w-px bg-zinc-200 dark:bg-white/[0.08] mx-1" />
        <button
          type="button"
          onClick={onToggleSidebar}
          title="Điều phối dữ liệu"
          className="rounded-lg p-2 text-zinc-600 dark:text-slate-300 transition-colors hover:bg-violet-50 dark:hover:bg-violet-500/10 hover:text-violet-600 dark:hover:text-violet-400"
        >
          {sidebarOpen ? <PanelRightClose className="h-5 w-5" /> : <PanelRightOpen className="h-5 w-5" />}
        </button>
      </div>
    </div>
  );
}
