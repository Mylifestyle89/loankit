"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useLanguage } from "@/components/language-provider";
import type { FieldCatalogItem } from "@/lib/report/config-schema";

import {
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import { arrayMove, sortableKeyboardCoordinates } from "@dnd-kit/sortable";

import { MappingHeader } from "./components/MappingHeader";
import { AdvancedJsonPanel } from "./components/AdvancedJsonPanel";
import { ValidationResultPanel } from "./components/ValidationResultPanel";
import { MappingTabSwitch } from "./components/MappingTabSwitch";
import { MappingModals } from "./components/MappingModals";
import { MappingVisualSection } from "./components/MappingVisualSection";
import { ImportGroupPromptModal } from "./components/Modals/ImportGroupPromptModal";
import { useFieldCatalogImport } from "./hooks/useFieldCatalogImport";
import { useFieldTemplates } from "./hooks/useFieldTemplates";
import { useGroupManagement } from "./hooks/useGroupManagement";
import { useMappingApi } from "./hooks/useMappingApi";
import type { FieldTemplateItem, MappingApiResponse, ValidationResponse } from "./types";
import {
  buildInternalFieldKey,
  normalizeFieldCatalogForSchema,
  toInternalType,
  normalizeInputByType,
  typeLabelKey,
  TypeLabelMap,
} from "./helpers";
import { computeEffectiveValues } from "@/core/use-cases/formula-processor";
import { buildGroupedFieldTree } from "@/core/use-cases/mapping-engine";

type UndoSnapshot = {
  fieldCatalog: FieldCatalogItem[];
  values: Record<string, unknown>;
  manualValues: Record<string, string | number | boolean | null>;
  formulas: Record<string, string>;
  customGroups: string[];
  selectedGroup: string;
  newField: { label_vi: string; group: string; type: "string" | "number" | "percent" | "date" | "table" };
  mappingText: string;
  collapsedParentGroups: string[];
};

export default function MappingPage() {
  const { t } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [activeVersionId, setActiveVersionId] = useState<string>("");
  const [versions, setVersions] = useState<MappingApiResponse["versions"]>([]);
  const [mappingText, setMappingText] = useState("");
  const [aliasText, setAliasText] = useState("");
  const [validation, setValidation] = useState<ValidationResponse["validation"]>();
  const [fieldCatalog, setFieldCatalog] = useState<FieldCatalogItem[]>([]);
  const [, setAutoValues] = useState<Record<string, unknown>>({});
  const [values, setValues] = useState<Record<string, unknown>>({});
  const [manualValues, setManualValues] = useState<Record<string, string | number | boolean | null>>({});
  const [formulas, setFormulas] = useState<Record<string, string>>({});
  const [exportingDocx, setExportingDocx] = useState(false);
  const [formulaModalFieldKey, setFormulaModalFieldKey] = useState<string | null>(null);
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
  const [functionListModalOpen, setFunctionListModalOpen] = useState(false);
  const [undoHistory, setUndoHistory] = useState<UndoSnapshot[]>([]);
  const [importGroupPrompt, setImportGroupPrompt] = useState<{
    rowNumber: number;
    missingPath: string;
    level: "parent" | "subgroup";
  } | null>(null);
  const importGroupPromptResolver = useRef<((decision: "create_once" | "create_all" | "stop") => void) | null>(null);

  const openImportGroupPrompt = useCallback(
    (args: { rowNumber: number; missingPath: string; level: "parent" | "subgroup" }) =>
      new Promise<"create_once" | "create_all" | "stop">((resolve) => {
        importGroupPromptResolver.current = resolve;
        setImportGroupPrompt(args);
      }),
    [],
  );

  const resolveImportGroupPrompt = useCallback((decision: "create_once" | "create_all" | "stop") => {
    importGroupPromptResolver.current?.(decision);
    importGroupPromptResolver.current = null;
    setImportGroupPrompt(null);
  }, []);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setFieldCatalog((items) => {
        const getFieldKey = (id: string) => {
          if (!id.includes("___")) return id;
          return id.split("___")[0];
        };
        const activeKey = getFieldKey(String(active.id));
        const overKey = getFieldKey(String(over.id));

        const oldIndex = items.findIndex((f) => f.field_key === activeKey);
        const newIndex = items.findIndex((f) => f.field_key === overKey);
        if (oldIndex !== -1 && newIndex !== -1) {
          const actGrp = items[oldIndex].group;
          const ovGr = items[newIndex].group;
          if (actGrp === ovGr) {
            return arrayMove(items, oldIndex, newIndex);
          }
        }
        return items;
      });
    }
  }, []);

  const {
    loadData,
    saveDraft,
    exportAndOpenDocx,
  } = useMappingApi({
    t,
    mappingText,
    aliasText,
    fieldCatalog,
    values,
    manualValues,
    formulas,
    selectedCustomerId,
    selectedFieldTemplateId,
    setLoading,
    setSaving,
    setExportingDocx,
    setError,
    setMessage,
    setValidation,
    setActiveVersionId,
    setVersions,
    setMappingText,
    setAliasText,
    setFieldCatalog,
    setAutoValues,
    setValues,
    setManualValues,
    setLastExportedDocxPath,
    setFormulas,
  });

  const {
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
  } = useFieldTemplates({
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
  });

  async function createTemplateFromImport(params: { templateName: string; fieldCatalog: FieldCatalogItem[] }) {
    const normalizedCatalog = normalizeFieldCatalogForSchema(params.fieldCatalog);
    const res = await fetch("/api/report/field-templates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: params.templateName,
        field_catalog: normalizedCatalog,
        customer_id: selectedCustomerId || undefined,
      }),
    });
    const data = (await res.json()) as { ok: boolean; error?: string; field_template?: FieldTemplateItem };
    if (!data.ok) {
      throw new Error(data.error ?? t("mapping.fieldTemplate.errSave"));
    }

    await loadAllFieldTemplates();
    if (selectedCustomerId) {
      await loadFieldTemplates(selectedCustomerId);
    }

    if (data.field_template) {
      const createdCatalog = normalizeFieldCatalogForSchema(data.field_template.field_catalog ?? normalizedCatalog);
      setSelectedFieldTemplateId(data.field_template.id);
      setEditingFieldTemplateId(data.field_template.id);
      setEditingFieldTemplateName(data.field_template.name);
      setFieldCatalog(createdCatalog);
      const emptyValues = Object.fromEntries(createdCatalog.map((field) => [field.field_key, ""]));
      setManualValues({});
      setValues(emptyValues);
    }
  }

  const { handleImportFieldFile } = useFieldCatalogImport({
    t,
    fieldCatalog,
    setFieldCatalog,
    setImportingCatalog,
    setError,
    setMessage,
    onMissingGroupPrompt: openImportGroupPrompt,
    onCreateTemplateFromImport: createTemplateFromImport,
  });

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const loadCustomers = useCallback(async () => {
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
      setError(e instanceof Error ? e.message : t("mapping.err.loadData"));
    } finally {
      setLoadingCustomers(false);
    }
  }, [t]);

  useEffect(() => {
    void loadCustomers();
    void loadAllFieldTemplates();
  }, [loadAllFieldTemplates, loadCustomers]);

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
  }, [editingFieldTemplateId, loadFieldTemplates, selectedCustomerId]);

  const activeVersion = useMemo(
    () => versions?.find((item) => item.id === activeVersionId),
    [activeVersionId, versions],
  );

  const visibleFieldCatalog = useMemo(
    () => (editingFieldTemplateId || (selectedCustomerId && selectedFieldTemplateId) ? fieldCatalog : []),
    [editingFieldTemplateId, fieldCatalog, selectedCustomerId, selectedFieldTemplateId],
  );

  const hasContext = !!selectedCustomerId || !!editingFieldTemplateId;

  const groupedFieldTree = useMemo(() => {
    return buildGroupedFieldTree({
      visibleFieldCatalog,
      customGroups,
      searchTerm,
    });
  }, [customGroups, searchTerm, visibleFieldCatalog]);

  const parentGroups = useMemo(() => groupedFieldTree.map((node) => node.parent), [groupedFieldTree]);

  const effectiveValues = useMemo(() => {
    return computeEffectiveValues({
      values,
      formulas,
      fieldCatalog,
    });
  }, [values, formulas, fieldCatalog]);

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

  const pushUndoSnapshot = useCallback((snapshot: UndoSnapshot) => {
    setUndoHistory((prev) => [snapshot, ...prev].slice(0, 5));
  }, []);

  const deleteField = useCallback((fieldKey: string) => {
    if (!window.confirm(t("mapping.deleteFieldConfirm"))) return;
    pushUndoSnapshot({
      fieldCatalog: [...fieldCatalog],
      values: { ...values },
      manualValues: { ...manualValues },
      formulas: { ...formulas },
      customGroups: [...customGroups],
      selectedGroup,
      newField: { ...newField },
      mappingText,
      collapsedParentGroups: [...collapsedParentGroups],
    });
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
    setFormulas((prev) => {
      const next = { ...prev };
      delete next[fieldKey];
      return next;
    });
    setMappingText((prevTxt) => {
      try {
        const mappingObj = JSON.parse(prevTxt);
        if (mappingObj && Array.isArray(mappingObj.mappings)) {
          mappingObj.mappings = mappingObj.mappings.filter(
            (m: { template_field?: unknown }) => m.template_field !== fieldKey,
          );
          return JSON.stringify(mappingObj, null, 2);
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to update mapping on field delete.");
      }
      return prevTxt;
    });
    setMessage(t("mapping.msg.fieldDeleted"));
    setError("");
  }, [collapsedParentGroups, customGroups, fieldCatalog, formulas, manualValues, mappingText, newField, pushUndoSnapshot, selectedGroup, t, values]);

  const deleteGroup = useCallback(
    (groupPath: string) => {
      const normalized = groupPath.trim();
      if (!normalized) return;
      const groupsToDelete = new Set(
        [...customGroups, ...fieldCatalog.map((f) => f.group)]
          .map((g) => g.trim())
          .filter((g) => g === normalized || g.startsWith(`${normalized}/`)),
      );
      if (groupsToDelete.size === 0) return;

      const fieldsToDelete = fieldCatalog.filter((f) => groupsToDelete.has(f.group.trim()));
      const fieldCount = fieldsToDelete.length;
      if (!window.confirm(t("mapping.deleteGroupConfirm").replace("{name}", normalized).replace("{count}", String(fieldCount)))) {
        return;
      }

      pushUndoSnapshot({
        fieldCatalog: [...fieldCatalog],
        values: { ...values },
        manualValues: { ...manualValues },
        formulas: { ...formulas },
        customGroups: [...customGroups],
        selectedGroup,
        newField: { ...newField },
        mappingText,
        collapsedParentGroups: [...collapsedParentGroups],
      });

      const fieldKeysToDelete = new Set(fieldsToDelete.map((f) => f.field_key));
      const firstSegmentsToDelete = new Set(Array.from(groupsToDelete).map((g) => g.split("/")[0]).filter(Boolean));

      setFieldCatalog((prev) => prev.filter((f) => !groupsToDelete.has(f.group.trim())));
      setCustomGroups((prev) =>
        prev.filter((g) => {
          const trimmed = g.trim();
          return !(trimmed === normalized || trimmed.startsWith(`${normalized}/`));
        }),
      );
      setValues((prev) => {
        const next: Record<string, unknown> = { ...prev };
        for (const key of fieldKeysToDelete) {
          delete next[key];
        }
        for (const group of groupsToDelete) {
          delete next[group];
        }
        return next;
      });
      setManualValues((prev) => {
        const next = { ...prev };
        for (const key of fieldKeysToDelete) {
          delete next[key];
        }
        return next;
      });
      setFormulas((prev) => {
        const next = { ...prev };
        for (const key of fieldKeysToDelete) {
          delete next[key];
        }
        return next;
      });
      setCollapsedParentGroups((prev) => prev.filter((parent) => !firstSegmentsToDelete.has(parent)));
      if (selectedGroup.trim() === normalized || selectedGroup.trim().startsWith(`${normalized}/`)) {
        setSelectedGroup("");
      }
      if (newField.group.trim() === normalized || newField.group.trim().startsWith(`${normalized}/`)) {
        setNewField((prev) => ({ ...prev, group: "Nhóm mới" }));
      }
      setMappingText((prevTxt) => {
        try {
          const mappingObj = JSON.parse(prevTxt);
          if (mappingObj && Array.isArray(mappingObj.mappings)) {
            mappingObj.mappings = mappingObj.mappings.filter(
              (m: { template_field?: unknown }) => !fieldKeysToDelete.has(String(m.template_field ?? "")),
            );
            return JSON.stringify(mappingObj, null, 2);
          }
        } catch (e) {
          setError(e instanceof Error ? e.message : "Failed to update mapping on group delete.");
        }
        return prevTxt;
      });
      setMessage(t("mapping.msg.groupDeleted").replace("{name}", normalized));
      setError("");
    },
    [
      collapsedParentGroups,
      customGroups,
      fieldCatalog,
      formulas,
      manualValues,
      mappingText,
      newField,
      pushUndoSnapshot,
      selectedGroup,
      t,
      values,
    ],
  );

  const undoLastAction = useCallback(() => {
    if (undoHistory.length === 0) return;
    const latest = undoHistory[0];
    setFieldCatalog(latest.fieldCatalog);
    setValues(latest.values);
    setManualValues(latest.manualValues);
    setFormulas(latest.formulas);
    setCustomGroups(latest.customGroups);
    setSelectedGroup(latest.selectedGroup);
    setNewField(latest.newField);
    setMappingText(latest.mappingText);
    setCollapsedParentGroups(latest.collapsedParentGroups);
    setUndoHistory((prev) => prev.slice(1));
    setMessage(t("mapping.msg.undoDone"));
    setError("");
  }, [t, undoHistory]);

  const openChangeGroupModal = useCallback((fieldKey: string) => {
    const field = fieldCatalog.find((f) => f.field_key === fieldKey);
    if (!field) return;
    setChangingFieldGroup(fieldKey);
    setChangingFieldGroupValue("");
    setChangingFieldGroupNewName("");
  }, [fieldCatalog]);

  const {
    existingGroups,
    mergePreview,
    closeChangeGroupModal,
    applyChangeGroup,
    toggleRepeaterGroup,
    addRepeaterItem,
    removeRepeaterItem,
    onRepeaterItemChange,
    openEditGroupModal,
    openCreateSubgroupModal,
    closeEditGroupModal,
    toggleParentCollapse,
    collapseAllGroups,
    expandAllGroups,
    applyEditGroup,
    openMergeGroupsModal,
    closeMergeGroupsModal,
    toggleMergeSourceGroup,
    applyMergeGroups,
  } = useGroupManagement({
    t,
    fieldCatalog,
    groupedFieldTree,
    parentGroups,
    selectedGroup,
    newField,
    changingFieldGroup,
    changingFieldGroupValue,
    changingFieldGroupNewName,
    editingGroup,
    editingGroupValue,
    mergeSourceGroups,
    mergeTargetGroup,
    mergeOrderMode,
    setValues,
    setFieldCatalog,
    setCustomGroups,
    setMessage,
    setSelectedGroup,
    setNewField,
    setChangingFieldGroup,
    setChangingFieldGroupValue,
    setChangingFieldGroupNewName,
    setEditingGroup,
    setEditingGroupValue,
    setEditingGroupError,
    setMergingGroups,
    setMergeSourceGroups,
    setMergeTargetGroup,
    setMergeOrderMode,
    setMergeGroupsError,
    setCollapsedParentGroups,
    customGroups,
  });

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
      // Keep the user's selected type for faster consecutive field creation.
      type,
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

  async function openBackupFolder() {
    setError("");
    const res = await fetch("/api/report/template/open-backup-folder", {
      method: "POST",
    });
    const data = (await res.json()) as { ok?: boolean; error?: string };
    if (!res.ok || !data.ok) {
      setError(data.error ?? "Không thể mở thư mục backup.");
      return;
    }
    setMessage("Đã mở thư mục backup.");
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
      <MappingHeader
        t={t}
        activeVersionId={activeVersionId}
        activeVersionStatus={activeVersion?.status}
        message={message}
        error={error}
        saving={saving}
        onSaveDraft={() => void saveDraft()}
        onOpenFunctionList={() => setFunctionListModalOpen(true)}
        canUndo={undoHistory.length > 0}
        onUndo={() => void undoLastAction()}
        undoCount={undoHistory.length}
      />

      <MappingTabSwitch t={t} activeTab={activeTab} setActiveTab={setActiveTab} />

      {activeTab === "visual" ? (
        <MappingVisualSection
          t={t}
          hasContext={hasContext}
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          setAddingFieldModal={setAddingFieldModal}
          exportingDocx={exportingDocx}
          exportAndOpenDocx={() => void exportAndOpenDocx()}
          lastExportedDocxPath={lastExportedDocxPath}
          customers={customers}
          selectedCustomerId={selectedCustomerId}
          setSelectedCustomerId={setSelectedCustomerId}
          loadingCustomers={loadingCustomers}
          loading={loading}
          fieldTemplates={fieldTemplates}
          allFieldTemplates={allFieldTemplates}
          selectedFieldTemplateId={selectedFieldTemplateId}
          applySelectedFieldTemplate={applySelectedFieldTemplate}
          loadingFieldTemplates={loadingFieldTemplates}
          openCreateFieldTemplateModal={openCreateFieldTemplateModal}
          assignSelectedFieldTemplate={() => void assignSelectedFieldTemplate()}
          openEditFieldTemplatePicker={() => void openEditFieldTemplatePicker()}
          showTechnicalKeys={showTechnicalKeys}
          setShowTechnicalKeys={setShowTechnicalKeys}
          importingCatalog={importingCatalog}
          handleImportFieldFile={handleImportFieldFile}
          openMergeGroupsModal={openMergeGroupsModal}
          setEditingFieldTemplateId={setEditingFieldTemplateId}
          setEditingFieldTemplateName={setEditingFieldTemplateName}
          editingFieldTemplateId={editingFieldTemplateId}
          editingFieldTemplateName={editingFieldTemplateName}
          savingEditedTemplate={savingEditedTemplate}
          saveEditedFieldTemplate={() => void saveEditedFieldTemplate()}
          stopEditingFieldTemplate={stopEditingFieldTemplate}
          openBackupFolder={() => void openBackupFolder()}
          sensors={sensors}
          handleDragEnd={handleDragEnd}
          groupedFieldTree={groupedFieldTree}
          parentGroups={parentGroups}
          collapsedParentGroups={collapsedParentGroups}
          collapseAllGroups={collapseAllGroups}
          expandAllGroups={expandAllGroups}
          openCreateSubgroupModal={openCreateSubgroupModal}
          toggleParentCollapse={toggleParentCollapse}
          toggleRepeaterGroup={toggleRepeaterGroup}
          prepareAddFieldForGroup={prepareAddFieldForGroup}
          openEditGroupModal={openEditGroupModal}
          onDeleteGroup={deleteGroup}
          values={effectiveValues}
          fieldCatalog={fieldCatalog}
          formulas={formulas}
          onOpenFormulaModal={(fieldKey) => setFormulaModalFieldKey(fieldKey)}
          typeLabels={typeLabels}
          onRepeaterItemChange={onRepeaterItemChange}
          onManualChange={onManualChange}
          removeRepeaterItem={removeRepeaterItem}
          addRepeaterItem={addRepeaterItem}
          onFieldLabelChange={onFieldLabelChange}
          onFieldTypeChange={onFieldTypeChange}
          moveField={moveField}
          openChangeGroupModal={openChangeGroupModal}
          deleteField={deleteField}
        />
      ) : (
        <AdvancedJsonPanel
          t={t}
          mappingText={mappingText}
          aliasText={aliasText}
          setMappingText={setMappingText}
          setAliasText={setAliasText}
        />
      )}

      <MappingModals
        creatingFieldTemplate={creatingFieldTemplate}
        closeCreateFieldTemplateModal={closeCreateFieldTemplateModal}
        newFieldTemplateName={newFieldTemplateName}
        setNewFieldTemplateName={setNewFieldTemplateName}
        saveFieldTemplate={saveFieldTemplate}
        savingFieldTemplate={savingFieldTemplate}
        editingFieldTemplatePicker={editingFieldTemplatePicker}
        closeEditFieldTemplatePicker={closeEditFieldTemplatePicker}
        editPickerTemplateId={editPickerTemplateId}
        setEditPickerTemplateId={setEditPickerTemplateId}
        allFieldTemplates={allFieldTemplates}
        onStartEditingExistingTemplate={(templateId) => {
          setSelectedCustomerId("");
          startEditingExistingTemplate(templateId);
        }}
        editingGroup={editingGroup}
        closeEditGroupModal={closeEditGroupModal}
        editingGroupValue={editingGroupValue}
        setEditingGroupValue={setEditingGroupValue}
        editingGroupError={editingGroupError}
        applyEditGroup={applyEditGroup}
        changingFieldGroup={changingFieldGroup}
        closeChangeGroupModal={closeChangeGroupModal}
        changingFieldGroupValue={changingFieldGroupValue}
        setChangingFieldGroupValue={setChangingFieldGroupValue}
        changingFieldGroupNewName={changingFieldGroupNewName}
        setChangingFieldGroupNewName={setChangingFieldGroupNewName}
        existingGroups={existingGroups}
        fieldCatalog={fieldCatalog}
        applyChangeGroup={applyChangeGroup}
        mergingGroups={mergingGroups}
        closeMergeGroupsModal={closeMergeGroupsModal}
        mergeSourceGroups={mergeSourceGroups}
        toggleMergeSourceGroup={toggleMergeSourceGroup}
        mergeTargetGroup={mergeTargetGroup}
        setMergeTargetGroup={setMergeTargetGroup}
        mergeGroupsError={mergeGroupsError}
        setMergeGroupsError={setMergeGroupsError}
        mergeOrderMode={mergeOrderMode}
        setMergeOrderMode={setMergeOrderMode}
        mergePreview={mergePreview}
        applyMergeGroups={applyMergeGroups}
        addingFieldModal={addingFieldModal}
        setAddingFieldModal={setAddingFieldModal}
        newField={newField}
        setNewField={setNewField}
        selectedGroup={selectedGroup}
        setSelectedGroup={setSelectedGroup}
        setEditingGroup={setEditingGroup}
        setEditingGroupError={setEditingGroupError}
        addNewField={addNewField}
        buildInternalFieldKey={buildInternalFieldKey}
        functionListModalOpen={functionListModalOpen}
        setFunctionListModalOpen={setFunctionListModalOpen}
        aliasText={aliasText}
        formulaModalFieldKey={formulaModalFieldKey}
        setFormulaModalFieldKey={setFormulaModalFieldKey}
        formulas={formulas}
        setFormulas={setFormulas}
      />

      <ImportGroupPromptModal prompt={importGroupPrompt} onResolve={resolveImportGroupPrompt} />

      <ValidationResultPanel t={t} validation={validation} />

    </section>
  );
}
