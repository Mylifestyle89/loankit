import type { Dispatch, SetStateAction } from "react";
import type { FieldCatalogItem } from "@/lib/report/config-schema";
import type { FieldTemplateItem, FieldTemplatesResponse } from "../types";
import { normalizeFieldCatalogForSchema } from "../helpers";

type UseFieldTemplatesParams = {
  t: (key: string) => string;
  selectedCustomerId: string;
  selectedFieldTemplateId: string;
  editingFieldTemplateId: string;
  editingFieldTemplateName: string;
  newFieldTemplateName: string;
  fieldCatalog: FieldCatalogItem[];
  allFieldTemplates: FieldTemplateItem[];
  setFieldTemplates: Dispatch<SetStateAction<FieldTemplateItem[]>>;
  setAllFieldTemplates: Dispatch<SetStateAction<FieldTemplateItem[]>>;
  setLoadingFieldTemplates: Dispatch<SetStateAction<boolean>>;
  setSelectedFieldTemplateId: Dispatch<SetStateAction<string>>;
  setCreatingFieldTemplate: Dispatch<SetStateAction<boolean>>;
  setNewFieldTemplateName: Dispatch<SetStateAction<string>>;
  setSavingFieldTemplate: Dispatch<SetStateAction<boolean>>;
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
  newFieldTemplateName,
  fieldCatalog,
  allFieldTemplates,
  setFieldTemplates,
  setAllFieldTemplates,
  setLoadingFieldTemplates,
  setSelectedFieldTemplateId,
  setCreatingFieldTemplate,
  setNewFieldTemplateName,
  setSavingFieldTemplate,
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
      const res = await fetch(`/api/report/field-templates${query}`, { cache: "no-store" });
      const data = (await res.json()) as FieldTemplatesResponse;
      if (data.ok && Array.isArray(data.field_templates)) {
        setFieldTemplates(data.field_templates);
      }
    } catch (e) {
      console.error("Failed to load field templates:", e);
    } finally {
      setLoadingFieldTemplates(false);
    }
  }

  async function loadAllFieldTemplates() {
    try {
      const res = await fetch("/api/report/field-templates", { cache: "no-store" });
      const data = (await res.json()) as FieldTemplatesResponse;
      if (data.ok && Array.isArray(data.field_templates)) {
        setAllFieldTemplates(data.field_templates);
      }
    } catch (e) {
      console.error("Failed to load all field templates:", e);
    }
  }

  function applySelectedFieldTemplate(templateId: string) {
    if (!templateId) {
      setSelectedFieldTemplateId("");
      return;
    }
    const template = allFieldTemplates.find((item) => item.id === templateId);
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

  function openCreateFieldTemplateModal() {
    setCreatingFieldTemplate(true);
    setNewFieldTemplateName("");
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

  function closeCreateFieldTemplateModal() {
    setCreatingFieldTemplate(false);
    setNewFieldTemplateName("");
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
    setError("");
    try {
      const res = await fetch("/api/report/field-templates", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer_id: selectedCustomerId,
          template_id: selectedFieldTemplateId,
        }),
      });
      const data = (await res.json()) as { ok: boolean; error?: string };
      if (!data.ok) {
        throw new Error(data.error ?? t("mapping.fieldTemplate.errAttach"));
      }
      const attached = allFieldTemplates.find((item) => item.id === selectedFieldTemplateId);
      if (attached) {
        setMessage(`Đã áp dụng mẫu "${attached.name}" cho khách hàng này.`);
      }
      await loadFieldTemplates(selectedCustomerId);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("mapping.fieldTemplate.errAttach"));
    }
  }

  async function saveFieldTemplate() {
    const name = newFieldTemplateName.trim();
    if (!name) {
      setError(t("mapping.fieldTemplate.errName"));
      return;
    }
    setSavingFieldTemplate(true);
    setError("");
    try {
      const res = await fetch("/api/report/field-templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          field_catalog: [],
          customer_id: selectedCustomerId,
        }),
      });
      const data = (await res.json()) as FieldTemplatesResponse;
      if (!data.ok) {
        throw new Error(data.error ?? t("mapping.fieldTemplate.errSave"));
      }
      if (selectedCustomerId) {
        await loadFieldTemplates(selectedCustomerId);
      } else {
        await loadAllFieldTemplates();
      }
      if (data.field_template) {
        setFieldCatalog([]);
        setValues({});
        setManualValues({});
        setSelectedFieldTemplateId(data.field_template.id);
        setEditingFieldTemplateId(data.field_template.id);
        setEditingFieldTemplateName(data.field_template.name);
      }
      setMessage(t("mapping.msg.templateSaved").replace("{name}", name));
      closeCreateFieldTemplateModal();
    } catch (e) {
      setError(e instanceof Error ? e.message : t("mapping.fieldTemplate.errSave"));
    } finally {
      setSavingFieldTemplate(false);
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
      const res = await fetch("/api/report/field-templates", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          template_id: editingFieldTemplateId,
          name: nextName,
          field_catalog: normalizedCatalog,
        }),
      });
      const data = (await res.json()) as FieldTemplatesResponse;
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
    openCreateFieldTemplateModal,
    openEditFieldTemplatePicker,
    closeEditFieldTemplatePicker,
    startEditingExistingTemplate,
    stopEditingFieldTemplate,
    closeCreateFieldTemplateModal,
    assignSelectedFieldTemplate,
    saveFieldTemplate,
    saveEditedFieldTemplate,
  };
}
