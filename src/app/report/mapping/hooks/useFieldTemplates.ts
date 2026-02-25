import type { Dispatch, SetStateAction } from "react";
import type { FieldCatalogItem } from "@/lib/report/config-schema";
import type {
  FieldTemplateItem,
  MappingInstanceItem,
  MasterTemplateItem,
} from "../types";
import { normalizeFieldCatalogForSchema } from "../helpers";

type UseFieldTemplatesParams = {
  t: (key: string) => string;
  selectedCustomerId: string;
  selectedFieldTemplateId: string;
  editingFieldTemplateId: string;
  editingFieldTemplateName: string;
  fieldCatalog: FieldCatalogItem[];
  fieldTemplates: FieldTemplateItem[];
  allFieldTemplates: FieldTemplateItem[];
  setFieldTemplates: Dispatch<SetStateAction<FieldTemplateItem[]>>;
  setAllFieldTemplates: Dispatch<SetStateAction<FieldTemplateItem[]>>;
  setLoadingFieldTemplates: Dispatch<SetStateAction<boolean>>;
  setSelectedFieldTemplateId: Dispatch<SetStateAction<string>>;
  setEditingFieldTemplatePicker: Dispatch<SetStateAction<boolean>>;
  setEditPickerTemplateId: Dispatch<SetStateAction<string>>;
  setEditingFieldTemplateId: Dispatch<SetStateAction<string>>;
  setEditingFieldTemplateName: Dispatch<SetStateAction<string>>;
  setSavingEditedTemplate: Dispatch<SetStateAction<boolean>>;
  setFieldCatalog: Dispatch<SetStateAction<FieldCatalogItem[]>>;
  setValues: Dispatch<SetStateAction<Record<string, unknown>>>;
  setManualValues: Dispatch<SetStateAction<Record<string, string | number | boolean | null>>>;
  setMessage: Dispatch<SetStateAction<string>>;
  setError: Dispatch<SetStateAction<string>>;
};

