"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

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
import { useFieldCatalogImport } from "./hooks/useFieldCatalogImport";
import { useFieldTemplates } from "./hooks/useFieldTemplates";
import { useGroupManagement } from "./hooks/useGroupManagement";
import { useMappingApi } from "./hooks/useMappingApi";
import type { FieldTemplateItem, MappingApiResponse, ValidationResponse } from "./types";
import {
  buildInternalFieldKey,
  toInternalType,
  normalizeInputByType,
  typeLabelKey,
  TypeLabelMap,
} from "./helpers";

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

  const { handleImportFieldFile } = useFieldCatalogImport({
    t,
    fieldCatalog,
    setFieldCatalog,
    setImportingCatalog,
    setError,
    setMessage,
  });

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
      <MappingHeader
        t={t}
        activeVersionId={activeVersionId}
        activeVersionStatus={activeVersion?.status}
        message={message}
        error={error}
        saving={saving}
        onSaveDraft={() => void saveDraft()}
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
          values={values}
          fieldCatalog={fieldCatalog}
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
      />

      <ValidationResultPanel t={t} validation={validation} />

    </section>
  );
}
