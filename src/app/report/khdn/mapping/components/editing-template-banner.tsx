type EditingTemplateBannerProps = {
  t: (key: string) => string;
  editingFieldTemplateId: string;
  editingFieldTemplateName: string;
  setEditingFieldTemplateName: (value: string) => void;
  saveEditedFieldTemplate: () => void;
  savingEditedTemplate: boolean;
  stopEditingFieldTemplate: () => void | Promise<void>;
  openImportGroupModal: () => void;
  openDeleteGenericTemplateModal: () => void;
  isEditingMaster: boolean;
  promoteToMasterTemplate: () => void;
  promotingToMaster: boolean;
};

export function EditingTemplateBanner({
  t,
  editingFieldTemplateId,
  editingFieldTemplateName,
  setEditingFieldTemplateName,
  saveEditedFieldTemplate,
  savingEditedTemplate,
  stopEditingFieldTemplate,
  openImportGroupModal,
  openDeleteGenericTemplateModal,
  isEditingMaster,
  promoteToMasterTemplate,
  promotingToMaster,
}: EditingTemplateBannerProps) {
  if (!editingFieldTemplateId) return null;
  const secondaryActionClass =
    "rounded-xl border border-slate-200/60 dark:border-white/[0.07] bg-slate-50/50 dark:bg-white/[0.04] px-3 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 transition-all hover:bg-brand-50/30 dark:hover:bg-brand-500/10 active:scale-95";

  return (
    <div className="grid gap-3 rounded-2xl border border-slate-200/60 dark:border-white/[0.07] bg-white/80 dark:bg-[#141414]/90 p-3 shadow-[0_8px_30px_rgb(0,0,0,0.04)] backdrop-blur-md md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
      <div className="flex min-w-0 flex-wrap items-center gap-2 rounded-xl border border-slate-200/60 dark:border-white/[0.07] bg-slate-50/50 dark:bg-white/[0.04] p-2">
        <span className="rounded-xl bg-brand-100 dark:bg-brand-500/10 px-2.5 py-1 text-sm font-semibold text-brand-600 dark:text-brand-400">
          {t("mapping.fieldTemplate.editing")}
        </span>
        {!isEditingMaster && (
          <span className="rounded-lg bg-brand-100 dark:bg-brand-500/10 px-2 py-0.5 text-xs font-medium text-brand-600 dark:text-brand-400">
            Khách hàng
          </span>
        )}
        <input
          value={editingFieldTemplateName}
          onChange={(e) => setEditingFieldTemplateName(e.target.value)}
          aria-label={t("mapping.fieldTemplate.name")}
          placeholder={t("mapping.fieldTemplate.namePlaceholder")}
          className="h-10 min-w-[220px] flex-1 rounded-xl border border-slate-200/60 dark:border-white/[0.09] bg-slate-50/50 dark:bg-white/[0.05] dark:text-slate-100 px-3 text-sm text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40"
        />
      </div>

      <div className="flex flex-wrap items-center gap-2 md:justify-end">
        <button
          type="button"
          onClick={saveEditedFieldTemplate}
          disabled={savingEditedTemplate}
          className="rounded-xl bg-brand-500 px-3 py-2 text-sm font-medium text-white shadow-md transition-all hover:brightness-110 active:scale-95 disabled:pointer-events-none disabled:opacity-50"
        >
          {savingEditedTemplate ? t("mapping.fieldTemplate.saving") : t("mapping.fieldTemplate.update")}
        </button>
        {!isEditingMaster && (
          <button
            type="button"
            onClick={promoteToMasterTemplate}
            disabled={promotingToMaster}
            className="rounded-xl border border-emerald-500 bg-emerald-500 px-3 py-2 text-sm font-semibold text-white shadow-[0_2px_8px_rgba(16,185,129,0.35)] transition-all hover:bg-emerald-600 hover:shadow-[0_4px_12px_rgba(16,185,129,0.4)] active:scale-95 disabled:pointer-events-none disabled:opacity-50 dark:border-emerald-500 dark:shadow-[0_2px_8px_rgba(16,185,129,0.25)] dark:hover:bg-emerald-600"
          >
            {promotingToMaster ? "Đang lưu..." : "Lưu thành template mẫu"}
          </button>
        )}
        <button type="button" onClick={openImportGroupModal} className={secondaryActionClass}>
          Thêm nhóm dữ liệu
        </button>
        <button type="button" onClick={stopEditingFieldTemplate} className={secondaryActionClass}>
          {t("mapping.fieldTemplate.stopEditing")}
        </button>
        {isEditingMaster && (
          <button
            type="button"
            onClick={openDeleteGenericTemplateModal}
            className="rounded-xl border border-rose-600 bg-rose-500 px-3 py-2 text-sm font-semibold text-white shadow-[0_2px_8px_rgba(244,63,94,0.35)] transition-all hover:bg-rose-600 hover:shadow-[0_4px_12px_rgba(244,63,94,0.4)] active:scale-95 dark:border-rose-500 dark:bg-rose-500 dark:text-white dark:shadow-[0_2px_8px_rgba(244,63,94,0.25)] dark:hover:bg-rose-600 dark:hover:shadow-[0_4px_14px_rgba(244,63,94,0.35)]"
          >
            Xóa template mẫu
          </button>
        )}
      </div>
    </div>
  );
}
