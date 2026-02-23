import { FolderOpen } from "lucide-react";

type EditingTemplateBannerProps = {
  t: (key: string) => string;
  editingFieldTemplateId: string;
  editingFieldTemplateName: string;
  setEditingFieldTemplateName: (value: string) => void;
  saveEditedFieldTemplate: () => void;
  savingEditedTemplate: boolean;
  stopEditingFieldTemplate: () => void;
  openBackupFolder: () => void;
};

export function EditingTemplateBanner({
  t,
  editingFieldTemplateId,
  editingFieldTemplateName,
  setEditingFieldTemplateName,
  saveEditedFieldTemplate,
  savingEditedTemplate,
  stopEditingFieldTemplate,
  openBackupFolder,
}: EditingTemplateBannerProps) {
  if (!editingFieldTemplateId) return null;

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2">
      <span className="text-sm font-medium text-amber-900">{t("mapping.fieldTemplate.editing")}</span>
      <input
        value={editingFieldTemplateName}
        onChange={(e) => setEditingFieldTemplateName(e.target.value)}
        aria-label={t("mapping.fieldTemplate.name")}
        placeholder={t("mapping.fieldTemplate.namePlaceholder")}
        className="min-w-64 rounded-md border border-amber-300 px-2 py-1.5 text-sm"
      />
      <button
        type="button"
        onClick={saveEditedFieldTemplate}
        disabled={savingEditedTemplate}
        className="rounded-md bg-coral-tree-700 px-3 py-1.5 text-sm text-white disabled:opacity-50"
      >
        {savingEditedTemplate ? t("mapping.fieldTemplate.saving") : t("mapping.fieldTemplate.update")}
      </button>
      <button
        type="button"
        onClick={stopEditingFieldTemplate}
        className="rounded-md border border-coral-tree-300 px-3 py-1.5 text-sm hover:bg-coral-tree-50"
      >
        {t("mapping.fieldTemplate.stopEditing")}
      </button>
      <button
        type="button"
        onClick={openBackupFolder}
        className="inline-flex items-center gap-1.5 rounded-md border border-coral-tree-300 px-3 py-1.5 text-sm hover:bg-coral-tree-50"
      >
        <FolderOpen className="h-4 w-4" />
        Mở backup
      </button>
    </div>
  );
}
