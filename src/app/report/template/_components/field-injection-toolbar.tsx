"use client";

import { useLanguage } from "@/components/language-provider";

type FieldCatalogItem = { field_key: string; label_vi: string; group: string; type: string };
type FieldTemplateItem = { id: string; name: string; field_catalog: FieldCatalogItem[] };

type Props = {
  fieldTemplates: FieldTemplateItem[];
  selectedFieldTemplateId: string;
  onFieldTemplateChange: (id: string) => void;
  groups: string[];
  selectedGroup: string;
  onGroupChange: (g: string) => void;
  fieldsByGroup: Record<string, FieldCatalogItem[]>;
  fieldsInSelectedGroup: FieldCatalogItem[];
  selectedFieldKey: string;
  onFieldKeyChange: (k: string) => void;
  onInject: () => void;
  copyFeedback: string | null;
  fieldCatalogEmpty: boolean;
};

const selectCls = "min-w-48 rounded-lg border border-zinc-200 dark:border-white/[0.09] bg-white dark:bg-[#1a1a1a] dark:text-slate-100 px-3 py-2 text-sm shadow-sm transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/40";

export function FieldInjectionToolbar(props: Props) {
  const { t } = useLanguage();

  return (
    <div className="mt-4">
      <p className="mb-2 text-sm font-medium text-zinc-700 dark:text-slate-300">{t("template.editor.injectHint")}</p>
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1">
          <label className="text-xs text-zinc-500 dark:text-slate-400">{t("mapping.selectFieldTemplate")}</label>
          <select value={props.selectedFieldTemplateId} onChange={(e) => props.onFieldTemplateChange(e.target.value)} aria-label={t("mapping.selectFieldTemplate")} className={`min-w-64 ${selectCls}`}>
            {props.fieldTemplates.map((item) => (
              <option key={item.id} value={item.id}>{item.name}</option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-zinc-500 dark:text-slate-400">{t("template.editor.selectGroup")}</label>
          <select value={props.selectedGroup} onChange={(e) => props.onGroupChange(e.target.value)} aria-label={t("template.editor.selectGroup")} className={selectCls} disabled={!props.selectedFieldTemplateId || props.groups.length === 0}>
            {props.groups.map((group) => (
              <option key={group} value={group}>{group} ({props.fieldsByGroup[group]?.length ?? 0})</option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-zinc-500 dark:text-slate-400">{t("template.editor.selectField")}</label>
          <select value={props.selectedFieldKey} onChange={(e) => props.onFieldKeyChange(e.target.value)} aria-label={t("template.editor.selectField")} className={`min-w-64 ${selectCls}`} disabled={!props.selectedFieldTemplateId || props.fieldsInSelectedGroup.length === 0}>
            {props.fieldsInSelectedGroup.map((field) => (
              <option key={field.field_key} value={field.field_key}>{field.label_vi || field.field_key}</option>
            ))}
          </select>
        </div>
        <button type="button" onClick={props.onInject} disabled={!props.selectedFieldKey} className="rounded-lg bg-gradient-to-r from-violet-600 to-fuchsia-600 px-4 py-2 text-sm font-medium text-white shadow-sm shadow-violet-500/25 transition-all duration-200 hover:shadow-md hover:shadow-violet-500/30 hover:brightness-110 disabled:opacity-50">
          {t("template.editor.injectButton")}
        </button>
        {props.copyFeedback && (
          <span className="text-sm text-emerald-600">{t("template.editor.copied")}: {props.copyFeedback}</span>
        )}
      </div>
      {props.fieldCatalogEmpty && (
        <p className="mt-2 text-xs text-zinc-400 dark:text-slate-500">{t("template.editor.noFields")}</p>
      )}
    </div>
  );
}
