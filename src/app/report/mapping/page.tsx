"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Save, BookOpen, Undo2, Download, FileText } from "lucide-react";

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

import { AdvancedJsonPanel } from "./components/AdvancedJsonPanel";
import { ValidationResultPanel } from "./components/ValidationResultPanel";
import { MappingTabSwitch } from "./components/MappingTabSwitch";
import { MappingModals } from "./components/MappingModals";
import { MappingVisualSection } from "./components/MappingVisualSection";
import { MappingSidebar } from "./components/MappingSidebar";
import { ImportGroupPromptModal } from "./components/Modals/ImportGroupPromptModal";
import { AiMappingModal } from "./components/Modals/AiMappingModal";
import { useFieldCatalogImport } from "./hooks/useFieldCatalogImport";
import { useFieldTemplates } from "./hooks/useFieldTemplates";
import { useGroupManagement } from "./hooks/useGroupManagement";
import { useMappingApi } from "./hooks/useMappingApi";
import type { AutoProcessJob, FieldTemplateItem, MappingApiResponse, ValidationResponse } from "./types";
import {
  buildInternalFieldKey,
  normalizeFieldCatalogForSchema,
  slugifyBusinessText,
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
  const searchParams = useSearchParams();
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
  const [aiModalOpen, setAiModalOpen] = useState(false);
  const [autoProcessJob, setAutoProcessJob] = useState<AutoProcessJob | null>(null);
  const [autoProcessing, setAutoProcessing] = useState(false);
  const [formulaModalFieldKey, setFormulaModalFieldKey] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"visual" | "advanced">("visual");
  const [searchTerm, setSearchTerm] = useState("");
  const [showUnmappedOnly, setShowUnmappedOnly] = useState(false);
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
  const [importGroupModalOpen, setImportGroupModalOpen] = useState(false);
  const [importGroupTemplateId, setImportGroupTemplateId] = useState("");
  const [importGroupPath, setImportGroupPath] = useState("");
  const [undoHistory, setUndoHistory] = useState<UndoSnapshot[]>([]);
  const [importGroupPrompt, setImportGroupPrompt] = useState<{
    rowNumber: number;
    missingPath: string;
    level: "parent" | "subgroup";
  } | null>(null);
  const initMappingLoadRef = useRef(false);
  const initLoadRef = useRef(false);
  const customerTemplateSyncKeyRef = useRef("");
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
    getAutoProcessAssets,
    uploadAutoProcessFile,
    runSmartAutoBatch,
    openAutoProcessOutputFolder,
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

  const runAiSuggestion = useCallback(() => {
    setAiModalOpen(true);
  }, []);

  useEffect(() => {
    const onOpenSuggestion = () => runAiSuggestion();
    window.addEventListener("mapping:open-ai-suggestion", onOpenSuggestion);
    return () => window.removeEventListener("mapping:open-ai-suggestion", onOpenSuggestion);
  }, [runAiSuggestion]);

  useEffect(() => {
    if (searchParams.get("openAiSuggestion") === "1") {
      runAiSuggestion();
    }
  }, [runAiSuggestion, searchParams]);

  const aiPlaceholders = useMemo(() => {
    try {
      const parsed = JSON.parse(mappingText) as {
        mappings?: Array<{ template_field?: string }>;
      };
      return (parsed.mappings ?? [])
        .map((m) => (typeof m.template_field === "string" ? m.template_field.trim() : ""))
        .filter(Boolean);
    } catch {
      return [];
    }
  }, [mappingText]);

  const aiPlaceholderLabels = useMemo<Record<string, string>>(() => {
    const result: Record<string, string> = {};
    const placeholderSet = new Set(aiPlaceholders);

    // 1) Most reliable source: field catalog labels (field_key -> label_vi)
    for (const field of fieldCatalog) {
      const key = field.field_key?.trim();
      const label = field.label_vi?.trim();
      if (!key || !label) continue;
      if (placeholderSet.has(key)) {
        result[key] = label;
      }
    }

    // 2) Fallback: infer from alias map (can be technical->alias OR alias->technical)
    try {
      const parsed = JSON.parse(aliasText) as Record<string, unknown>;
      const looksTechnical = (value: string) => /[._]/.test(value);

      for (const [k, v] of Object.entries(parsed)) {
        const key = k.trim();
        if (typeof v !== "string") continue;
        const value = v.trim();
        if (!key || !value) continue;

        // technical -> alias
        if (placeholderSet.has(key) && !result[key] && !looksTechnical(value)) {
          result[key] = value;
          continue;
        }

        // alias -> technical
        if (placeholderSet.has(value) && !result[value] && !looksTechnical(key)) {
          result[value] = key;
        }
      }
    } catch {
      // no-op: keep best-effort labels from fieldCatalog
    }

    return result;
  }, [aiPlaceholders, aliasText, fieldCatalog]);

  const applyAiSuggestion = useCallback(
    (payload: { suggestion: Record<string, string>; grouping?: { groupKey: string; repeatKey: string } }) => {
      try {
        const parsed = JSON.parse(mappingText) as {
          mappings?: Array<{
            template_field?: string;
            sources?: Array<{ source: string; path: string; note?: string }>;
          }>;
        };
        let matched = 0;
        const nextMappings = (parsed.mappings ?? []).map((item) => {
          const key = typeof item.template_field === "string" ? item.template_field.trim() : "";
          const header = key ? payload.suggestion[key] : undefined;
          if (!header) return item;
          matched += 1;
          return {
            ...item,
            sources: [{ source: "excel_ai", path: header, note: "AI suggestion accepted" }],
          };
        });
        setMappingText(
          JSON.stringify(
            {
              ...parsed,
              mappings: nextMappings,
            },
            null,
            2,
          ),
        );
        const groupingMsg = payload.grouping
          ? ` ${t("mapping.aiSuggest.groupingResult")
              .replace("{groupKey}", payload.grouping.groupKey)
              .replace("{repeatKey}", payload.grouping.repeatKey)}`
          : "";
        setMessage(t("mapping.aiSuggest.ok").replace("{count}", String(matched)) + groupingMsg);
        setError("");
      } catch {
        setError(t("mapping.aiSuggest.err.failed"));
      }
    },
    [mappingText, setError, setMessage, t],
  );

  const runSmartAutoBatchFlow = useCallback(
    async (input: { excelPath: string; templatePath: string; rootKeyOverride?: string; jobType?: string }) => {
      setAutoProcessing(true);
      setError("");
      try {
        const finalJob = await runSmartAutoBatch({
          excelPath: input.excelPath,
          templatePath: input.templatePath,
          rootKeyOverride: input.rootKeyOverride,
          jobType: input.jobType,
          onProgress: (job) => setAutoProcessJob(job),
        });
        setAutoProcessJob(finalJob);
        setMessage(t("mapping.smartAutoBatch.done").replace("{count}", String(finalJob.output_paths.length)));
        await openAutoProcessOutputFolder(finalJob.job_id);
      } catch (error) {
        setError(error instanceof Error ? error.message : "Smart Auto-Batch thất bại.");
      } finally {
        setAutoProcessing(false);
      }
    },
    [openAutoProcessOutputFolder, runSmartAutoBatch, setError, setMessage, t],
  );

  const openAutoProcessResultFolder = useCallback(async () => {
    if (!autoProcessJob?.job_id) return;
    try {
      await openAutoProcessOutputFolder(autoProcessJob.job_id);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Không thể mở thư mục kết quả.");
    }
  }, [autoProcessJob?.job_id, openAutoProcessOutputFolder, setError]);

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
    if (initMappingLoadRef.current) {
      return;
    }
    initMappingLoadRef.current = true;
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
    if (initLoadRef.current) {
      return;
    }
    initLoadRef.current = true;
    void loadCustomers();
    void loadAllFieldTemplates();
  }, [loadAllFieldTemplates, loadCustomers]);

  useEffect(() => {
    const syncKey = `${editingFieldTemplateId}::${selectedCustomerId}`;
    if (customerTemplateSyncKeyRef.current === syncKey) {
      return;
    }
    customerTemplateSyncKeyRef.current = syncKey;

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
      values,
      showUnmappedOnly,
    });
  }, [customGroups, searchTerm, showUnmappedOnly, values, visibleFieldCatalog]);

  const parentGroups = useMemo(() => groupedFieldTree.map((node) => node.parent), [groupedFieldTree]);

  const effectiveValues = useMemo(() => {
    return computeEffectiveValues({
      values,
      formulas,
      fieldCatalog,
    });
  }, [values, formulas, fieldCatalog]);

  const sampleByField = useMemo<Record<string, string>>(() => {
    const result: Record<string, string> = {};
    for (const field of fieldCatalog) {
      const raw = effectiveValues[field.field_key];
      if (raw === null || raw === undefined) {
        result[field.field_key] = "";
        continue;
      }
      if (typeof raw === "string") {
        result[field.field_key] = raw.trim();
        continue;
      }
      if (typeof raw === "number" || typeof raw === "boolean") {
        result[field.field_key] = String(raw);
        continue;
      }
      if (Array.isArray(raw)) {
        result[field.field_key] = raw.length > 0 ? `${raw.length} records` : "";
        continue;
      }
      result[field.field_key] = Object.keys(raw as Record<string, unknown>).length > 0 ? "Object value" : "";
    }
    return result;
  }, [effectiveValues, fieldCatalog]);

  const confidenceByField = useMemo<Record<string, number>>(() => {
    const result: Record<string, number> = {};
    for (const field of fieldCatalog) {
      const val = effectiveValues[field.field_key];
      if (val === null || val === undefined || (typeof val === "string" && val.trim() === "")) {
        result[field.field_key] = 0;
        continue;
      }
      if (field.type === "date") {
        const text = String(val).trim();
        result[field.field_key] = /(\d{2}\/\d{2}\/\d{4})|(\d{4}-\d{2}-\d{2})/.test(text) ? 100 : 70;
        continue;
      }
      if (field.type === "number" || field.type === "percent") {
        const num = Number(String(val).replace(/,/g, "."));
        result[field.field_key] = Number.isFinite(num) ? 100 : 70;
        continue;
      }
      result[field.field_key] = 100;
    }
    return result;
  }, [effectiveValues, fieldCatalog]);

  const downloadHref = useMemo(
    () =>
      lastExportedDocxPath
        ? `/api/report/file?path=${encodeURIComponent(lastExportedDocxPath)}&download=1`
        : "",
    [lastExportedDocxPath],
  );

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

  const openImportGroupModal = useCallback(() => {
    setImportGroupTemplateId("");
    setImportGroupPath("");
    setImportGroupModalOpen(true);
  }, []);

  const closeImportGroupModal = useCallback(() => {
    setImportGroupModalOpen(false);
  }, []);

  const applyImportGroupToCurrentTemplate = useCallback(() => {
    if (!editingFieldTemplateId) {
      setError("Vui lòng vào chế độ chỉnh template trước.");
      return;
    }
    if (!importGroupTemplateId || !importGroupPath) {
      setError("Vui lòng chọn mẫu nguồn và nhóm dữ liệu.");
      return;
    }

    const sourceTemplate = allFieldTemplates.find((tpl) => tpl.id === importGroupTemplateId);
    if (!sourceTemplate) {
      setError("Không tìm thấy mẫu nguồn.");
      return;
    }

    const sourceFields = normalizeFieldCatalogForSchema(sourceTemplate.field_catalog ?? []).filter((field) => {
      const group = field.group?.trim() ?? "";
      return group === importGroupPath || group.startsWith(`${importGroupPath}/`);
    });

    if (sourceFields.length === 0) {
      setError("Nhóm nguồn không có field để thêm.");
      return;
    }

    setFieldCatalog((prev) => {
      const existingKeys = new Set(prev.map((f) => f.field_key));
      const next = [...prev];

      for (const field of sourceFields) {
        let targetKey = field.field_key;
        if (existingKeys.has(targetKey)) {
          const groupSlug = slugifyBusinessText(field.group || "nhom") || "nhom";
          const labelSlug = slugifyBusinessText(field.label_vi || "truong") || "truong";
          const base = `imported.${groupSlug}.${labelSlug}`;
          targetKey = base;
          let i = 2;
          while (existingKeys.has(targetKey)) {
            targetKey = `${base}_${i}`;
            i += 1;
          }
        }
        existingKeys.add(targetKey);
        next.push({
          ...field,
          field_key: targetKey,
        });
      }
      return next;
    });

    setMessage(`Đã thêm nhóm "${importGroupPath}" từ mẫu "${sourceTemplate.name}".`);
    setError("");
    setImportGroupModalOpen(false);
  }, [allFieldTemplates, editingFieldTemplateId, importGroupPath, importGroupTemplateId, setError, setMessage]);

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
      <div className="space-y-3 rounded-xl border border-zinc-200 bg-white/90 p-3 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">{t("mapping.title")}</h2>
            <p className="text-sm text-zinc-600">
              {t("mapping.activeVersion")}: <span className="font-medium">{activeVersionId || t("mapping.na")}</span> (
              {activeVersion?.status ?? t("mapping.unknown")})
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex flex-wrap items-center gap-2 rounded-lg border border-zinc-200 bg-zinc-50/60 p-1">
              <button
                type="button"
                onClick={() => void undoLastAction()}
                disabled={undoHistory.length === 0}
                className="flex h-9 items-center gap-2 rounded-md border border-zinc-300 bg-white px-3 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
              >
                <Undo2 className="h-4 w-4" />
                {t("mapping.undo")} ({undoHistory.length}/5)
              </button>
              <button
                type="button"
                onClick={() => setFunctionListModalOpen(true)}
                className="flex h-9 items-center gap-2 rounded-md border border-zinc-300 bg-white px-3 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
              >
                <BookOpen className="h-4 w-4" />
                Danh sách hàm
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2 rounded-lg border border-zinc-200 bg-zinc-50/60 p-1">
              <button
                type="button"
                onClick={() => void exportAndOpenDocx()}
                disabled={exportingDocx}
                className="flex h-9 items-center gap-2 rounded-md border border-zinc-300 bg-white px-3 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-60"
              >
                <FileText className="h-4 w-4" />
                {exportingDocx ? "..." : "Xem Docx"}
              </button>
              {lastExportedDocxPath ? (
                <a
                  href={downloadHref}
                  className="flex h-9 items-center gap-2 rounded-md border border-zinc-300 bg-white px-3 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
                  title={t("mapping.downloadDocx")}
                >
                  <Download className="h-4 w-4" />
                  {t("mapping.downloadDocx")}
                </a>
              ) : null}
            </div>

            <button
              type="button"
              onClick={() => void saveDraft()}
              disabled={saving}
              className="flex h-10 items-center gap-2 rounded-lg bg-indigo-600 px-4 text-sm font-medium text-white shadow-glow hover:bg-indigo-700 disabled:opacity-60"
            >
              <Save className="h-4 w-4" />
              {saving ? t("mapping.saving") : t("mapping.saveDraft")}
            </button>
            <MappingSidebar
              t={t}
              customers={customers}
              selectedCustomerId={selectedCustomerId}
              setSelectedCustomerId={setSelectedCustomerId}
              loadingCustomers={loadingCustomers}
              loading={loading}
              fieldCatalog={fieldCatalog}
              fieldTemplates={fieldTemplates}
              allFieldTemplates={allFieldTemplates}
              selectedFieldTemplateId={selectedFieldTemplateId}
              editingFieldTemplateId={editingFieldTemplateId}
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
              isMappingValid={Boolean(validation?.is_valid)}
            />
          </div>
        </div>
        <div className={`flex flex-wrap items-center gap-2 rounded-lg border border-zinc-200 bg-zinc-50/60 p-2 transition-opacity duration-300 ${!hasContext ? "opacity-50" : "opacity-100"}`}>
          <input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="h-9 w-full md:w-72 rounded-lg border border-zinc-300 px-3 text-sm text-zinc-900 placeholder:text-zinc-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            placeholder={t("mapping.searchPlaceholder")}
          />
          <label className="inline-flex h-9 items-center gap-2 rounded-lg border border-zinc-300 bg-white px-3 text-xs font-medium text-zinc-700">
            <input
              type="checkbox"
              checked={showUnmappedOnly}
              onChange={(e) => setShowUnmappedOnly(e.target.checked)}
              className="h-3.5 w-3.5 rounded border-zinc-300 text-indigo-600 focus:ring-indigo-500"
            />
            Chưa mapping
          </label>
          <button
            type="button"
            onClick={() => void openCreateFieldTemplateModal()}
            className="flex h-9 flex-shrink-0 items-center gap-1.5 rounded-lg bg-indigo-600 px-3 text-sm font-medium text-white shadow-glow transition-colors hover:bg-indigo-700"
          >
            + Tạo mẫu dữ liệu
          </button>
        </div>
        {message ? <p className="text-sm text-emerald-700">{message}</p> : null}
        {error ? <p className="text-sm text-rose-700">{error}</p> : null}
      </div>

      <MappingTabSwitch t={t} activeTab={activeTab} setActiveTab={setActiveTab} />

      {activeTab === "visual" ? (
        <MappingVisualSection
          t={t}
          hasContext={hasContext}
          setAddingFieldModal={setAddingFieldModal}
          editingFieldTemplateId={editingFieldTemplateId}
          editingFieldTemplateName={editingFieldTemplateName}
          savingEditedTemplate={savingEditedTemplate}
          saveEditedFieldTemplate={() => void saveEditedFieldTemplate()}
          stopEditingFieldTemplate={stopEditingFieldTemplate}
          openBackupFolder={() => void openBackupFolder()}
          openImportGroupModal={openImportGroupModal}
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
          confidenceByField={confidenceByField}
          sampleByField={sampleByField}
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
        importGroupModalOpen={importGroupModalOpen}
        closeImportGroupModal={closeImportGroupModal}
        importGroupTemplateId={importGroupTemplateId}
        setImportGroupTemplateId={setImportGroupTemplateId}
        importGroupPath={importGroupPath}
        setImportGroupPath={setImportGroupPath}
        applyImportGroupToCurrentTemplate={applyImportGroupToCurrentTemplate}
      />

      <ImportGroupPromptModal prompt={importGroupPrompt} onResolve={resolveImportGroupPrompt} />
      <AiMappingModal
        isOpen={aiModalOpen}
        onClose={() => {
          setAiModalOpen(false);
        }}
        placeholders={aiPlaceholders}
        placeholderLabels={aiPlaceholderLabels}
        onApply={applyAiSuggestion}
        onSmartAutoBatch={runSmartAutoBatchFlow}
        onLoadAssetOptions={() => getAutoProcessAssets()}
        onUploadFile={(file, kind) => uploadAutoProcessFile(file, kind)}
        autoProcessJob={autoProcessJob}
        autoProcessing={autoProcessing}
        onOpenOutputFolder={openAutoProcessResultFolder}
        t={t}
      />

      <ValidationResultPanel t={t} validation={validation} />

    </section>
  );
}