export function useFieldTemplates({
  t,
  selectedCustomerId,
  selectedFieldTemplateId,
  editingFieldTemplateId,
  editingFieldTemplateName,
  fieldCatalog,
  fieldTemplates,
  allFieldTemplates,
  setFieldTemplates,
  setAllFieldTemplates,
  setLoadingFieldTemplates,
  setSelectedFieldTemplateId,
  setEditingFieldTemplatePicker,
  setEditPickerTemplateId,
  setEditingFieldTemplateId,
  setEditingFieldTemplateName,
  setSavingEditedTemplate,
  setFieldCatalog,
  setValues,
  setManualValues,
  setMessage,
  setError,
}: UseFieldTemplatesParams) {
  async function loadFieldTemplates(customerId?: string) {
    setLoadingFieldTemplates(true);
    try {
      const query = customerId ? `?customer_id=${encodeURIComponent(customerId)}` : "";
      const [instancesRes, mastersRes] = await Promise.all([
        fetch(`/api/report/mapping-instances${query}`, { cache: "no-store" }),
        fetch("/api/report/master-templates?with_usage=1", { cache: "no-store" }),
      ]);
      const instancesData = (await instancesRes.json()) as { ok: boolean; error?: string; mapping_instances?: MappingInstanceItem[] };
      const mastersData = (await mastersRes.json()) as { ok: boolean; error?: string; master_templates?: MasterTemplateItem[] };
      if (!instancesData.ok || !mastersData.ok) {
        throw new Error(instancesData.error ?? mastersData.error ?? t("mapping.fieldTemplate.errLoad"));
      }
      const masters = mastersData.master_templates ?? [];
      const instances = instancesData.mapping_instances ?? [];
      if (customerId) {
        const list: FieldTemplateItem[] = instances.map((item) => ({
          id: item.id,
          name: item.name || item.master_snapshot_name || "Template khách hàng",
          created_at: item.updated_at || item.created_at,
          field_catalog: normalizeFieldCatalogForSchema(item.field_catalog ?? []),
          assigned_customer_count: 1,
        }));
        setFieldTemplates(list);
      } else {
        const list: FieldTemplateItem[] = masters.map((master) => ({
          id: master.id,
          name: master.name,
          created_at: master.created_at,
          field_catalog: master.field_catalog,
          assigned_customer_count: master.assigned_customer_count,
        }));
        setFieldTemplates(list);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : t("mapping.fieldTemplate.errLoad"));
    } finally {
      setLoadingFieldTemplates(false);
    }
  }

  async function loadAllFieldTemplates() {
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
      setError(e instanceof Error ? e.message : t("mapping.fieldTemplate.errLoad"));
    }
  }

  function applySelectedFieldTemplate(templateId: string) {
    if (!templateId) {
      setSelectedFieldTemplateId("");
      return;
    }
    const template = fieldTemplates.find((item) => item.id === templateId)
      ?? allFieldTemplates.find((item) => item.id === templateId);
    if (!template) return;
    setEditingFieldTemplateId("");
    setEditingFieldTemplateName("");
    const normalizedCatalog = normalizeFieldCatalogForSchema(template.field_catalog ?? []);
    setFieldCatalog(normalizedCatalog);
    const emptyValues = Object.fromEntries(normalizedCatalog.map((field) => [field.field_key, ""]));
    setManualValues({});
    setValues(emptyValues);
    setSelectedFieldTemplateId(templateId);
  }

  async function openEditFieldTemplatePicker() {
    await loadAllFieldTemplates();
    setEditPickerTemplateId("");
    setEditingFieldTemplatePicker(true);
  }

  function closeEditFieldTemplatePicker() {
    setEditingFieldTemplatePicker(false);
    setEditPickerTemplateId("");
  }

  function startEditingExistingTemplate(templateId: string) {
    if (!templateId) {
      setError(t("mapping.fieldTemplate.errSelectEdit"));
      return;
    }
    const template = allFieldTemplates.find((item) => item.id === templateId);
    if (!template) {
      setError(t("mapping.fieldTemplate.errTemplateNotFound"));
      return;
    }

    setSelectedFieldTemplateId("");
    setFieldTemplates([]);
    const normalizedCatalog = normalizeFieldCatalogForSchema(template.field_catalog ?? []);
    setFieldCatalog(normalizedCatalog);
    const emptyValues = Object.fromEntries(normalizedCatalog.map((field) => [field.field_key, ""]));
    setManualValues({});
    setValues(emptyValues);
    setEditingFieldTemplateId(template.id);
    setEditingFieldTemplateName(template.name);
    setMessage(t("mapping.msg.templateEditing").replace("{name}", template.name));
    closeEditFieldTemplatePicker();
  }

  function stopEditingFieldTemplate() {
    setEditingFieldTemplateId("");
    setEditingFieldTemplateName("");
    if (!selectedCustomerId) {
      setFieldCatalog([]);
      setValues({});
      setManualValues({});
    }
  }

  async function assignSelectedFieldTemplate() {
    if (!selectedCustomerId) {
      setError(t("mapping.fieldTemplate.errSelectCustomer"));
      return;
    }
    if (!selectedFieldTemplateId) {
      setError(t("mapping.fieldTemplate.errSelectAttach"));
      return;
    }
    const selectedMaster = allFieldTemplates.find((item) => item.id === selectedFieldTemplateId);
    if (!selectedMaster) {
      setError("Vui lòng chọn template mẫu (generic) từ thư viện để áp dụng.");
      return;
    }
    setError("");
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
      if (!data.ok) {
        throw new Error(data.error ?? t("mapping.fieldTemplate.errAttach"));
      }
      setMessage(`Đã áp dụng mẫu "${selectedMaster.name}" cho khách hàng này.`);
      await loadFieldTemplates(selectedCustomerId);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("mapping.fieldTemplate.errAttach"));
    }
  }

  async function saveEditedFieldTemplate() {
    if (!editingFieldTemplateId) {
      setError(t("mapping.fieldTemplate.errSelectEdit"));
      return;
    }
    const nextName = editingFieldTemplateName.trim();
    if (!nextName) {
      setError(t("mapping.fieldTemplate.errName"));
      return;
    }

    setSavingEditedTemplate(true);
    setError("");
    try {
      const normalizedCatalog = normalizeFieldCatalogForSchema(fieldCatalog);
      const res = await fetch("/api/report/master-templates", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          master_id: editingFieldTemplateId,
          name: nextName,
          field_catalog: normalizedCatalog,
        }),
      });
      const data = (await res.json()) as { ok: boolean; error?: string };
      if (!data.ok) {
        throw new Error(data.error ?? t("mapping.fieldTemplate.errSave"));
      }
      await loadAllFieldTemplates();
      if (selectedCustomerId) {
        await loadFieldTemplates(selectedCustomerId);
      }
      setMessage(t("mapping.msg.templateUpdated").replace("{name}", nextName));
    } catch (e) {
      setError(e instanceof Error ? e.message : t("mapping.fieldTemplate.errSave"));
    } finally {
      setSavingEditedTemplate(false);
    }
  }

  return {
    loadFieldTemplates,
    loadAllFieldTemplates,
    applySelectedFieldTemplate,
    openEditFieldTemplatePicker,
    closeEditFieldTemplatePicker,
    startEditingExistingTemplate,
    stopEditingFieldTemplate,
    assignSelectedFieldTemplate,
    saveEditedFieldTemplate,
  };
}
