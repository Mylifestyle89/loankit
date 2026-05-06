import { useFieldTemplateSync } from "./use-field-template-sync";
import { useFieldTemplateCrud } from "./use-field-template-crud";
import { useFieldTemplateStore } from "../stores/use-field-template-store";

/**
 * Main field-template hook — composes sync + crud sub-hooks.
 * Re-exports all functions under the original API surface for backward compat.
 */
export function useFieldTemplates({ t }: { t: (key: string) => string }) {
  const { loadFieldTemplates, loadAllFieldTemplates } = useFieldTemplateSync({ t });

  function closeEditFieldTemplatePicker() {
    const ft = useFieldTemplateStore.getState();
    ft.setEditingFieldTemplatePicker(false);
    ft.setEditPickerTemplateId("");
  }

  const crud = useFieldTemplateCrud({
    t,
    loadFieldTemplates,
    loadAllFieldTemplates,
    closeEditFieldTemplatePicker,
  });

  return {
    loadFieldTemplates,
    loadAllFieldTemplates,
    applySelectedFieldTemplate: crud.applySelectedFieldTemplate,
    openEditFieldTemplatePicker: async () => {
      await loadAllFieldTemplates();
      const ft = useFieldTemplateStore.getState();
      ft.setEditPickerTemplateId("");
      ft.setEditingFieldTemplatePicker(true);
    },
    closeEditFieldTemplatePicker,
    startEditingExistingTemplate: crud.startEditingExistingTemplate,
    stopEditingFieldTemplate: crud.stopEditingFieldTemplate,
    assignSelectedFieldTemplate: crud.assignSelectedFieldTemplate,
    saveEditedFieldTemplate: crud.saveEditedFieldTemplate,
    // promoteToMasterTemplate removed (Q2-a: MappingInstance concept deleted)
  };
}
