import { normalizeFieldCatalogForSchema } from "../helpers";
import { useMappingDataStore } from "../stores/use-mapping-data-store";
import { useFieldTemplateStore } from "../stores/use-field-template-store";
import { useCustomerStore } from "../stores/use-customer-store";
import { useUiStore } from "../stores/use-ui-store";

/**
 * Apply, switch and stop editing field templates (load-and-apply operations).
 * Extracted from use-field-template-crud to keep that file under 300 lines.
 */
export function useFieldTemplateApply({
  t,
  closeEditFieldTemplatePicker,
}: {
  t: (key: string) => string;
  closeEditFieldTemplatePicker: () => void;
}) {
  async function applySelectedFieldTemplate(templateId: string) {
    const ft = useFieldTemplateStore.getState();
    const md = useMappingDataStore.getState();
    const { selectedCustomerId } = useCustomerStore.getState();
    if (!templateId) {
      ft.setSelectedFieldTemplateId("");
      ft.setEditingFieldTemplateId("");
      ft.setEditingFieldTemplateName("");
      return;
    }
    const template =
      ft.fieldTemplates.find((i) => i.id === templateId) ??
      ft.allFieldTemplates.find((i) => i.id === templateId);
    if (!template) return;

    const normalizedCatalog = normalizeFieldCatalogForSchema(template.field_catalog ?? []);
    const prevValues = { ...md.values };
    const prevManual = { ...md.manualValues };
    const prevFormulas = { ...md.formulas };

    let diskValues = prevValues;
    let diskManual: Record<string, string | number | boolean | null> = prevManual;
    let diskFormulas = prevFormulas;
    try {
      const query = selectedCustomerId
        ? `?mapping_instance_id=${encodeURIComponent(templateId)}`
        : "";
      const res = await fetch(`/api/report/values${query}`, { cache: "no-store" });
      const data = (await res.json()) as {
        ok: boolean;
        manual_values?: Record<string, string | number | boolean | null>;
        field_formulas?: Record<string, string>;
        values?: Record<string, unknown>;
      };
      if (data.ok) {
        diskValues = { ...prevValues, ...(data.values ?? {}) };
        diskManual = { ...prevManual, ...(data.manual_values ?? {}) };
        diskFormulas = { ...prevFormulas, ...(data.field_formulas ?? {}) };
      }
    } catch { /* keep previous values if API fails */ }

    md.setTemplateData(normalizedCatalog, diskValues, diskManual);
    md.setFormulas(diskFormulas);
    ft.setSelectedFieldTemplateId(templateId);
    ft.setEditingFieldTemplateId(templateId);
    ft.setEditingFieldTemplateName(template.name);
  }

  async function startEditingExistingTemplate(templateId: string) {
    const ft = useFieldTemplateStore.getState();
    const md = useMappingDataStore.getState();
    if (!templateId) {
      useUiStore.getState().setStatus({ error: t("mapping.fieldTemplate.errSelectEdit") });
      return;
    }
    const template = ft.allFieldTemplates.find((i) => i.id === templateId);
    if (!template) {
      useUiStore.getState().setStatus({ error: t("mapping.fieldTemplate.errTemplateNotFound") });
      return;
    }
    ft.setSelectedFieldTemplateId("");
    ft.setFieldTemplates([]);
    const normalizedCatalog = normalizeFieldCatalogForSchema(template.field_catalog ?? []);

    const prevValues = { ...md.values };
    const prevManual = { ...md.manualValues };
    const prevFormulas = { ...md.formulas };

    let diskValues = prevValues;
    let diskManual: Record<string, string | number | boolean | null> = prevManual;
    let diskFormulas = prevFormulas;
    try {
      const res = await fetch("/api/report/values", { cache: "no-store" });
      const data = (await res.json()) as {
        ok: boolean;
        manual_values?: Record<string, string | number | boolean | null>;
        field_formulas?: Record<string, string>;
        values?: Record<string, unknown>;
      };
      if (data.ok) {
        diskValues = { ...prevValues, ...(data.values ?? {}) };
        diskManual = { ...prevManual, ...(data.manual_values ?? {}) };
        diskFormulas = { ...prevFormulas, ...(data.field_formulas ?? {}) };
      }
    } catch { /* keep previous values if API fails */ }

    md.setTemplateData(normalizedCatalog, diskValues, diskManual);
    md.setFormulas(diskFormulas);
    ft.setEditingFieldTemplateId(template.id);
    ft.setEditingFieldTemplateName(template.name);
    useUiStore
      .getState()
      .setStatus({ message: t("mapping.msg.templateEditing").replace("{name}", template.name) });
    closeEditFieldTemplatePicker();
  }

  async function stopEditingFieldTemplate() {
    const ft = useFieldTemplateStore.getState();
    const { selectedCustomerId } = useCustomerStore.getState();
    const md = useMappingDataStore.getState();

    try {
      const repeaterData: Record<string, unknown> = {};
      for (const [key, val] of Object.entries(md.values)) {
        if (Array.isArray(val)) repeaterData[key] = val;
      }
      const hasData =
        Object.keys(md.manualValues).length > 0 || Object.keys(repeaterData).length > 0;
      if (hasData) {
        const candidateId = ft.selectedFieldTemplateId || ft.editingFieldTemplateId;
        const mappingInstanceId =
          selectedCustomerId &&
          candidateId &&
          ft.fieldTemplates.some((template) => template.id === candidateId)
            ? candidateId
            : undefined;
        await fetch("/api/report/values", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            manual_values: { ...md.manualValues, ...repeaterData },
            field_formulas: md.formulas,
            mapping_instance_id: mappingInstanceId,
          }),
        });
      }
    } catch { /* best-effort save */ }

    ft.setEditingFieldTemplateId("");
    ft.setEditingFieldTemplateName("");
    ft.setSelectedFieldTemplateId("");
    if (!selectedCustomerId) {
      md.setFieldCatalog([]);
    }
  }

  return { applySelectedFieldTemplate, startEditingExistingTemplate, stopEditingFieldTemplate };
}
