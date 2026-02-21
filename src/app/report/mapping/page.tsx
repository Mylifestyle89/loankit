"use client";

import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as XLSX from "xlsx";
import {
  Plus,
  Pencil,
  X,
  Upload,
  Download,
  Save,
  Send,
  CheckCircle,
  FileText,
  Users,
  Trash2,
  ChevronUp,
  ChevronDown,
  ChevronsUp,
  ChevronsDown,
  Layers,
} from "lucide-react";

import { useLanguage } from "@/components/language-provider";
import type { FieldCatalogItem } from "@/lib/report/config-schema";

type MappingApiResponse = {
  ok: boolean;
  error?: string;
  active_version_id?: string;
  versions?: Array<{ id: string; status: "draft" | "published"; created_at: string; notes?: string }>;
  mapping?: unknown;
  alias_map?: unknown;
};

type ValidationResponse = {
  ok: boolean;
  error?: string;
  validation?: {
    is_valid?: boolean;
    errors_count?: number;
    warnings_count?: number;
    errors?: unknown[];
    warnings?: unknown[];
  };
};

type ValuesResponse = {
  ok: boolean;
  error?: string;
  field_catalog?: FieldCatalogItem[];
  auto_values?: Record<string, unknown>;
  values?: Record<string, unknown>;
  manual_values?: Record<string, string | number | boolean | null>;
};

type FieldTemplateItem = {
  id: string;
  name: string;
  created_at: string;
  field_catalog: FieldCatalogItem[];
};

type FieldTemplatesResponse = {
  ok: boolean;
  error?: string;
  field_templates?: FieldTemplateItem[];
  field_template?: FieldTemplateItem;
};

import { FieldRow } from "./components/FieldRow";
import { MappingSidebar } from "./components/MappingSidebar";
import {
  buildInternalFieldKey,
  removeVietnameseTones,
  slugifyBusinessText,
  toBusinessType,
  toInternalType,
  normalizeInputByType,
  typeLabelKey,
  TypeLabelMap,
} from "./helpers";

