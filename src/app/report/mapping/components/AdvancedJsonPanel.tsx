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
      <label className="rounded-xl border border-coral-tree-200 bg-white p-4">
        <div className="mb-2 text-sm font-medium">{t("mapping.file.mapping")} (`mapping_master.json`)</div>
        <textarea
          value={mappingText}
          onChange={(e) => setMappingText(e.target.value)}
          className="h-96 w-full rounded-md border border-coral-tree-300 p-2 font-mono text-xs"
        />
      </label>
      <label className="rounded-xl border border-coral-tree-200 bg-white p-4">
        <div className="mb-2 text-sm font-medium">{t("mapping.file.alias")} (`placeholder_alias_2268.json`)</div>
        <textarea
          value={aliasText}
          onChange={(e) => setAliasText(e.target.value)}
          className="h-96 w-full rounded-md border border-coral-tree-300 p-2 font-mono text-xs"
        />
      </label>
    </div>
  );
}
