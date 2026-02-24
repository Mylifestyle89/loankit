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
  openImportGroupModal: () => void;
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
  openImportGroupModal,
}: EditingTemplateBannerProps) {
  if (!editingFieldTemplateId) return null;

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200/70 bg-white/80 px-3 py-2 shadow-sm backdrop-blur-sm">
      <span className="rounded-md bg-indigo-50 px-2 py-1 text-sm font-medium text-indigo-700">
        {t("mapping.fieldTemplate.editing")}
      </span>
      <input
        value={editingFieldTemplateName}
        onChange={(e) => setEditingFieldTemplateName(e.target.value)}
        aria-label={t("mapping.fieldTemplate.name")}
        placeholder={t("mapping.fieldTemplate.namePlaceholder")}
        className="min-w-64 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-800 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-400/30"
      />
      <button
        type="button"
        onClick={saveEditedFieldTemplate}
        disabled={savingEditedTemplate}
        className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white shadow-glow transition-colors hover:bg-indigo-700 disabled:opacity-50"
      >
        {savingEditedTemplate ? t("mapping.fieldTemplate.saving") : t("mapping.fieldTemplate.update")}
      </button>
      <button
        type="button"
        onClick={openImportGroupModal}
        className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100/60"
      >
        Thêm nhóm dữ liệu
      </button>
      <button
        type="button"
        onClick={stopEditingFieldTemplate}
        className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100/60"
      >
        {t("mapping.fieldTemplate.stopEditing")}
      </button>
      <button
        type="button"
        onClick={openBackupFolder}
        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100/60"
      >
        <FolderOpen className="h-4 w-4" />
        Mở backup
      </button>
    </div>
  );
}