export default function MappingPage() {
  const { t } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [validating, setValidating] = useState(false);
  const [message, setMessage] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [activeVersionId, setActiveVersionId] = useState<string>("");
  const [versions, setVersions] = useState<MappingApiResponse["versions"]>([]);
  const [mappingText, setMappingText] = useState("");
  const [aliasText, setAliasText] = useState("");
  const [validation, setValidation] = useState<ValidationResponse["validation"]>();
  const [fieldCatalog, setFieldCatalog] = useState<FieldCatalogItem[]>([]);
  const [autoValues, setAutoValues] = useState<Record<string, unknown>>({});
  const [values, setValues] = useState<Record<string, unknown>>({});
  const [manualValues, setManualValues] = useState<Record<string, string | number | boolean | null>>({});
  const [exportingDocx, setExportingDocx] = useState(false);
  const [activeTab, setActiveTab] = useState<"visual" | "advanced">("visual");
  const [searchTerm, setSearchTerm] = useState("");
  const [showTechnicalKeys, setShowTechnicalKeys] = useState(false);
  const [lastExportedDocxPath, setLastExportedDocxPath] = useState<string>("");
  const [selectedGroup, setSelectedGroup] = useState<string>("");
  const [newField, setNewField] = useState<{
    label_vi: string;
    group: string;
    type: "string" | "number" | "percent" | "date" | "table";
  }>({
    label_vi: "",
    group: "Nhóm mới",
    type: "string",
  });
  const [addingFieldModal, setAddingFieldModal] = useState(false);
  const newFieldSectionRef = useRef<HTMLDivElement | null>(null);
  const importInputRef = useRef<HTMLInputElement | null>(null);
  const [importingCatalog, setImportingCatalog] = useState(false);
  const [editingGroup, setEditingGroup] = useState<string | null>(null);
  const [editingGroupValue, setEditingGroupValue] = useState("");
  const [editingGroupError, setEditingGroupError] = useState("");
  const [customGroups, setCustomGroups] = useState<string[]>([]);
  const [changingFieldGroup, setChangingFieldGroup] = useState<string | null>(null);
  const [changingFieldGroupValue, setChangingFieldGroupValue] = useState("");
  const [changingFieldGroupNewName, setChangingFieldGroupNewName] = useState("");
  const [mergingGroups, setMergingGroups] = useState(false);
  const [mergeSourceGroups, setMergeSourceGroups] = useState<string[]>([]);
  const [mergeTargetGroup, setMergeTargetGroup] = useState("");
  const [mergeOrderMode, setMergeOrderMode] = useState<"keep" | "alpha">("keep");
  const [mergeGroupsError, setMergeGroupsError] = useState("");
  const [collapsedParentGroups, setCollapsedParentGroups] = useState<string[]>([]);
  const [customers, setCustomers] = useState<Array<{ id: string; customer_name: string; customer_code: string }>>([]);
  const [loadingCustomers, setLoadingCustomers] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>("");
  const [fieldTemplates, setFieldTemplates] = useState<FieldTemplateItem[]>([]);
  const [allFieldTemplates, setAllFieldTemplates] = useState<FieldTemplateItem[]>([]);
  const [loadingFieldTemplates, setLoadingFieldTemplates] = useState(false);
  const [selectedFieldTemplateId, setSelectedFieldTemplateId] = useState("");
  const [creatingFieldTemplate, setCreatingFieldTemplate] = useState(false);
  const [newFieldTemplateName, setNewFieldTemplateName] = useState("");
  const [savingFieldTemplate, setSavingFieldTemplate] = useState(false);

  const [editingFieldTemplatePicker, setEditingFieldTemplatePicker] = useState(false);
  const [editPickerTemplateId, setEditPickerTemplateId] = useState("");
  const [editingFieldTemplateId, setEditingFieldTemplateId] = useState("");
  const [editingFieldTemplateName, setEditingFieldTemplateName] = useState("");
  const [savingEditedTemplate, setSavingEditedTemplate] = useState(false);

  const loadFieldValues = useCallback(async () => {
    const res = await fetch("/api/report/values", { cache: "no-store" });
    const data = (await res.json()) as ValuesResponse;
    if (!data.ok) {
      setError(data.error ?? t("mapping.err.loadData"));
      return;
    }
    setFieldCatalog(data.field_catalog ?? []);
    setAutoValues(data.auto_values ?? {});
    setValues(data.values ?? {});
    setManualValues(data.manual_values ?? {});
  }, [t]);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");
    const res = await fetch("/api/report/mapping", { cache: "no-store" });
    const data = (await res.json()) as MappingApiResponse;
    if (!data.ok) {
      setError(data.error ?? t("mapping.err.loadData"));
      setLoading(false);
      return;
    }
    setActiveVersionId(data.active_version_id ?? "");
    setVersions(data.versions ?? []);
    setMappingText(JSON.stringify(data.mapping ?? {}, null, 2));
    setAliasText(JSON.stringify(data.alias_map ?? {}, null, 2));
    await loadFieldValues();
    setLoading(false);
  }, [loadFieldValues, t]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  useEffect(() => {
    void loadCustomers();
    void loadAllFieldTemplates();
  }, []);

  useEffect(() => {
    if (editingFieldTemplateId) {
      return;
    }
    if (!selectedCustomerId) {
      setFieldTemplates([]);
      setSelectedFieldTemplateId("");
      setFieldCatalog([]);
      setValues({});
      setManualValues({});
      return;
    }
    setSelectedFieldTemplateId("");
    setFieldCatalog([]);
    setValues({});
    setManualValues({});
    void loadFieldTemplates(selectedCustomerId);
  }, [editingFieldTemplateId, selectedCustomerId]);

  async function loadCustomers() {
    setLoadingCustomers(true);
    try {
      const res = await fetch("/api/customers", { cache: "no-store" });
      const data = (await res.json()) as {
        ok: boolean;
        error?: string;
        customers?: Array<{ id: string; customer_name: string; customer_code: string }>;
      };
      if (data.ok && data.customers) {
        setCustomers(data.customers);
      }
    } catch (e) {
      console.error("Failed to load customers:", e);
    } finally {
      setLoadingCustomers(false);
    }
  }

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
    setFieldCatalog(template.field_catalog ?? []);
    const emptyValues = Object.fromEntries((template.field_catalog ?? []).map((field) => [field.field_key, ""]));
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

    setSelectedCustomerId("");
    setSelectedFieldTemplateId("");
    setFieldTemplates([]);
    setFieldCatalog(template.field_catalog ?? []);
    const emptyValues = Object.fromEntries((template.field_catalog ?? []).map((field) => [field.field_key, ""]));
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
          field_catalog: [], // START WITH EMPTY CATALOG
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
      const res = await fetch("/api/report/field-templates", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          template_id: editingFieldTemplateId,
          name: nextName,
          field_catalog: fieldCatalog,
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

  const activeVersion = useMemo(
    () => versions?.find((item) => item.id === activeVersionId),
    [activeVersionId, versions],
  );

  const visibleFieldCatalog = useMemo(
    () => (editingFieldTemplateId || (selectedCustomerId && selectedFieldTemplateId) ? fieldCatalog : []),
    [editingFieldTemplateId, fieldCatalog, selectedCustomerId, selectedFieldTemplateId],
  );

  const groupedFields = useMemo(() => {
    const normalizedQuery = searchTerm.trim().toLowerCase();
    const groups = new Map<string, FieldCatalogItem[]>();
    for (const item of visibleFieldCatalog) {
      if (normalizedQuery) {
        const inLabel = item.label_vi.toLowerCase().includes(normalizedQuery);
        const inKey = item.field_key.toLowerCase().includes(normalizedQuery);
        const inGroup = item.group.toLowerCase().includes(normalizedQuery);
        if (!inLabel && !inKey && !inGroup) {
          continue;
        }
      }
      const list = groups.get(item.group) ?? [];
      list.push(item);
      groups.set(item.group, list);
    }
    return Array.from(groups.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [searchTerm, visibleFieldCatalog]);

  const hasContext = !!selectedCustomerId || !!editingFieldTemplateId;

  const groupedFieldTree = useMemo(() => {
    const tree = new Map<string, Array<{ fullPath: string; subgroup: string; fields: FieldCatalogItem[] }>>();
    const groupedFieldMap = new Map(groupedFields);

    // Keep empty custom groups/subgroups visible even when they have no fields yet.
    const baseGroupPaths = new Set<string>([...groupedFieldMap.keys(), ...customGroups.map((group) => group.trim()).filter(Boolean)]);
    const normalizedQuery = searchTerm.trim().toLowerCase();

    for (const groupPath of baseGroupPaths) {
      if (normalizedQuery && !groupPath.toLowerCase().includes(normalizedQuery)) {
        // When searching, keep behavior intuitive for empty subgroups by matching path text.
        if (!groupedFieldMap.has(groupPath)) {
          continue;
        }
      }
      const fields = groupedFieldMap.get(groupPath) ?? [];
      const parts = groupPath
        .split("/")
        .map((part) => part.trim())
        .filter((part) => part.length > 0);
      const parent = parts[0] ?? groupPath;
      const subgroup = parts.slice(1).join("/");
      const siblings = tree.get(parent) ?? [];
      siblings.push({ fullPath: groupPath, subgroup, fields });
      tree.set(parent, siblings);
    }

    return Array.from(tree.entries())
      .map(([parent, children]) => ({
        parent,
        children: children.sort((a, b) => {
          if (!a.subgroup && b.subgroup) return -1;
          if (a.subgroup && !b.subgroup) return 1;
          return a.subgroup.localeCompare(b.subgroup, "vi");
        }),
      }))
      .sort((a, b) => a.parent.localeCompare(b.parent, "vi"));
  }, [customGroups, groupedFields, searchTerm]);

  const parentGroups = useMemo(() => groupedFieldTree.map((node) => node.parent), [groupedFieldTree]);

  const existingGroups = useMemo(() => {
    const groups = new Set([...fieldCatalog.map((item) => item.group), ...customGroups]);
    return Array.from(groups).sort((a, b) => a.localeCompare(b, "vi"));
  }, [fieldCatalog, customGroups]);

  const mergePreview = useMemo(() => {
    const selected = new Set(mergeSourceGroups);
    const fieldCount = fieldCatalog.reduce((count, item) => (selected.has(item.group) ? count + 1 : count), 0);
    return {
      groupCount: mergeSourceGroups.length,
      fieldCount,
      targetGroup: mergeTargetGroup.trim(),
    };
  }, [fieldCatalog, mergeSourceGroups, mergeTargetGroup]);

  async function saveDraft() {
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const mapping = JSON.parse(mappingText);
      const alias_map = JSON.parse(aliasText);
      const res = await fetch("/api/report/mapping", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          created_by: "web-user",
          notes: "Saved from mapping editor",
          mapping,
          alias_map,
          field_catalog: fieldCatalog,
        }),
      });
      const data = (await res.json()) as MappingApiResponse;
      if (!data.ok) {
        throw new Error(data.error ?? t("mapping.err.saveDraft"));
      }
      let msg = `${t("mapping.msg.savedDraft")} ${data.active_version_id}`;
      const customerRes = await fetch("/api/customers/from-draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ values }),
      });
      const customerData = (await customerRes.json()) as {
        ok?: boolean;
        error?: string;
        created?: boolean;
        message?: string;
      };
      if (customerData.ok) {
        msg += `. ${customerData.created ? t("mapping.msg.customerCreated") : t("mapping.msg.customerUpdated")}`;
      } else if (customerRes.status === 400) {
        msg += `. ${t("mapping.msg.customerSkippedNoName")}`;
      } else if (!customerData.ok) {
        msg += `. ${t("mapping.msg.customerSaveFailed")}: ${customerData.error ?? ""}`;
      }
      setMessage(msg);
      await loadData();
    } catch (e) {
      setError(e instanceof Error ? e.message : t("mapping.err.invalidJson"));
    } finally {
      setSaving(false);
    }
  }

  async function publishActive() {
    if (!activeVersionId) {
      return;
    }
    setPublishing(true);
    setError("");
    setMessage("");
    const res = await fetch("/api/report/mapping", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "publish", version_id: activeVersionId }),
    });
    const data = (await res.json()) as MappingApiResponse;
    if (!data.ok) {
      setError(data.error ?? t("mapping.err.publish"));
      setPublishing(false);
      return;
    }
    setMessage(`${t("mapping.msg.published")} ${activeVersionId}`);
    await loadData();
    setPublishing(false);
  }

  async function runValidate() {
    setValidating(true);
    setError("");
    const res = await fetch("/api/report/validate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ run_build: true }),
    });
    const data = (await res.json()) as ValidationResponse;
    if (!data.ok) {
      setError(data.error ?? t("mapping.err.validate"));
    } else {
      setValidation(data.validation);
      setMessage(t("mapping.msg.validated"));
    }
    await loadFieldValues();
    setValidating(false);
  }

  async function exportAndOpenDocx() {
    setExportingDocx(true);
    setError("");
    setMessage("");
    const timestamp = Date.now();
    const outputPath = `report_assets/report_preview_editor_${timestamp}.docx`;
    const reportPath = `report_assets/template_export_report_editor_${timestamp}.json`;
    const res = await fetch("/api/report/export", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        output_path: outputPath,
        report_path: reportPath,
      }),
    });
    const data = (await res.json()) as { ok: boolean; error?: string; output_path?: string };
    if (!data.ok) {
      setError(data.error ?? t("mapping.err.exportDocx"));
      setExportingDocx(false);
      return;
    }
    const filePath = data.output_path ?? outputPath;
    setLastExportedDocxPath(filePath);
    setMessage(t("mapping.msg.exportDocxDone"));
    const openUrl = `/api/report/file?path=${encodeURIComponent(filePath)}&download=0&ts=${Date.now()}`;
    window.open(openUrl, "_blank", "noopener,noreferrer");
    setExportingDocx(false);
  }

  const onManualChange = useCallback((field: FieldCatalogItem, rawValue: string) => {
    const normalized = normalizeInputByType(rawValue, field.type);
    setManualValues((prev) => ({ ...prev, [field.field_key]: normalized }));
    setValues((prev) => ({ ...prev, [field.field_key]: normalized }));
  }, []);

  const moveField = useCallback((fieldKey: string, direction: "up" | "down") => {
    setFieldCatalog((prev) => {
      const index = prev.findIndex((f) => f.field_key === fieldKey);
      if (index === -1) return prev;
      const group = prev[index].group;

      let swapIndex = index;
      if (direction === "up") {
        for (let i = index - 1; i >= 0; i -= 1) {
          if (prev[i].group === group) {
            swapIndex = i;
            break;
          }
        }
      } else {
        for (let i = index + 1; i < prev.length; i += 1) {
          if (prev[i].group === group) {
            swapIndex = i;
            break;
          }
        }
      }

      if (swapIndex === index) return prev;

      const next = [...prev];
      const tmp = next[index];
      next[index] = next[swapIndex];
      next[swapIndex] = tmp;
      return next;
    });
  }, []);

  const deleteField = useCallback((fieldKey: string) => {
    if (!window.confirm(t("mapping.deleteFieldConfirm"))) return;
    setFieldCatalog((prev) => prev.filter((f) => f.field_key !== fieldKey));
    setValues((prev) => {
      const next = { ...prev };
      delete next[fieldKey];
      return next;
    });
    setManualValues((prev) => {
      const next = { ...prev };
      delete next[fieldKey];
      return next;
    });
    setMappingText((prevTxt) => {
      try {
        const mappingObj = JSON.parse(prevTxt);
        if (mappingObj && Array.isArray(mappingObj.mappings)) {
          mappingObj.mappings = mappingObj.mappings.filter((m: any) => m.template_field !== fieldKey);
          return JSON.stringify(mappingObj, null, 2);
        }
      } catch (e) {
        console.error("Failed to update mappingText on field delete", e);
      }
      return prevTxt;
    });
    setMessage(t("mapping.msg.fieldDeleted"));
  }, [t]);

  const openChangeGroupModal = useCallback((fieldKey: string) => {
    const field = fieldCatalog.find((f) => f.field_key === fieldKey);
    if (!field) return;
    setChangingFieldGroup(fieldKey);
    setChangingFieldGroupValue("");
    setChangingFieldGroupNewName("");
  }, [fieldCatalog]);

  function closeChangeGroupModal() {
    setChangingFieldGroup(null);
    setChangingFieldGroupValue("");
    setChangingFieldGroupNewName("");
  }

  function applyChangeGroup() {
    if (!changingFieldGroup) {
      return;
    }
    const field = fieldCatalog.find((f) => f.field_key === changingFieldGroup);
    if (!field) return;

    let targetGroup = changingFieldGroupValue.trim();
    if (targetGroup === "__create_new__") {
      targetGroup = changingFieldGroupNewName.trim();
      if (!targetGroup) {
        return;
      }
      // Add to custom groups if not exists
      if (!existingGroups.includes(targetGroup)) {
        setCustomGroups((prev) => (prev.includes(targetGroup) ? prev : [...prev, targetGroup]));
      }
    }

    setFieldCatalog((prev) =>
      prev.map((item) =>
        item.field_key === changingFieldGroup ? { ...item, group: targetGroup, is_repeater: false } : item,
      ),
    );
    setMessage(t("mapping.msg.groupChanged"));
    closeChangeGroupModal();
  }

  function toggleRepeaterGroup(groupPath: string) {
    const isRepeater = groupedFieldTree
      .flatMap((p) => p.children)
      .find((c) => c.fullPath === groupPath)
      ?.fields.some((f) => f.is_repeater);

    setFieldCatalog((prev) =>
      prev.map((f) => (f.group === groupPath ? { ...f, is_repeater: !isRepeater } : f))
    );
  }

  function addRepeaterItem(groupPath: string) {
    setValues((prev) => {
      const currentList = Array.isArray(prev[groupPath]) ? prev[groupPath] : [];
      return { ...prev, [groupPath]: [...currentList, {}] };
    });
  }

  function removeRepeaterItem(groupPath: string, index: number) {
    setValues((prev) => {
      const currentList = (Array.isArray(prev[groupPath]) ? prev[groupPath] : []) as any[];
      const newList = [...currentList];
      newList.splice(index, 1);
      return { ...prev, [groupPath]: newList };
    });
  }

  function onRepeaterItemChange(groupPath: string, index: number, field: FieldCatalogItem, rawVal: string) {
    setValues((prev) => {
      const currentList = (Array.isArray(prev[groupPath]) ? prev[groupPath] : []) as any[];
      const newList = [...currentList];
      if (!newList[index]) newList[index] = {};

      let parsedVal: unknown = rawVal;
      if (field.type === "number" || field.type === "percent") {
        const num = parseFloat(rawVal.replace(/,/g, ""));
        parsedVal = isNaN(num) ? rawVal : num;
      }

      newList[index] = { ...newList[index], [field.field_key]: parsedVal };
      return { ...prev, [groupPath]: newList };
    });
  }

  function normalizeImportedType(raw: string): FieldCatalogItem["type"] | null {
    const v = raw.trim().toLowerCase();
    if (!v) return null;
    if (["string", "chuỗi", "chuoi", "text", "chuoi ky tu"].includes(v)) return "text";
    if (["number", "số", "so", "numeric", "int", "float"].includes(v)) return "number";
    if (["percent", "phần trăm", "phan tram", "%", "ty le"].includes(v)) return "percent";
    if (["date", "ngày", "ngay", "ngay thang", "datetime"].includes(v)) return "date";
    if (["table", "bảng", "bang", "noi dung dai"].includes(v)) return "table";
    return null;
  }

  async function importFromCsv(file: File) {
    setImportingCatalog(true);
    setError("");
    try {
      const text = await file.text();
      const lines = text
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter((l) => l.length > 0);
      if (lines.length < 2) {
        setError(t("mapping.import.err.noData"));
        return;
      }
      const headerLine = lines[0];
      const commaParts = headerLine.split(",").length;
      const semicolonParts = headerLine.split(";").length;
      const delimiter = semicolonParts > 1 && semicolonParts >= commaParts ? ";" : ",";
      const header = headerLine.split(delimiter).map((h) => h.trim().toLowerCase());
      const idxName = header.findIndex((h) => h === "tên field" || h === "ten field" || h === "label" || h === "label_vi");
      const idxGroup = header.findIndex((h) => h === "nhóm" || h === "nhom" || h === "group");
      const idxType = header.findIndex((h) => h === "loại" || h === "loai" || h === "type");
      if (idxName === -1 || idxGroup === -1 || idxType === -1) {
        setError(t("mapping.import.err.header"));
        return;
      }

      const existingKeys = fieldCatalog.map((f) => f.field_key);
      const imported: FieldCatalogItem[] = [];

      for (let i = 1; i < lines.length; i += 1) {
        const cols = lines[i].split(delimiter).map((c) => c.trim());
        const label_vi = cols[idxName] ?? "";
        const group = cols[idxGroup] ?? "";
        const rawType = cols[idxType] ?? "";
        if (!label_vi || !group || !rawType) continue;

        const type = normalizeImportedType(rawType);
        if (!type) continue;

        if (fieldCatalog.some((f) => f.group === group && f.label_vi === label_vi)) {
          // skip duplicates by label+group
          continue;
        }

        const field_key = buildInternalFieldKey({
          group,
          labelVi: label_vi,
          existingKeys,
        });
        existingKeys.push(field_key);

        imported.push({
          field_key,
          label_vi,
          group,
          type,
          required: false,
          normalizer: "",
          examples: [],
        });
      }

      if (imported.length === 0) {
        setError(t("mapping.import.err.noRows"));
        return;
      }

      setFieldCatalog((prev) => [...prev, ...imported]);
      setMessage(t("mapping.import.ok").replace("{count}", String(imported.length)));
    } catch (e) {
      setError(e instanceof Error ? e.message : t("mapping.import.err.generic"));
    } finally {
      setImportingCatalog(false);
    }
  }

  async function importFromXlsx(file: File) {
    setImportingCatalog(true);
    setError("");
    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array" });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });
      if (rows.length === 0) {
        setError(t("mapping.import.err.noData"));
        return;
      }

      const existingKeys = fieldCatalog.map((f) => f.field_key);
      const imported: FieldCatalogItem[] = [];

      for (const row of rows) {
        const label_vi =
          (row["Tên field"] as string) ||
          (row["ten field"] as string) ||
          (row["Label"] as string) ||
          (row["label_vi"] as string) ||
          "";
        const group = (row["Nhóm"] as string) || (row["nhom"] as string) || (row["group"] as string) || "";
        const rawType = (row["Loại"] as string) || (row["loai"] as string) || (row["type"] as string) || "";
        if (!label_vi || !group || !rawType) continue;

        const type = normalizeImportedType(String(rawType));
        if (!type) continue;

        if (fieldCatalog.some((f) => f.group === group && f.label_vi === label_vi)) {
          continue;
        }

        const field_key = buildInternalFieldKey({
          group,
          labelVi: label_vi,
          existingKeys,
        });
        existingKeys.push(field_key);

        imported.push({
          field_key,
          label_vi,
          group,
          type,
          required: false,
          normalizer: "",
          examples: [],
        });
      }

      if (imported.length === 0) {
        setError(t("mapping.import.err.noRows"));
        return;
      }

      setFieldCatalog((prev) => [...prev, ...imported]);
      setMessage(t("mapping.import.ok").replace("{count}", String(imported.length)));
    } catch (e) {
      setError(e instanceof Error ? e.message : t("mapping.import.err.generic"));
    } finally {
      setImportingCatalog(false);
    }
  }

  function handleImportFieldFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    const name = file.name.toLowerCase();
    if (name.endsWith(".csv")) {
      void importFromCsv(file);
    } else if (name.endsWith(".xlsx") || name.endsWith(".xls")) {
      void importFromXlsx(file);
    } else {
      setError(t("mapping.import.err.unsupported"));
    }
  }

  function openEditGroupModal(group: string) {
    setEditingGroup(group);
    setEditingGroupValue(group);
    setEditingGroupError("");
  }

  function openCreateSubgroupModal(parentGroup: string) {
    setEditingGroup("");
    setEditingGroupValue(`${parentGroup}/`);
    setEditingGroupError("");
  }

  function closeEditGroupModal() {
    setEditingGroup(null);
    setEditingGroupValue("");
    setEditingGroupError("");
  }

  function toggleParentCollapse(parent: string) {
    setCollapsedParentGroups((prev) =>
      prev.includes(parent) ? prev.filter((item) => item !== parent) : [...prev, parent],
    );
  }

  function collapseAllGroups() {
    setCollapsedParentGroups(parentGroups);
  }

  function expandAllGroups() {
    setCollapsedParentGroups([]);
  }

  function applyEditGroup() {
    const target = editingGroup ?? "";
    const next = editingGroupValue.trim();
    if (!next) {
      setEditingGroupError(t("mapping.editGroup.errEmpty"));
      return;
    }

    if (!target) {
      // create new group
      setCustomGroups((prev) => (prev.includes(next) ? prev : [...prev, next]));
      setSelectedGroup(next);
      setNewField((prev) => ({ ...prev, group: next }));
      closeEditGroupModal();
      return;
    }

    // rename existing group in catalog
    setFieldCatalog((prev) =>
      prev.map((item) => (item.group === target ? { ...item, group: next } : item)),
    );
    setCustomGroups((prev) => prev.map((g) => (g === target ? next : g)));
    if (selectedGroup === target) {
      setSelectedGroup(next);
    }
    if (newField.group === target) {
      setNewField((prev) => ({ ...prev, group: next }));
    }
    closeEditGroupModal();
  }

  function openMergeGroupsModal() {
    setMergingGroups(true);
    setMergeSourceGroups([]);
    setMergeTargetGroup("");
    setMergeOrderMode("keep");
    setMergeGroupsError("");
  }

  function closeMergeGroupsModal() {
    setMergingGroups(false);
    setMergeSourceGroups([]);
    setMergeTargetGroup("");
    setMergeOrderMode("keep");
    setMergeGroupsError("");
  }

  function toggleMergeSourceGroup(group: string) {
    setMergeSourceGroups((prev) => (prev.includes(group) ? prev.filter((g) => g !== group) : [...prev, group]));
  }

  function applyMergeGroups() {
    const target = mergeTargetGroup.trim();
    if (mergeSourceGroups.length < 2) {
      setMergeGroupsError(t("mapping.merge.errMinGroups"));
      return;
    }
    if (!target) {
      setMergeGroupsError(t("mapping.merge.errTarget"));
      return;
    }

    setFieldCatalog((prev) => {
      const renamed = prev.map((item) => (mergeSourceGroups.includes(item.group) ? { ...item, group: target } : item));
      if (mergeOrderMode === "keep") {
        return renamed;
      }

      // Sort all fields in target group alphabetically by label.
      const sortedTargetItems = renamed
        .filter((item) => item.group === target)
        .sort((a, b) => a.label_vi.localeCompare(b.label_vi, "vi"));
      let cursor = 0;
      return renamed.map((item) => {
        if (item.group !== target) return item;
        const nextItem = sortedTargetItems[cursor];
        cursor += 1;
        return nextItem;
      });
    });
    setCustomGroups((prev) => {
      const next = prev.filter((g) => !mergeSourceGroups.includes(g));
      return next.includes(target) ? next : [...next, target];
    });
    if (mergeSourceGroups.includes(selectedGroup)) {
      setSelectedGroup(target);
    }
    if (mergeSourceGroups.includes(newField.group)) {
      setNewField((prev) => ({ ...prev, group: target }));
    }
    setMessage(t("mapping.msg.groupsMerged").replace("{count}", String(mergeSourceGroups.length)));
    closeMergeGroupsModal();
  }

  const onFieldLabelChange = useCallback((fieldKey: string, labelVi: string) => {
    setFieldCatalog((prev) =>
      prev.map((item) => (item.field_key === fieldKey ? { ...item, label_vi: labelVi } : item)),
    );
  }, []);

  const onFieldTypeChange = useCallback((fieldKey: string, type: FieldCatalogItem["type"]) => {
    setFieldCatalog((prev) =>
      prev.map((item) => (item.field_key === fieldKey ? { ...item, type } : item)),
    );
  }, []);

  function resolveGroupSelection(overrideGroup?: string): string {
    if (overrideGroup) {
      return overrideGroup.trim();
    }
    if (selectedGroup.trim()) {
      return selectedGroup.trim();
    }
    return newField.group.trim();
  }

  function addNewField(
    override?: Partial<{
      label_vi: string;
      group: string;
      type: "string" | "number" | "percent" | "date" | "table";
    }>,
  ) {
    const group = resolveGroupSelection(override?.group);
    const label = (override?.label_vi ?? newField.label_vi).trim();
    const type = override?.type ?? newField.type;
    if (!label || !group) {
      setError(t("mapping.msg.needFieldGroup"));
      return;
    }
    const fieldKey = buildInternalFieldKey({
      group,
      labelVi: label,
      existingKeys: fieldCatalog.map((item) => item.field_key),
    });
    if (fieldCatalog.some((item) => item.field_key === fieldKey)) {
      setError(t("mapping.msg.duplicatedField"));
      return;
    }
    setError("");
    const item: FieldCatalogItem = {
      field_key: fieldKey,
      label_vi: label,
      group,
      type: toInternalType(type),
      required: false,
      examples: [],
    };
    setFieldCatalog((prev) => [...prev, item]);
    setValues((prev) => ({ ...prev, [fieldKey]: "" }));
    setManualValues((prev) => ({ ...prev, [fieldKey]: "" }));
    setNewField({
      label_vi: "",
      group,
      type: "string",
    });
    setSelectedGroup(group);
    setAddingFieldModal(false);
    setMessage(t("mapping.msg.addedField"));
  }

  function prepareAddFieldForGroup(groupPath: string) {
    setSelectedGroup(groupPath);
    setNewField((prev) => ({ ...prev, group: groupPath }));
    setAddingFieldModal(true);
  }

  const typeLabels = useMemo<TypeLabelMap>(
    () => ({
      string: t(typeLabelKey("string")),
      number: t(typeLabelKey("number")),
      percent: t(typeLabelKey("percent")),
      date: t(typeLabelKey("date")),
      table: t(typeLabelKey("table")),
    }),
    [t],
  );

  if (loading) {
    return <p className="text-sm text-coral-tree-600">{t("mapping.loading")}</p>;
  }

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-4 rounded-xl border border-coral-tree-200 bg-white p-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-lg font-semibold">{t("mapping.title")}</h2>
          <p className="mt-1 text-sm text-coral-tree-600">
            {t("mapping.activeVersion")}: <span className="font-medium">{activeVersionId || t("mapping.na")}</span> (
            {activeVersion?.status ?? t("mapping.unknown")})
          </p>
          {message && <p className="mt-2 text-sm text-emerald-700">{message}</p>}
          {error && <p className="mt-2 text-sm text-red-700">{error}</p>}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={saveDraft}
            disabled={saving}
            className="flex items-center gap-2 rounded-md bg-coral-tree-700 px-4 py-2 text-sm text-white hover:bg-coral-tree-800 disabled:opacity-60"
          >
            <Save className="h-4 w-4" />
            {saving ? t("mapping.saving") : t("mapping.saveDraft")}
          </button>
          <button
            onClick={publishActive}
            disabled={publishing || !activeVersionId}
            className="flex items-center gap-2 rounded-md border border-coral-tree-300 px-4 py-2 text-sm hover:bg-coral-tree-50 disabled:opacity-60"
          >
            <Send className="h-4 w-4" />
            {publishing ? t("mapping.publishing") : t("mapping.publish")}
          </button>
          <button
            onClick={runValidate}
            disabled={validating}
            className="flex items-center gap-2 rounded-md border border-coral-tree-300 px-4 py-2 text-sm hover:bg-coral-tree-50 disabled:opacity-60"
          >
            <CheckCircle className="h-4 w-4" />
            {validating ? t("mapping.validating") : t("mapping.buildValidate")}
          </button>
        </div>
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setActiveTab("visual")}
          className={`rounded-md px-3 py-1.5 text-sm ${activeTab === "visual" ? "bg-coral-tree-700 text-white" : "border border-coral-tree-300 hover:bg-coral-tree-50"}`}
        >
          {t("mapping.tab.visual")}
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("advanced")}
          className={`rounded-md px-3 py-1.5 text-sm ${activeTab === "advanced" ? "bg-coral-tree-700 text-white" : "border border-coral-tree-300 hover:bg-coral-tree-50"}`}
        >
          {t("mapping.tab.advanced")}
        </button>
      </div>

      {activeTab === "visual" ? (
        <section className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-coral-tree-200 bg-white p-2">
            <div className={`flex items-center gap-2 w-full md:w-auto transition-opacity duration-300 ${!hasContext ? "opacity-0 pointer-events-none" : "opacity-100"}`}>
              <input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full md:w-72 rounded-md border border-coral-tree-300 px-3 py-1.5 text-sm"
                placeholder={t("mapping.searchPlaceholder")}
              />
              <button
                type="button"
                onClick={() => setAddingFieldModal(true)}
                className="flex flex-shrink-0 items-center gap-1.5 rounded-md bg-coral-tree-700 px-3 py-1.5 text-sm text-white hover:bg-coral-tree-800"
              >
                <Plus className="h-4 w-4" />
                {t("mapping.newFieldTitle")}
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={exportAndOpenDocx}
                disabled={exportingDocx}
                className="flex items-center gap-1.5 rounded-md border border-coral-tree-300 bg-white px-3 py-1.5 text-sm font-medium text-coral-tree-700 hover:bg-coral-tree-50 hover:text-coral-tree-800 disabled:opacity-60"
                title={t("mapping.exportOpenDocx")}
              >
                <FileText className="h-4 w-4" />
                {exportingDocx ? "..." : "Xem Docx"}
              </button>

              {lastExportedDocxPath ? (
                <a
                  href={`/api/report/file?path=${encodeURIComponent(lastExportedDocxPath)}&download=1&ts=${Date.now()}`}
                  className="flex items-center gap-1.5 rounded-md border border-coral-tree-300 bg-white px-2 py-1.5 text-sm hover:bg-coral-tree-50"
                  title={t("mapping.downloadDocx")}
                >
                  <Download className="h-4 w-4 text-coral-tree-600" />
                </a>
              ) : null}

              <div className="h-6 w-px bg-coral-tree-200 mx-1"></div>

              <MappingSidebar
                t={t}
                customers={customers}
                selectedCustomerId={selectedCustomerId}
                setSelectedCustomerId={setSelectedCustomerId}
                loadingCustomers={loadingCustomers}
                loading={loading}
                fieldTemplates={allFieldTemplates}
                selectedFieldTemplateId={selectedFieldTemplateId}
                applySelectedFieldTemplate={applySelectedFieldTemplate}
                loadingFieldTemplates={loadingFieldTemplates}
                openCreateFieldTemplateModal={openCreateFieldTemplateModal}
                openAttachFieldTemplateModal={() => void assignSelectedFieldTemplate()}
                openEditFieldTemplatePicker={() => void openEditFieldTemplatePicker()}
                showTechnicalKeys={showTechnicalKeys}
                setShowTechnicalKeys={setShowTechnicalKeys}
                importingCatalog={importingCatalog}
                handleImportFieldFile={handleImportFieldFile}
                openMergeGroupsModal={openMergeGroupsModal}
                setEditingFieldTemplateId={setEditingFieldTemplateId}
                setEditingFieldTemplateName={setEditingFieldTemplateName}
              />
            </div>
          </div>

          {editingFieldTemplateId ? (
            <div className="flex flex-wrap items-center gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2">
              <span className="text-sm font-medium text-amber-900">{t("mapping.fieldTemplate.editing")}</span>
              <input
                value={editingFieldTemplateName}
                onChange={(e) => setEditingFieldTemplateName(e.target.value)}
                className="min-w-64 rounded-md border border-amber-300 px-2 py-1.5 text-sm"
              />
              <button
                type="button"
                onClick={() => void saveEditedFieldTemplate()}
                disabled={savingEditedTemplate}
                className="rounded-md bg-coral-tree-700 px-3 py-1.5 text-sm text-white disabled:opacity-50"
              >
                {savingEditedTemplate ? t("mapping.fieldTemplate.saving") : t("mapping.fieldTemplate.update")}
              </button>
              <button
                type="button"
                onClick={stopEditingFieldTemplate}
                className="rounded-md border border-coral-tree-300 px-3 py-1.5 text-sm hover:bg-coral-tree-50"
              >
                {t("mapping.fieldTemplate.stopEditing")}
              </button>
            </div>
          ) : null}


          <div className="max-h-[70vh] overflow-auto rounded-xl border border-coral-tree-200 bg-white">
            <div className="sticky top-0 z-10 grid grid-cols-[minmax(260px,1fr)_minmax(360px,2fr)_160px_64px] border-b border-coral-tree-200 bg-coral-tree-100 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-coral-tree-600">
              <div className="flex items-center gap-2">
                <span>{t("mapping.column.field")}</span>
                <button
                  type="button"
                  onClick={collapseAllGroups}
                  disabled={parentGroups.length === 0 || collapsedParentGroups.length === parentGroups.length}
                  className="rounded border border-coral-tree-300 bg-white p-0.5 text-coral-tree-600 hover:bg-coral-tree-50 disabled:opacity-40"
                  title={t("mapping.collapseAllGroups")}
                >
                  <ChevronsUp className="h-3 w-3" />
                </button>
                <button
                  type="button"
                  onClick={expandAllGroups}
                  disabled={collapsedParentGroups.length === 0}
                  className="rounded border border-coral-tree-300 bg-white p-0.5 text-coral-tree-600 hover:bg-coral-tree-50 disabled:opacity-40"
                  title={t("mapping.expandAllGroups")}
                >
                  <ChevronsDown className="h-3 w-3" />
                </button>
              </div>
              <div>{t("mapping.column.value")}</div>
              <div>{t("mapping.column.typeSource")}</div>
              <div className="flex items-center justify-center" />
            </div>
            {groupedFieldTree.length === 0 && (
              <div className="py-24 flex flex-col items-center justify-center text-center">
                {!hasContext ? (
                  <>
                    <h3 className="text-base font-semibold text-coral-tree-800 mb-1">Chưa chọn ngữ cảnh làm việc</h3>
                    <p className="text-sm text-coral-tree-500 mb-4 max-w-sm">
                      Vui lòng bấm nút "Lựa chọn khách hàng" ở góc trên bên phải để bắt đầu làm việc, hoặc tạo một mẫu dữ liệu mới.
                    </p>
                  </>
                ) : (
                  <>
                    <h3 className="text-base font-semibold text-coral-tree-800 mb-1">Mẫu dữ liệu này đang trống</h3>
                    <p className="text-sm text-coral-tree-500 mb-4 max-w-sm">
                      Bạn có thể bắt đầu xây dựng mẫu bằng cách thêm Group hoặc Custom Field đầu tiên.
                    </p>
                    <button
                      type="button"
                      onClick={() => setAddingFieldModal(true)}
                      className="flex flex-shrink-0 items-center gap-1.5 rounded-md bg-coral-tree-700 px-4 py-2 text-sm text-white shadow-sm hover:bg-coral-tree-800"
                    >
                      <Plus className="h-4 w-4" />
                      Thêm trường dữ liệu (Field)
                    </button>
                  </>
                )}
              </div>
            )}
            {groupedFieldTree.map((node) => (
              <div key={node.parent} className="border-b border-coral-tree-200 last:border-0">
                <div className="sticky top-9 z-[5] flex items-center justify-between border-t border-coral-tree-200 bg-coral-tree-100 px-4 py-2 text-xs uppercase tracking-wider text-coral-tree-700">
                  <span className="font-semibold">{node.parent}</span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => openCreateSubgroupModal(node.parent)}
                      className="flex items-center gap-1 rounded bg-white px-2 py-1 text-[11px] font-medium text-coral-tree-600 shadow-sm border border-coral-tree-200 hover:bg-coral-tree-50 hover:text-coral-tree-900"
                      title={t("mapping.addSubgroup")}
                    >
                      <Plus className="h-3 w-3" />
                      {t("mapping.addSubgroup")}
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleParentCollapse(node.parent)}
                      className="flex items-center gap-1 rounded bg-white px-2 py-1 text-[11px] font-medium text-coral-tree-600 shadow-sm border border-coral-tree-200 hover:bg-coral-tree-50 hover:text-coral-tree-900"
                      title={collapsedParentGroups.includes(node.parent) ? t("mapping.expandGroup") : t("mapping.collapseGroup")}
                    >
                      {collapsedParentGroups.includes(node.parent) ? (
                        <ChevronDown className="h-3 w-3" />
                      ) : (
                        <ChevronUp className="h-3 w-3" />
                      )}
                    </button>
                  </div>
                </div>
                {!collapsedParentGroups.includes(node.parent) &&
                  node.children.map((child, childIndex) => (
                    <div key={child.fullPath} className={childIndex > 0 ? "border-t border-coral-tree-200" : ""}>
                      <div className="group/group-header flex items-center justify-between bg-coral-tree-50/80 px-4 py-1.5 text-[11px] uppercase tracking-wide text-coral-tree-500 border-t border-b border-coral-tree-100 border-t-transparent">
                        <span className="font-semibold text-coral-tree-600 pl-6">{child.subgroup || t("mapping.groupPathRoot")}</span>
                        <div className="flex items-center gap-1 opacity-0 group-hover/group-header:opacity-100 transition-opacity">
                          <button
                            type="button"
                            onClick={() => toggleRepeaterGroup(child.fullPath)}
                            className={`flex items-center gap-1.5 rounded px-2 py-1 text-[11px] font-medium transition-colors ${child.fields.some((f) => f.is_repeater) ? "bg-amber-100 text-amber-800 hover:bg-amber-200" : "text-coral-tree-500 hover:bg-amber-100 hover:text-amber-800"}`}
                            title="Chuyển đổi thành nhóm lặp (Repeater)"
                          >
                            <Layers className="h-3 w-3" />
                            {child.fields.some((f) => f.is_repeater) ? "Tắt Nhóm Lặp" : "Nhóm Lặp (Repeater)"}
                          </button>
                          <button
                            type="button"
                            onClick={() => prepareAddFieldForGroup(child.fullPath)}
                            className="flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] font-medium text-coral-tree-500 hover:bg-coral-tree-200 hover:text-coral-tree-800"
                          >
                            <Plus className="h-3 w-3" />
                            {t("mapping.addField")}
                          </button>
                          <button
                            type="button"
                            onClick={() => openEditGroupModal(child.fullPath)}
                            className="flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] font-medium text-coral-tree-500 hover:bg-coral-tree-200 hover:text-coral-tree-800"
                          >
                            <Pencil className="h-3 w-3" />
                            {t("mapping.editGroup")}
                          </button>
                        </div>
                      </div>
                      {child.fields.length === 0 ? (
                        <div className="border-t border-coral-tree-200 px-6 py-2 text-xs text-coral-tree-500">
                          {t("mapping.emptySubgroupHint")}
                        </div>
                      ) : null}
                      {child.fields.some((f) => f.is_repeater) ? (
                        <div className="bg-amber-50/30 p-4 border-t border-coral-tree-200">
                          {((Array.isArray(values[child.fullPath]) ? values[child.fullPath] : []) as Record<string, unknown>[]).map((item, index) => (
                            <div key={index} className="mb-4 rounded-xl border border-amber-200/60 bg-white p-0 shadow-sm relative overflow-hidden">
                              <div className="bg-amber-50 px-4 py-2 border-b border-amber-100 flex items-center justify-between">
                                <span className="text-xs font-semibold text-amber-800">Bản ghi #{index + 1}</span>
                                <button onClick={() => removeRepeaterItem(child.fullPath, index)} className="p-1 text-red-400 hover:bg-red-50 hover:text-red-600 rounded transition-colors" title="Xóa bản ghi">
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                              <div className="flex flex-col">
                                {child.fields.map((field) => (
                                  <FieldRow
                                    key={field.field_key}
                                    field={field}
                                    value={item[field.field_key]}
                                    showTechnicalKeys={showTechnicalKeys}
                                    canMoveUp={fieldCatalog.findIndex((f) => f.field_key === field.field_key) > 0}
                                    canMoveDown={fieldCatalog.findIndex((f) => f.field_key === field.field_key) < fieldCatalog.length - 1}
                                    typeLabels={typeLabels}
                                    columnValuePlaceholder={t("mapping.column.value")}
                                    typeHintNumber={t("mapping.typeHintNumber")}
                                    typeHintPercent={t("mapping.typeHintPercent")}
                                    typeHintTable={t("mapping.typeHintTable")}
                                    tablePasteHint={t("mapping.tablePasteHint")}
                                    moveUpTitle={t("mapping.moveUp")}
                                    moveDownTitle={t("mapping.moveDown")}
                                    changeGroupTitle={t("mapping.changeGroup")}
                                    deleteFieldTitle={t("mapping.deleteField")}
                                    onManualChange={(f, raw) => onRepeaterItemChange(child.fullPath, index, f, raw)}
                                    onFieldLabelChange={onFieldLabelChange}
                                    onFieldTypeChange={onFieldTypeChange}
                                    onMoveField={moveField}
                                    onOpenChangeGroupModal={openChangeGroupModal}
                                    onDeleteField={deleteField}
                                  />
                                ))}
                              </div>
                            </div>
                          ))}
                          <button
                            type="button"
                            onClick={() => addRepeaterItem(child.fullPath)}
                            className="flex items-center gap-1.5 ml-0 rounded border border-dashed border-amber-300 bg-amber-50/50 px-4 py-2 text-sm font-medium text-amber-700 hover:bg-amber-100 hover:border-amber-400 transition-colors"
                          >
                            <Plus className="h-4 w-4" />
                            Thêm bản ghi {child.subgroup || t("mapping.groupPathRoot")}
                          </button>
                        </div>
                      ) : (
                        child.fields.map((field, indexInGroup) => (
                          <FieldRow
                            key={field.field_key}
                            field={field}
                            value={values[field.field_key]}
                            showTechnicalKeys={showTechnicalKeys}
                            canMoveUp={indexInGroup > 0}
                            canMoveDown={indexInGroup < child.fields.length - 1}
                            typeLabels={typeLabels}
                            columnValuePlaceholder={t("mapping.column.value")}
                            typeHintNumber={t("mapping.typeHintNumber")}
                            typeHintPercent={t("mapping.typeHintPercent")}
                            typeHintTable={t("mapping.typeHintTable")}
                            tablePasteHint={t("mapping.tablePasteHint")}
                            moveUpTitle={t("mapping.moveUp")}
                            moveDownTitle={t("mapping.moveDown")}
                            changeGroupTitle={t("mapping.changeGroup")}
                            deleteFieldTitle={t("mapping.deleteField")}
                            onManualChange={onManualChange}
                            onFieldLabelChange={onFieldLabelChange}
                            onFieldTypeChange={onFieldTypeChange}
                            onMoveField={moveField}
                            onOpenChangeGroupModal={openChangeGroupModal}
                            onDeleteField={deleteField}
                          />
                        ))
                      )}
                    </div>
                  ))}
              </div>
            ))}
          </div>
        </section>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          <label className="rounded-xl border border-coral-tree-200 bg-white p-4">
            <div className="mb-2 text-sm font-medium">{t("mapping.file.mapping")} (`mapping_master.json`)</div>
            <textarea
              value={mappingText}
              onChange={(e) => setMappingText(e.target.value)}
              className="h-96 w-full rounded-md border border-coral-tree-300 p-2 font-mono text-xs"
            />
          </label>
          <label className="rounded-xl border border-coral-tree-200 bg-white p-4">
            <div className="mb-2 text-sm font-medium">{t("mapping.file.alias")} (`placeholder_alias_2268.json`)</div>
            <textarea
              value={aliasText}
              onChange={(e) => setAliasText(e.target.value)}
              className="h-96 w-full rounded-md border border-coral-tree-300 p-2 font-mono text-xs"
            />
          </label>
        </div>
      )}

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



      {editingGroup !== null ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm space-y-3 rounded-lg bg-white p-4 shadow-xl">
            <h3 className="text-sm font-semibold">{t("mapping.editGroup.modalTitle")}</h3>
            {editingGroup ? (
              <p className="text-xs text-coral-tree-600">
                {t("mapping.editGroup.current")}: <span className="font-medium">{editingGroup}</span>
              </p>
            ) : null}
            <div className="space-y-1">
              <label className="text-xs text-coral-tree-600" htmlFor="edit-group-input">
                {t("mapping.editGroup.label")}
              </label>
              <input
                id="edit-group-input"
                value={editingGroupValue}
                onChange={(e) => setEditingGroupValue(e.target.value)}
                className="w-full rounded-md border border-coral-tree-300 px-2 py-1.5 text-sm"
                autoFocus
              />
              {editingGroupError ? <p className="text-xs text-red-600">{editingGroupError}</p> : null}
            </div>
            <div className="mt-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={closeEditGroupModal}
                className="flex items-center gap-1.5 rounded-md border border-coral-tree-300 px-3 py-1.5 text-xs hover:bg-coral-tree-50"
              >
                <X className="h-3.5 w-3.5" />
                {t("mapping.editGroup.cancel")}
              </button>
              <button
                type="button"
                onClick={applyEditGroup}
                className="flex items-center gap-1.5 rounded-md bg-coral-tree-700 px-3 py-1.5 text-xs text-white"
              >
                <Save className="h-3.5 w-3.5" />
                {t("mapping.editGroup.save")}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {changingFieldGroup !== null ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm space-y-3 rounded-lg bg-white p-4 shadow-xl">
            <h3 className="text-sm font-semibold">{t("mapping.changeGroup.modalTitle")}</h3>
            {(() => {
              const field = fieldCatalog.find((f) => f.field_key === changingFieldGroup);
              return field ? (
                <p className="text-xs text-coral-tree-600">
                  {t("mapping.changeGroup.current")}: <span className="font-medium">{field.group}</span>
                </p>
              ) : null;
            })()}
            <div className="space-y-1">
              <label className="text-xs text-coral-tree-600" htmlFor="change-group-select">
                {t("mapping.changeGroup.select")}
              </label>
              <select
                id="change-group-select"
                value={changingFieldGroupValue}
                onChange={(e) => setChangingFieldGroupValue(e.target.value)}
                className="w-full rounded-md border border-coral-tree-300 px-2 py-1.5 text-sm"
                autoFocus
              >
                <option value="" disabled>
                  {t("mapping.changeGroup.select")}
                </option>
                {existingGroups
                  .filter((group) => {
                    const field = fieldCatalog.find((f) => f.field_key === changingFieldGroup);
                    return field && group !== field.group;
                  })
                  .map((group) => (
                    <option key={group} value={group}>
                      {group}
                    </option>
                  ))}
                <option value="__create_new__" className="text-emerald-600 font-medium">
                  {t("mapping.newGroupOption")}
                </option>
              </select>
              {changingFieldGroupValue === "__create_new__" ? (
                <input
                  value={changingFieldGroupNewName}
                  onChange={(e) => setChangingFieldGroupNewName(e.target.value)}
                  placeholder={t("mapping.newGroupPlaceholder")}
                  className="mt-2 w-full rounded-md border border-coral-tree-300 px-2 py-1.5 text-sm"
                />
              ) : null}
            </div>
            <div className="mt-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={closeChangeGroupModal}
                className="flex items-center gap-1.5 rounded-md border border-coral-tree-300 px-3 py-1.5 text-xs hover:bg-coral-tree-50"
              >
                <X className="h-3.5 w-3.5" />
                {t("mapping.changeGroup.cancel")}
              </button>
              <button
                type="button"
                onClick={applyChangeGroup}
                disabled={
                  !changingFieldGroupValue ||
                  (changingFieldGroupValue === "__create_new__" && !changingFieldGroupNewName.trim())
                }
                className="flex items-center gap-1.5 rounded-md bg-coral-tree-700 px-3 py-1.5 text-xs text-white disabled:opacity-50"
              >
                <Save className="h-3.5 w-3.5" />
                {t("mapping.changeGroup.save")}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {mergingGroups ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md space-y-3 rounded-lg bg-white p-4 shadow-xl">
            <h3 className="text-sm font-semibold">{t("mapping.merge.modalTitle")}</h3>
            <div className="space-y-2">
              <p className="text-xs text-coral-tree-600">{t("mapping.merge.selectLabel")}</p>
              <div className="max-h-56 space-y-1 overflow-auto rounded border border-coral-tree-200 p-2">
                {existingGroups.map((group) => (
                  <label key={group} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={mergeSourceGroups.includes(group)}
                      onChange={() => toggleMergeSourceGroup(group)}
                    />
                    <span>{group}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-xs text-coral-tree-600" htmlFor="merge-target-group-input">
                {t("mapping.merge.targetLabel")}
              </label>
              <input
                id="merge-target-group-input"
                value={mergeTargetGroup}
                onChange={(e) => {
                  setMergeTargetGroup(e.target.value);
                  if (mergeGroupsError) setMergeGroupsError("");
                }}
                className="w-full rounded-md border border-coral-tree-300 px-2 py-1.5 text-sm"
                placeholder={t("mapping.newGroupPlaceholder")}
                autoFocus
              />
              {mergeGroupsError ? <p className="text-xs text-red-600">{mergeGroupsError}</p> : null}
            </div>
            <div className="space-y-1">
              <p className="text-xs text-coral-tree-600">{t("mapping.merge.orderLabel")}</p>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="merge-order-mode"
                  checked={mergeOrderMode === "keep"}
                  onChange={() => setMergeOrderMode("keep")}
                />
                <span>{t("mapping.merge.order.keep")}</span>
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="merge-order-mode"
                  checked={mergeOrderMode === "alpha"}
                  onChange={() => setMergeOrderMode("alpha")}
                />
                <span>{t("mapping.merge.order.alpha")}</span>
              </label>
            </div>
            <div className="rounded-md border border-coral-tree-200 bg-coral-tree-50 p-2 text-xs text-coral-tree-700">
              <p>
                {t("mapping.merge.preview.groups").replace("{count}", String(mergePreview.groupCount))}
              </p>
              <p>
                {t("mapping.merge.preview.fields").replace("{count}", String(mergePreview.fieldCount))}
              </p>
              <p>
                {t("mapping.merge.preview.target").replace("{name}", mergePreview.targetGroup || "—")}
              </p>
            </div>
            <div className="mt-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={closeMergeGroupsModal}
                className="flex items-center gap-1.5 rounded-md border border-coral-tree-300 px-3 py-1.5 text-xs hover:bg-coral-tree-50"
              >
                <X className="h-3.5 w-3.5" />
                {t("mapping.merge.cancel")}
              </button>
              <button
                type="button"
                onClick={applyMergeGroups}
                className="flex items-center gap-1.5 rounded-md bg-coral-tree-700 px-3 py-1.5 text-xs text-white"
              >
                <Save className="h-3.5 w-3.5" />
                {t("mapping.merge.save")}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {addingFieldModal ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-xl space-y-4 rounded-xl bg-white p-5 shadow-2xl">
            <h3 className="text-base font-semibold">{t("mapping.newFieldTitle")}</h3>

            <div className="grid gap-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-coral-tree-700">Tên hiển thị</label>
                <input
                  value={newField.label_vi}
                  onChange={(e) => setNewField((prev) => ({ ...prev, label_vi: e.target.value }))}
                  placeholder={t("mapping.newFieldLabelPlaceholder")}
                  className="w-full rounded-md border border-coral-tree-300 px-3 py-2 text-sm"
                  autoFocus
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-sm font-medium text-coral-tree-700">Thuộc Nhóm</label>
                  <div className="flex gap-1">
                    <select
                      value={selectedGroup}
                      onChange={(e) => {
                        const group = e.target.value;
                        if (group === "__create_new__") {
                          setAddingFieldModal(false);
                          setEditingGroup("");
                          setEditingGroupValue("");
                          setEditingGroupError("");
                          setSelectedGroup("");
                        } else {
                          setSelectedGroup(group);
                          if (group) {
                            setNewField((prev) => ({ ...prev, group }));
                          }
                        }
                      }}
                      className="w-full rounded-md border border-coral-tree-300 px-3 py-2 text-sm"
                    >
                      <option value="" disabled>{t("mapping.selectGroup")}</option>
                      {existingGroups.map((group) => (
                        <option key={group} value={group}>{group}</option>
                      ))}
                      <option value="__create_new__" className="font-medium text-emerald-600">{t("mapping.newGroupOption")}</option>
                    </select>
                  </div>
                  <p className="mt-1 text-xs text-coral-tree-500">{t("mapping.groupPathHint")}</p>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-coral-tree-700">Kiểu dữ liệu</label>
                  <select
                    value={newField.type}
                    onChange={(e) => setNewField((prev) => ({ ...prev, type: e.target.value as "string" | "number" | "percent" | "date" | "table" }))}
                    className="w-full rounded-md border border-coral-tree-300 px-3 py-2 text-sm"
                  >
                    <option value="string">{t(typeLabelKey("string"))}</option>
                    <option value="number">{t(typeLabelKey("number"))}</option>
                    <option value="percent">{t(typeLabelKey("percent"))}</option>
                    <option value="date">{t(typeLabelKey("date"))}</option>
                    <option value="table">{t(typeLabelKey("table"))}</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="rounded border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
              <span className="font-medium">Technical Key sinh tự động: </span>
              <span className="font-mono text-xs">
                {buildInternalFieldKey({
                  group: resolveGroupSelection() || "Nhóm mới",
                  labelVi: newField.label_vi || "Tên field",
                  existingKeys: fieldCatalog.map((item) => item.field_key),
                })}
              </span>
            </div>

            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setAddingFieldModal(false)}
                className="rounded-md border border-coral-tree-300 px-4 py-2 text-sm font-medium text-coral-tree-700 hover:bg-coral-tree-50"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={() => addNewField()}
                className="flex items-center gap-2 rounded-md bg-coral-tree-700 px-4 py-2 text-sm font-medium text-white hover:bg-coral-tree-800"
              >
                <Plus className="h-4 w-4" />
                {t("mapping.addField")}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <div className="rounded-xl border border-coral-tree-200 bg-white p-4">
        <h3 className="text-sm font-semibold">{t("mapping.validationResult")}</h3>
        {validation ? (
          <pre className="mt-2 overflow-auto rounded-md bg-coral-tree-950 p-3 text-xs text-coral-tree-50">
            {JSON.stringify(validation, null, 2)}
          </pre>
        ) : (
          <p className="mt-1 text-sm text-coral-tree-600">{t("mapping.noValidation")}</p>
        )}
      </div>

    </section>
  );
}
