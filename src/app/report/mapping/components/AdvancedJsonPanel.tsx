type AdvancedJsonPanelProps = {
  t: (key: string) => string;
  mappingText: string;
  aliasText: string;
  setMappingText: (value: string) => void;
  setAliasText: (value: string) => void;
};

export function AdvancedJsonPanel({ t, mappingText, aliasText, setMappingText, setAliasText }: AdvancedJsonPanelProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <label className="rounded-xl border border-coral-tree-200 bg-white dark:bg-[#0f1629]/90 dark:border-white/[0.07] p-4">
        <div className="mb-2 text-sm font-medium dark:text-slate-200">{t("mapping.file.mapping")} (`mapping_master.json`)</div>
        <textarea
          value={mappingText}
          onChange={(e) => setMappingText(e.target.value)}
          className="h-96 w-full rounded-md border border-coral-tree-300 dark:border-white/[0.09] dark:bg-white/[0.05] dark:text-slate-100 p-2 font-mono text-xs"
        />
      </label>
      <label className="rounded-xl border border-coral-tree-200 bg-white dark:bg-[#0f1629]/90 dark:border-white/[0.07] p-4">
        <div className="mb-2 text-sm font-medium dark:text-slate-200">{t("mapping.file.alias")} (`placeholder_alias_2268.json`)</div>
        <textarea
          value={aliasText}
          onChange={(e) => setAliasText(e.target.value)}
          className="h-96 w-full rounded-md border border-coral-tree-300 dark:border-white/[0.09] dark:bg-white/[0.05] dark:text-slate-100 p-2 font-mono text-xs"
        />
      </label>
    </div>
  );
}
