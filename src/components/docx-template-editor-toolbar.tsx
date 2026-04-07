"use client";

/**
 * docx-template-editor-toolbar.tsx
 *
 * Placeholder-insertion toolbar for DocxTemplateEditorModal.
 * Shows group/field selectors + insert button + auto-backup status.
 */

import { Copy } from "lucide-react";
import { useLanguage } from "@/components/language-provider";

type FieldCatalogItem = {
  field_key: string;
  label_vi: string;
  group: string;
};

type Props = {
  groups: string[];
  selectedGroup: string;
  onSelectGroup: (group: string) => void;
  fieldsByGroup: Record<string, FieldCatalogItem[]>;
  fieldsInSelectedGroup: FieldCatalogItem[];
  selectedFieldKey: string;
  onSelectFieldKey: (key: string) => void;
  selectedFieldLabel: string;
  onInsert: () => void;
  error: string;
  enableAutoBackup: boolean;
  autoBackupIntervalMs: number;
  lastBackupAt: string;
};

export function DocxTemplateEditorToolbar({
  groups,
  selectedGroup,
  onSelectGroup,
  fieldsByGroup,
  fieldsInSelectedGroup,
  selectedFieldKey,
  onSelectFieldKey,
  selectedFieldLabel,
  onInsert,
  error,
  enableAutoBackup,
  autoBackupIntervalMs,
  lastBackupAt,
}: Props) {
  const { t } = useLanguage();

  return (
    <div className="border-b border-slate-200/70 bg-slate-50/80 px-4 py-3 dark:border-white/[0.07] dark:bg-[#1a1a1a]/80">
      {enableAutoBackup ? (
        <p className="mb-2 text-xs text-slate-500 dark:text-slate-400">
          Auto backup mỗi {Math.round(autoBackupIntervalMs / 1000)} giây
          {lastBackupAt ? ` • Lần gần nhất: ${lastBackupAt}` : ""}
        </p>
      ) : null}
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-slate-600 dark:text-slate-400">
            {t("template.editor.selectGroup")}
          </label>
          <select
            value={selectedGroup}
            onChange={(e) => onSelectGroup(e.target.value)}
            className="min-w-48 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-white/[0.10] dark:bg-[#141414]/80 dark:text-slate-100"
          >
            {groups.map((group) => (
              <option key={group} value={group}>
                {group} ({fieldsByGroup[group]?.length ?? 0})
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-slate-600 dark:text-slate-400">
            {t("template.editor.selectField")}
          </label>
          <select
            value={selectedFieldKey}
            onChange={(e) => onSelectFieldKey(e.target.value)}
            className="min-w-72 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 disabled:opacity-50 dark:border-white/[0.10] dark:bg-[#141414]/80 dark:text-slate-100"
            disabled={fieldsInSelectedGroup.length === 0}
          >
            {fieldsInSelectedGroup.map((field) => (
              <option key={field.field_key} value={field.field_key}>
                {field.label_vi || field.field_key}
              </option>
            ))}
          </select>
        </div>

        <button
          type="button"
          onClick={onInsert}
          disabled={!selectedFieldKey}
          className="flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-brand-600 disabled:opacity-50 dark:bg-brand-500 dark:hover:bg-brand-600"
          title={selectedFieldKey ? `Chèn [${selectedFieldLabel}] vào vị trí con trỏ` : ""}
        >
          <Copy className="h-4 w-4" />
          {t("template.editor.injectButton")}
        </button>

        <p className="text-xs text-slate-500 dark:text-slate-500">
          {t("template.editor.desc")}
        </p>
      </div>
      {error ? (
        <p className="mt-2 text-sm text-red-600 dark:text-rose-400">{error}</p>
      ) : null}
    </div>
  );
}
