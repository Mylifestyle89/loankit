import { normalizeFieldCatalogForSchema } from "../helpers";
import type { FieldTemplateItem, MappingInstanceItem, MasterTemplateItem } from "../types";
import { useMappingDataStore } from "../stores/use-mapping-data-store";
import { useFieldTemplateStore } from "../stores/use-field-template-store";
import { useCustomerStore } from "../stores/use-customer-store";
import { useUiStore } from "../stores/use-ui-store";

export function useFieldTemplates({ t }: { t: (key: string) => string }) {
  /** Unified error handler — avoids repeating the same pattern everywhere. */
  function handleApiError(e: unknown, defaultKey: string) {
    useUiStore.getState().setStatus({ error: e instanceof Error ? e.message : t(defaultKey) });
  }

  async function loadFieldTemplates(customerId?: string) {
    const { setFieldTemplates, setLoadingFieldTemplates } = useFieldTemplateStore.getState();
    setLoadingFieldTemplates(true);
    try {
      const query = customerId ? `?customer_id=${encodeURIComponent(customerId)}` : "";
      const [instancesRes, mastersRes] = await Promise.all([
        fetch(`/api/report/mapping-instances${query}`, { cache: "no-store" }),
        fetch("/api/report/master-templates?with_usage=1", { cache: "no-store" }),
      ]);
      const [instancesData, mastersData] = (await Promise.all([instancesRes.json(), mastersRes.json()])) as [
        { ok: boolean; error?: string; mapping_instances?: MappingInstanceItem[] },
        { ok: boolean; error?: string; master_templates?: MasterTemplateItem[] },
      ];

      if (!instancesData.ok || !mastersData.ok) {
        throw new Error(instancesData.error ?? mastersData.error ?? t("mapping.fieldTemplate.errLoad"));
      }

      const templates: FieldTemplateItem[] = customerId
        ? (instancesData.mapping_instances ?? []).map((item) => ({
            id: item.id,
            name: item.name || item.master_snapshot_name || "Template khách hàng",
            created_at: item.updated_at || item.created_at,
            field_catalog: normalizeFieldCatalogForSchema(item.field_catalog ?? []),
            assigned_customer_count: 1,
          }))
        : (mastersData.master_templates ?? []).map((master) => ({
            id: master.id,
            name: master.name,
            created_at: master.created_at,
            field_catalog: master.field_catalog,
            assigned_customer_count: master.assigned_customer_count,
          }));

      setFieldTemplates(templates);
    } catch (e) {
      handleApiError(e, "mapping.fieldTemplate.errLoad");
    } finally {
      useFieldTemplateStore.getState().setLoadingFieldTemplates(false);
    }
  }

  async function loadAllFieldTemplates() {
    const { setAllFieldTemplates } = useFieldTemplateStore.getState();
    try {
      const res = await fetch("/api/report/master-templates?with_usage=1", { cache: "no-store" });
      const data = (await res.json()) as { ok: boolean; error?: string; master_templates?: MasterTemplateItem[] };
      if (data.ok && Array.isArray(data.master_templates)) {
        setAllFieldTemplates(
          data.master_templates.map((master) => ({
            id: master.id,
            name: master.name,
            created_at: master.created_at,
            field_catalog: master.field_catalog,
            assigned_customer_count: master.assigned_customer_count,
          })),
        );
      }
    } catch (e) {
      handleApiError(e, "mapping.fieldTemplate.errLoad");
    }
  }

  async function applySelectedFieldTemplate(templateId: string) {
    const ft = useFieldTemplateStore.getState();
    const md = useMappingDataStore.getState();
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
    // Set field catalog first, then reload values from disk
    md.setTemplateData(
      normalizedCatalog,
      Object.fromEntries(normalizedCatalog.map((f) => [f.field_key, ""])),
      {},
    );
    ft.setSelectedFieldTemplateId(templateId);
    // Enter editing mode → toolbar shows
    ft.setEditingFieldTemplateId(templateId);
    ft.setEditingFieldTemplateName(template.name);

    // Reload saved values from disk to preserve manually-entered data
    try {
      const res = await fetch("/api/report/values", { cache: "no-store" });
      const data = (await res.json()) as { ok: boolean; manual_values?: Record<string, string | number | boolean | null>; field_formulas?: Record<string, string>; values?: Record<string, unknown> };
      if (data.ok) {
        if (data.manual_values) md.setManualValues(data.manual_values);
        if (data.field_formulas) md.setFormulas(data.field_formulas);
        if (data.values) md.setValues(data.values as Record<string, unknown>);
      }
    } catch { /* values will stay empty if API fails */ }
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
    // Set field catalog first, then reload values from disk
    md.setTemplateData(
      normalizedCatalog,
      Object.fromEntries(normalizedCatalog.map((f) => [f.field_key, ""])),
      {},
    );
    ft.setEditingFieldTemplateId(template.id);
    ft.setEditingFieldTemplateName(template.name);

    // Reload saved values from disk to preserve manually-entered data
    try {
      const res = await fetch("/api/report/values", { cache: "no-store" });
      const data = (await res.json()) as { ok: boolean; manual_values?: Record<string, string | number | boolean | null>; field_formulas?: Record<string, string>; values?: Record<string, unknown> };
      if (data.ok) {
        if (data.manual_values) md.setManualValues(data.manual_values);
        if (data.field_formulas) md.setFormulas(data.field_formulas);
        if (data.values) md.setValues(data.values as Record<string, unknown>);
      }
    } catch { /* values will stay empty if API fails */ }
    useUiStore.getState().setStatus({ message: t("mapping.msg.templateEditing").replace("{name}", template.name) });
    closeEditFieldTemplatePicker();
  }

  function stopEditingFieldTemplate() {
    const ft = useFieldTemplateStore.getState();
    const { selectedCustomerId } = useCustomerStore.getState();
    const md = useMappingDataStore.getState();
    ft.setEditingFieldTemplateId("");
    ft.setEditingFieldTemplateName("");
    ft.setSelectedFieldTemplateId("");
    if (!selectedCustomerId) {
      md.setTemplateData([], {}, {});
    }
  }

  async function assignSelectedFieldTemplate() {
    const ft = useFieldTemplateStore.getState();
    const { selectedCustomerId } = useCustomerStore.getState();
    if (!selectedCustomerId) return useUiStore.getState().setStatus({ error: t("mapping.fieldTemplate.errSelectCustomer") });
    if (!ft.selectedFieldTemplateId) return useUiStore.getState().setStatus({ error: t("mapping.fieldTemplate.errSelectAttach") });
    const selectedMaster = ft.allFieldTemplates.find((i) => i.id === ft.selectedFieldTemplateId);
    if (!selectedMaster) return useUiStore.getState().setStatus({ error: "Vui lòng chọn template mẫu (generic) từ thư viện để áp dụng." });

    useUiStore.getState().setStatus({ error: "" });
    try {
      const res = await fetch("/api/report/mapping-instances", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customer_id: selectedCustomerId, master_id: selectedMaster.id, name: `instance-${Date.now()}` }),
      });
      const data = (await res.json()) as { ok: boolean; error?: string };
      if (!data.ok) throw new Error(data.error ?? t("mapping.fieldTemplate.errAttach"));
      useUiStore.getState().setStatus({ message: `Đã áp dụng mẫu "${selectedMaster.name}" cho khách hàng này.` });
      await loadFieldTemplates(selectedCustomerId);
    } catch (e) {
      handleApiError(e, "mapping.fieldTemplate.errAttach");
    }
  }

  async function saveEditedFieldTemplate() {
    const ft = useFieldTemplateStore.getState();
    const md = useMappingDataStore.getState();
    const { selectedCustomerId } = useCustomerStore.getState();
    if (!ft.editingFieldTemplateId) return useUiStore.getState().setStatus({ error: t("mapping.fieldTemplate.errSelectEdit") });
    const nextName = ft.editingFieldTemplateName.trim();
    if (!nextName) return useUiStore.getState().setStatus({ error: t("mapping.fieldTemplate.errName") });

    // Detect: master template (in allFieldTemplates) or customer instance (in fieldTemplates only)
    const isMaster = ft.allFieldTemplates.some((t) => t.id === ft.editingFieldTemplateId);

    ft.setSavingEditedTemplate(true);
    useUiStore.getState().setStatus({ error: "" });
    try {
      const normalizedCatalog = normalizeFieldCatalogForSchema(md.fieldCatalog);

      // Step 1: Auto-save full state (mapping + alias + values) to avoid data loss
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
          }),
        }),
      ]);

      // Step 2: Update template definition (name + field_catalog) in DB
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
        // Customer-specific instance
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
      useUiStore.getState().setStatus({ message: t("mapping.msg.templateUpdated").replace("{name}", nextName) });
    } catch (e) {
      handleApiError(e, "mapping.fieldTemplate.errSave");
    } finally {
      useFieldTemplateStore.getState().setSavingEditedTemplate(false);
    }
  }

  async function promoteToMasterTemplate(newName?: string) {
    const ft = useFieldTemplateStore.getState();
    const md = useMappingDataStore.getState();

    // Only allow for instances (not masters)
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

      // Step 1: Auto-save current instance state (mapping + alias + values) to prevent data loss
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
          }),
        }),
      ]);

      // Step 2: Create new master template from current field catalog
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

      // Step 3: Also update the instance definition (name + field_catalog)
      await fetch(`/api/report/mapping-instances/${ft.editingFieldTemplateId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: ft.editingFieldTemplateName.trim(), field_catalog: normalizedCatalog }),
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

  function closeEditFieldTemplatePicker() {
    const ft = useFieldTemplateStore.getState();
    ft.setEditingFieldTemplatePicker(false);
    ft.setEditPickerTemplateId("");
  }

  return {
    loadFieldTemplates,
    loadAllFieldTemplates,
    applySelectedFieldTemplate,
    openEditFieldTemplatePicker: async () => {
      await loadAllFieldTemplates();
      const ft = useFieldTemplateStore.getState();
      ft.setEditPickerTemplateId("");
      ft.setEditingFieldTemplatePicker(true);
    },
    closeEditFieldTemplatePicker,
    startEditingExistingTemplate,
    stopEditingFieldTemplate,
    assignSelectedFieldTemplate,
    saveEditedFieldTemplate,
    promoteToMasterTemplate,
  };
}
