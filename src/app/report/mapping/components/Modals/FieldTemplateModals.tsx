import { X, Save, Pencil } from "lucide-react";
import { useLanguage } from "@/components/language-provider";
import { FieldTemplate } from "@/lib/report/config-schema";

interface FieldTemplateModalsProps {
    creatingFieldTemplate: boolean;
    closeCreateFieldTemplateModal: () => void;
    newFieldTemplateName: string;
    setNewFieldTemplateName: (val: string) => void;
    saveFieldTemplate: () => void;
    savingFieldTemplate: boolean;

    editingFieldTemplatePicker: boolean;
    closeEditFieldTemplatePicker: () => void;
    editPickerTemplateId: string;
    setEditPickerTemplateId: (val: string) => void;
    allFieldTemplates: FieldTemplate[];
    startEditingExistingTemplate: (id: string) => void;
}

export function FieldTemplateModals({
    creatingFieldTemplate,
    closeCreateFieldTemplateModal,
    newFieldTemplateName,
    setNewFieldTemplateName,
    saveFieldTemplate,
    savingFieldTemplate,

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
            {creatingFieldTemplate ? (
                <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4">
                    <div className="w-full max-w-sm space-y-3 rounded-lg bg-white p-4 shadow-xl">
                        <h3 className="text-sm font-semibold">{t("mapping.fieldTemplate.modalTitle")}</h3>
                        <div className="space-y-1">
                            <label className="text-xs text-coral-tree-600" htmlFor="field-template-name-input">
                                {t("mapping.fieldTemplate.name")}
                            </label>
                            <input
                                id="field-template-name-input"
                                value={newFieldTemplateName}
                                onChange={(e) => setNewFieldTemplateName(e.target.value)}
                                className="w-full rounded-md border border-coral-tree-300 px-2 py-1.5 text-sm"
                                placeholder={t("mapping.fieldTemplate.namePlaceholder")}
                                autoFocus
                            />
                        </div>
                        <p className="text-xs text-coral-tree-600">{t("mapping.fieldTemplate.emptyValueHint")}</p>
                        <div className="mt-2 flex justify-end gap-2">
                            <button
                                type="button"
                                onClick={closeCreateFieldTemplateModal}
                                className="flex items-center gap-1.5 rounded-md border border-coral-tree-300 px-3 py-1.5 text-xs hover:bg-coral-tree-50"
                            >
                                <X className="h-3.5 w-3.5" />
                                {t("mapping.fieldTemplate.cancel")}
                            </button>
                            <button
                                type="button"
                                onClick={saveFieldTemplate}
                                disabled={savingFieldTemplate}
                                className="flex items-center gap-1.5 rounded-md bg-coral-tree-700 px-3 py-1.5 text-xs text-white disabled:opacity-50"
                            >
                                <Save className="h-3.5 w-3.5" />
                                {savingFieldTemplate ? t("mapping.fieldTemplate.saving") : t("mapping.fieldTemplate.save")}
                            </button>
                        </div>
                    </div>
                </div>
            ) : null}

            {editingFieldTemplatePicker ? (
                <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4">
                    <div className="w-full max-w-sm space-y-3 rounded-lg bg-white p-4 shadow-xl">
                        <h3 className="text-sm font-semibold">{t("mapping.fieldTemplate.editModalTitle")}</h3>
                        <div className="space-y-1">
                            <label className="text-xs text-coral-tree-600" htmlFor="edit-field-template-select">
                                {t("mapping.selectFieldTemplate")}
                            </label>
                            <select
                                id="edit-field-template-select"
                                value={editPickerTemplateId}
                                onChange={(e) => setEditPickerTemplateId(e.target.value)}
                                className="w-full rounded-md border border-coral-tree-300 px-2 py-1.5 text-sm"
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
                                className="flex items-center gap-1.5 rounded-md border border-coral-tree-300 px-3 py-1.5 text-xs hover:bg-coral-tree-50"
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
