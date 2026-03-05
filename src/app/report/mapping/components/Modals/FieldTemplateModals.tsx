import { X, Pencil } from "lucide-react";
import { useLanguage } from "@/components/language-provider";
import { FieldTemplate } from "@/lib/report/config-schema";

interface FieldTemplateModalsProps {
    editingFieldTemplatePicker: boolean;
    closeEditFieldTemplatePicker: () => void;
    editPickerTemplateId: string;
    setEditPickerTemplateId: (val: string) => void;
    allFieldTemplates: FieldTemplate[];
    startEditingExistingTemplate: (id: string) => void;
}

export function FieldTemplateModals({
    editingFieldTemplatePicker,
    closeEditFieldTemplatePicker,
    editPickerTemplateId,
    setEditPickerTemplateId,
    allFieldTemplates,
    startEditingExistingTemplate,
}: FieldTemplateModalsProps) {
    const { t } = useLanguage();

    return (
        <>
            {editingFieldTemplatePicker ? (
                <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4">
                    <div className="w-full max-w-sm space-y-3 rounded-lg bg-white dark:bg-[#141414]/90 p-4 shadow-xl">
                        <h3 className="text-sm font-semibold dark:text-slate-100">{t("mapping.fieldTemplate.editModalTitle")}</h3>
                        <div className="space-y-1">
                            <label className="text-xs text-coral-tree-600 dark:text-slate-300" htmlFor="edit-field-template-select">
                                {t("mapping.selectFieldTemplate")}
                            </label>
                            <select
                                id="edit-field-template-select"
                                value={editPickerTemplateId}
                                onChange={(e) => setEditPickerTemplateId(e.target.value)}
                                className="w-full rounded-md border border-coral-tree-300 dark:border-white/[0.09] dark:bg-white/[0.05] dark:text-slate-100 px-2 py-1.5 text-sm"
                                autoFocus
                            >
                                <option value="">{t("mapping.fieldTemplate.editPlaceholder")}</option>
                                {allFieldTemplates.map((template) => (
                                    <option key={template.id} value={template.id}>
                                        {template.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="mt-2 flex justify-end gap-2">
                            <button
                                type="button"
                                onClick={closeEditFieldTemplatePicker}
                                className="flex items-center gap-1.5 rounded-md border border-coral-tree-300 dark:border-white/[0.09] dark:text-slate-200 px-3 py-1.5 text-xs hover:bg-coral-tree-50 dark:hover:bg-white/[0.06]"
                            >
                                <X className="h-3.5 w-3.5" />
                                {t("mapping.fieldTemplate.cancel")}
                            </button>
                            <button
                                type="button"
                                onClick={() => startEditingExistingTemplate(editPickerTemplateId)}
                                className="flex items-center gap-1.5 rounded-md bg-coral-tree-700 px-3 py-1.5 text-xs text-white"
                            >
                                <Pencil className="h-3.5 w-3.5" />
                                {t("mapping.fieldTemplate.startEditing")}
                            </button>
                        </div>
                    </div>
                </div>
            ) : null}
        </>
    );
}
