import { normalizeFieldCatalogForSchema } from "../helpers";
import { useMappingDataStore } from "../stores/use-mapping-data-store";
import { useFieldTemplateStore } from "../stores/use-field-template-store";
import { useCustomerStore } from "../stores/use-customer-store";
import { useUiStore } from "../stores/use-ui-store";
import { useFieldTemplateApply } from "./use-field-template-apply";

/**
 * Assign, save and promote field templates (write/mutation operations).
 * Apply/switch operations are in use-field-template-apply.ts.
 * Extracted from useFieldTemplates to keep that file under 300 lines.
 */
export function useFieldTemplateCrud({
  t,
  loadFieldTemplates,
  loadAllFieldTemplates,
  closeEditFieldTemplatePicker,
}: {
  t: (key: string) => string;
  loadFieldTemplates: (customerId?: string) => Promise<void>;
  loadAllFieldTemplates: () => Promise<void>;
  closeEditFieldTemplatePicker: () => void;
}) {
  function handleApiError(e: unknown, defaultKey: string) {
    useUiStore.getState().setStatus({ error: e instanceof Error ? e.message : t(defaultKey) });
  }

  const apply = useFieldTemplateApply({ t, closeEditFieldTemplatePicker });

  async function assignSelectedFieldTemplate() {
    const ft = useFieldTemplateStore.getState();
    const { selectedCustomerId } = useCustomerStore.getState();
    if (!selectedCustomerId)
      return useUiStore
        .getState()
        .setStatus({ error: t("mapping.fieldTemplate.errSelectCustomer") });
    if (!ft.selectedFieldTemplateId)
      return useUiStore
        .getState()
        .setStatus({ error: t("mapping.fieldTemplate.errSelectAttach") });
    const selectedMaster = ft.allFieldTemplates.find((i) => i.id === ft.selectedFieldTemplateId);
    if (!selectedMaster)
      return useUiStore
        .getState()
        .setStatus({ error: "Vui lòng chọn template mẫu (generic) từ thư viện để áp dụng." });

    useUiStore.getState().setStatus({ error: "" });
    try {
      const res = await fetch("/api/report/mapping-instances", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer_id: selectedCustomerId,
          master_id: selectedMaster.id,
          name: `instance-${Date.now()}`,
        }),
      });
      const data = (await res.json()) as { ok: boolean; error?: string };
      if (!data.ok) throw new Error(data.error ?? t("mapping.fieldTemplate.errAttach"));
      useUiStore
        .getState()
        .setStatus({ message: `Đã áp dụng mẫu "${selectedMaster.name}" cho khách hàng này.` });
      await loadFieldTemplates(selectedCustomerId);
    } catch (e) {
      handleApiError(e, "mapping.fieldTemplate.errAttach");
    }
  }

  async function saveEditedFieldTemplate() {
    const ft = useFieldTemplateStore.getState();
    const md = useMappingDataStore.getState();
    const { selectedCustomerId } = useCustomerStore.getState();
    if (!ft.editingFieldTemplateId)
      return useUiStore.getState().setStatus({ error: t("mapping.fieldTemplate.errSelectEdit") });
    const nextName = ft.editingFieldTemplateName.trim();
    if (!nextName)
      return useUiStore.getState().setStatus({ error: t("mapping.fieldTemplate.errName") });

    const isMaster = ft.allFieldTemplates.some((tmpl) => tmpl.id === ft.editingFieldTemplateId);
    ft.setSavingEditedTemplate(true);
    useUiStore.getState().setStatus({ error: "" });
    try {
      const normalizedCatalog = normalizeFieldCatalogForSchema(md.fieldCatalog);
      const mappingInstanceId = isMaster ? undefined : ft.editingFieldTemplateId;

      await Promise.all([
        fetch("/api/report/mapping", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            created_by: "web-user",
            notes: "Auto-saved before template update",
            mapping: JSON.parse(md.mappingText || "{}"),
            alias_map: JSON.parse(md.aliasText || "{}"),
            field_catalog: normalizedCatalog,
            mapping_instance_id: mappingInstanceId,
          }),
        }),
        fetch("/api/report/values", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            manual_values: {
              ...md.manualValues,
              ...Object.fromEntries(Object.entries(md.values).filter(([, v]) => Array.isArray(v))),
            },
            field_formulas: md.formulas,
            mapping_instance_id: mappingInstanceId,
          }),
        }),
      ]);

      if (isMaster) {
        const res = await fetch("/api/report/master-templates", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            master_id: ft.editingFieldTemplateId,
            name: nextName,
            field_catalog: normalizedCatalog,
          }),
        });
        const data = (await res.json()) as { ok: boolean; error?: string };
        if (!data.ok) throw new Error(data.error ?? t("mapping.fieldTemplate.errSave"));
      } else {
        const res = await fetch(`/api/report/mapping-instances/${ft.editingFieldTemplateId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: nextName, field_catalog: normalizedCatalog }),
        });
        const data = (await res.json()) as { ok: boolean; error?: string };
        if (!data.ok) throw new Error(data.error ?? t("mapping.fieldTemplate.errSave"));
      }

      await Promise.all([
        loadAllFieldTemplates(),
        selectedCustomerId ? loadFieldTemplates(selectedCustomerId) : Promise.resolve(),
      ]);
      useUiStore
        .getState()
        .setStatus({ message: t("mapping.msg.templateUpdated").replace("{name}", nextName) });
    } catch (e) {
      handleApiError(e, "mapping.fieldTemplate.errSave");
    } finally {
      useFieldTemplateStore.getState().setSavingEditedTemplate(false);
    }
  }

  async function promoteToMasterTemplate(newName?: string) {
    const ft = useFieldTemplateStore.getState();
    const md = useMappingDataStore.getState();

    const isMaster = ft.allFieldTemplates.some((i) => i.id === ft.editingFieldTemplateId);
    if (isMaster) {
      useUiStore.getState().setStatus({ error: "Template này đã là template mẫu." });
      return;
    }

    const name = (newName ?? ft.editingFieldTemplateName).trim();
    if (!name) {
      useUiStore.getState().setStatus({ error: t("mapping.fieldTemplate.errName") });
      return;
    }

    ft.setPromotingToMaster(true);
    useUiStore.getState().setStatus({ error: "" });
    try {
      const normalizedCatalog = normalizeFieldCatalogForSchema(md.fieldCatalog);

      await Promise.all([
        fetch("/api/report/mapping", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            created_by: "web-user",
            notes: "Auto-saved before promote to master",
            mapping: JSON.parse(md.mappingText || "{}"),
            alias_map: JSON.parse(md.aliasText || "{}"),
            field_catalog: normalizedCatalog,
            mapping_instance_id: ft.editingFieldTemplateId,
          }),
        }),
        fetch("/api/report/values", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            manual_values: {
              ...md.manualValues,
              ...Object.fromEntries(Object.entries(md.values).filter(([, v]) => Array.isArray(v))),
            },
            field_formulas: md.formulas,
            mapping_instance_id: ft.editingFieldTemplateId,
          }),
        }),
      ]);

      const res = await fetch("/api/report/master-templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          description: `Tạo từ template khách hàng`,
          field_catalog: normalizedCatalog,
        }),
      });
      const data = (await res.json()) as { ok: boolean; error?: string };
      if (!data.ok) throw new Error(data.error ?? "Không thể tạo template mẫu.");

      await fetch(`/api/report/mapping-instances/${ft.editingFieldTemplateId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: ft.editingFieldTemplateName.trim(),
          field_catalog: normalizedCatalog,
        }),
      });

      const { selectedCustomerId } = useCustomerStore.getState();
      await Promise.all([
        loadAllFieldTemplates(),
        selectedCustomerId ? loadFieldTemplates(selectedCustomerId) : Promise.resolve(),
      ]);
      useUiStore.getState().setStatus({ message: `Đã lưu template mẫu: "${name}"` });
    } catch (e) {
      handleApiError(e, "mapping.fieldTemplate.errSave");
    } finally {
      useFieldTemplateStore.getState().setPromotingToMaster(false);
    }
  }

  return {
    applySelectedFieldTemplate: apply.applySelectedFieldTemplate,
    startEditingExistingTemplate: apply.startEditingExistingTemplate,
    stopEditingFieldTemplate: apply.stopEditingFieldTemplate,
    assignSelectedFieldTemplate,
    saveEditedFieldTemplate,
    promoteToMasterTemplate,
  };
}
