// FieldCatalogBoard toolbar — left panel sticky header with collapse/expand controls

import { ChevronsUp, ChevronsDown } from "lucide-react";

type FieldCatalogToolbarProps = {
  t: (key: string) => string;
  parentGroups: string[];
  collapsedParentGroups: string[];
  collapseAllGroups: () => void;
  expandAllGroups: () => void;
};

export function FieldCatalogToolbar({
  t,
  parentGroups,
  collapsedParentGroups,
  collapseAllGroups,
  expandAllGroups,
}: FieldCatalogToolbarProps) {
  return (
    <div className="shrink-0 flex items-center gap-1.5 border-b border-zinc-200/70 dark:border-white/[0.07] bg-zinc-50/95 dark:bg-[#0a0a0a] px-2.5 py-2 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-slate-400 backdrop-blur-sm">
      <span className="flex-1 truncate">{t("mapping.column.field")}</span>
      <button
        type="button"
        onClick={collapseAllGroups}
        disabled={parentGroups.length === 0 || collapsedParentGroups.length === parentGroups.length}
        className="rounded-md border border-zinc-200 dark:border-white/[0.08] bg-white dark:bg-white/[0.05] p-1 text-zinc-500 dark:text-slate-400 transition-colors hover:bg-brand-50 dark:hover:bg-brand-500/10 hover:border-brand-300 hover:text-brand-500 dark:hover:text-brand-400 disabled:opacity-30"
        title={t("mapping.collapseAllGroups")}
      >
        <ChevronsUp className="h-3 w-3" />
      </button>
      <button
        type="button"
        onClick={expandAllGroups}
        disabled={collapsedParentGroups.length === 0}
        className="rounded-md border border-zinc-200 dark:border-white/[0.08] bg-white dark:bg-white/[0.05] p-1 text-zinc-500 dark:text-slate-400 transition-colors hover:bg-brand-50 dark:hover:bg-brand-500/10 hover:border-brand-300 hover:text-brand-500 dark:hover:text-brand-400 disabled:opacity-30"
        title={t("mapping.expandAllGroups")}
      >
        <ChevronsDown className="h-3 w-3" />
      </button>
    </div>
  );
}
