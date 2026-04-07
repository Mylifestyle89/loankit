type MappingTabSwitchProps = {
  t: (key: string) => string;
  activeTab: "visual" | "advanced";
  setActiveTab: (tab: "visual" | "advanced") => void;
};

export function MappingTabSwitch({ t, activeTab, setActiveTab }: MappingTabSwitchProps) {
  return (
    <div className="flex gap-2">
      <button
        type="button"
        onClick={() => setActiveTab("visual")}
        className={`rounded-md px-3 py-1.5 text-sm ${activeTab === "visual" ? "bg-brand-500 text-white" : "border border-zinc-200 hover:bg-brand-50/30"}`}
      >
        {t("mapping.tab.visual")}
      </button>
      <button
        type="button"
        onClick={() => setActiveTab("advanced")}
        className={`rounded-md px-3 py-1.5 text-sm ${activeTab === "advanced" ? "bg-brand-500 text-white" : "border border-zinc-200 hover:bg-brand-50/30"}`}
      >
        {t("mapping.tab.advanced")}
      </button>
    </div>
  );
}
