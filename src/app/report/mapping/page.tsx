"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Save, BookOpen, Undo2 } from "lucide-react";

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

import { ValidationResultPanel } from "./components/ValidationResultPanel";
import { MappingModals } from "./components/MappingModals";
import { MappingVisualSection } from "./components/MappingVisualSection";
import { MappingVisualToolbar } from "./components/MappingVisualToolbar";
import { MappingSidebar } from "./components/MappingSidebar";
import { DeleteConfirmModal } from "./components/Modals/DeleteConfirmModal";
import { ImportGroupPromptModal } from "./components/Modals/ImportGroupPromptModal";
import { OcrReviewModal } from "./components/Modals/OcrReviewModal";
import { SystemLogCard } from "./components/SystemLogCard";
import { useFieldCatalogImport } from "./hooks/useFieldCatalogImport";
import { useFieldTemplates } from "./hooks/useFieldTemplates";
import { useGroupManagement } from "./hooks/useGroupManagement";
import { useMappingApi } from "./hooks/useMappingApi";
import type {
  AutoProcessJob,
  FieldTemplateItem,
  MappingApiResponse,
  OcrProcessResponse,
  RepeaterSuggestionItem,
  OcrSuggestionMap,
  ValidationResponse,
} from "./types";
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
import { applyAiSuggestion as applyAiSuggestionPure } from "@/core/use-cases/apply-ai-suggestion";
import type { ApplyAiSuggestionPayload } from "@/core/use-cases/apply-ai-suggestion";
import { useModal } from "@/lib/report/use-modal-store";

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

type OcrLogEntry = {
  id: string;
  message: string;
  createdAt: number;
  type: "ai" | "system" | "error";
};

type RepeaterSuggestionMap = Record<
  string,
  {
    groupPath: string;
    fieldKeys: string[];
    rows: Array<Record<string, string | number | boolean | null>>;
    confidenceScore: number;
    status: "pending" | "accepted" | "declined";
    source: "docx_ai";
  }
>;

function MappingPageContent() {
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
  const [autoProcessJob, setAutoProcessJob] = useState<AutoProcessJob | null>(null);
  const [autoProcessing, setAutoProcessing] = useState(false);
  const [ocrProcessing, setOcrProcessing] = useState(false);
  const [ocrSuggestionsByField, setOcrSuggestionsByField] = useState<OcrSuggestionMap>({});
  const [repeaterSuggestionsByGroup, setRepeaterSuggestionsByGroup] = useState<RepeaterSuggestionMap>({});
  const [formulaModalFieldKey, setFormulaModalFieldKey] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [showUnmappedOnly, setShowUnmappedOnly] = useState(false);
  const [showTechnicalKeys, setShowTechnicalKeys] = useState(false);
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

  const [editingFieldTemplatePicker, setEditingFieldTemplatePicker] = useState(false);
  const [editPickerTemplateId, setEditPickerTemplateId] = useState("");
  const [editingFieldTemplateId, setEditingFieldTemplateId] = useState("");
  const [editingFieldTemplateName, setEditingFieldTemplateName] = useState("");
  const [savingEditedTemplate, setSavingEditedTemplate] = useState(false);
  const [functionListModalOpen, setFunctionListModalOpen] = useState(false);
  const [importGroupModalOpen, setImportGroupModalOpen] = useState(false);
  const [importGroupTemplateId, setImportGroupTemplateId] = useState("");
  const [importGroupPath, setImportGroupPath] = useState("");
  const [ocrLogs, setOcrLogs] = useState<OcrLogEntry[]>([]);
  const ocrLogEndRef = useRef<HTMLDivElement | null>(null);
  const [ocrReviewModalOpen, setOcrReviewModalOpen] = useState(false);
  const [lastOcrMeta, setLastOcrMeta] = useState<OcrProcessResponse["meta"]>(undefined);
  const [deleteMasterModalOpen, setDeleteMasterModalOpen] = useState(false);
  const [deleteMasterTypedName, setDeleteMasterTypedName] = useState("");
  const [deleteMasterLoading, setDeleteMasterLoading] = useState(false);
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
  const { openModal } = useModal();

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
    setFormulas,
  });

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
    (payload: ApplyAiSuggestionPayload) => {
      try {
        const { nextMappingText, matched } = applyAiSuggestionPure(mappingText, payload);
        setMappingText(nextMappingText);
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

  const handleApplyFinancialValues = useCallback((aiValues: Record<string, string>) => {
    setManualValues((prev) => ({ ...prev, ...aiValues }));
    setValues((prev) => ({ ...prev, ...aiValues }));
  }, []);

  const runAiSuggestion = useCallback(() => {
    openModal("aiMapping", {
      placeholders: aiPlaceholders,
      placeholderLabels: aiPlaceholderLabels,
      onApply: applyAiSuggestion,
      onSmartAutoBatch: runSmartAutoBatchFlow,
      onLoadAssetOptions: () => getAutoProcessAssets(),
      onUploadFile: (file, kind) => uploadAutoProcessFile(file, kind),
      autoProcessJob,
      autoProcessing,
      onOpenOutputFolder: openAutoProcessResultFolder,
      t,
      fieldCatalog,
      onApplyFinancialValues: handleApplyFinancialValues,
    });
  }, [
    aiPlaceholders,
    aiPlaceholderLabels,
    applyAiSuggestion,
    autoProcessJob,
    autoProcessing,
    fieldCatalog,
    getAutoProcessAssets,
    handleApplyFinancialValues,
    openAutoProcessResultFolder,
    openModal,
    runSmartAutoBatchFlow,
    t,
    uploadAutoProcessFile,
  ]);

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

  const {
    loadFieldTemplates,
    loadAllFieldTemplates,
    applySelectedFieldTemplate,
    openEditFieldTemplatePicker,
    closeEditFieldTemplatePicker,
    startEditingExistingTemplate,
    stopEditingFieldTemplate,
    assignSelectedFieldTemplate,
    saveEditedFieldTemplate,
  } = useFieldTemplates({
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
  });

  const openDeleteGenericTemplateModal = useCallback(() => {
    setDeleteMasterTypedName("");
    setDeleteMasterModalOpen(true);
  }, []);

  const closeDeleteMasterModal = useCallback(() => {
    setDeleteMasterModalOpen(false);
    setDeleteMasterTypedName("");
  }, []);

  const confirmDeleteMasterTemplate = useCallback(async () => {
    if (!editingFieldTemplateId || !editingFieldTemplateName.trim()) return;
    setDeleteMasterLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/report/master-templates/${editingFieldTemplateId}`, { method: "DELETE" });
      const data = (await res.json()) as { ok: boolean; error?: string };
      if (!data.ok) throw new Error(data.error ?? "Xóa thất bại.");
      setMessage(t("mapping.msg.templateDeleted").replace("{name}", editingFieldTemplateName));
      closeDeleteMasterModal();
      stopEditingFieldTemplate();
      await loadAllFieldTemplates();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Xóa thất bại.");
    } finally {
      setDeleteMasterLoading(false);
    }
  }, [
    closeDeleteMasterModal,
    editingFieldTemplateId,
    editingFieldTemplateName,
    loadAllFieldTemplates,
    setError,
    setMessage,
    stopEditingFieldTemplate,
    t,
  ]);

  const openCreateMasterTemplateModal = useCallback(
    (initialName = "") => {
      openModal("createMasterTemplate", {
        initialName,
        onSuccess: async (created) => {
          setMessage(t("mapping.msg.templateSaved").replace("{name}", created.name));
          setError("");
          await loadAllFieldTemplates();
          if (selectedCustomerId) {
            await loadFieldTemplates(selectedCustomerId);
            const attachRes = await fetch("/api/report/mapping-instances", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                customer_id: selectedCustomerId,
                master_id: created.id,
                name: `${created.name}-${Date.now()}`,
              }),
            });
            const attachData = (await attachRes.json()) as { ok: boolean; mapping_instance?: { id: string } };
            await loadFieldTemplates(selectedCustomerId);
            if (attachData.ok && attachData.mapping_instance?.id) {
              setSelectedFieldTemplateId(attachData.mapping_instance.id);
            }
          } else {
            setSelectedFieldTemplateId(created.id);
          }
          setFieldCatalog([]);
          setValues({});
          setManualValues({});
          setEditingFieldTemplateId(created.id);
          setEditingFieldTemplateName(created.name);
        },
        onError: (message) => {
          setError(message);
        },
      });
    },
    [
      loadAllFieldTemplates,
      loadFieldTemplates,
      openModal,
      selectedCustomerId,
      setEditingFieldTemplateId,
      setEditingFieldTemplateName,
      setError,
      setFieldCatalog,
      setManualValues,
      setMessage,
      setSelectedFieldTemplateId,
      setValues,
      t,
    ],
  );

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
      openModal("deleteGroupConfirm", {
        groupPath: normalized,
        fieldCount,
        onConfirm: () => {
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
      });
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
      openModal,
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

  const pushOcrLog = useCallback((type: "ai" | "system" | "error", messageText: string) => {
    setOcrLogs((prev) => [
      ...prev.slice(-30),
      { id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, type, message: messageText, createdAt: Date.now() },
    ]);
  }, []);

  const handleOcrFileSelected = useCallback(
    async (file: File) => {
      if (!selectedFieldTemplateId) {
        setError("Vui lòng chọn Mapping Instance hoặc Template trước khi OCR.");
        pushOcrLog("error", "OCR thất bại: thiếu context mapping/template.");
        return;
      }
      const fileName = (file.name ?? "").toLowerCase();
      const mimeType = (file.type ?? "").toLowerCase();
      const isDocx =
        fileName.endsWith(".docx") ||
        mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
      const modeLabel = isDocx ? "DOCX Extract" : "OCR";
      const fallbackProcessUrl = isDocx ? "/api/report/mapping/docx-process" : "/api/report/mapping/ocr-process";
      const fallbackEnabled =
        String(process.env.NEXT_PUBLIC_EXTRACT_FALLBACK_ENABLED ?? "").toLowerCase() === "true" ||
        process.env.NODE_ENV === "development";

      setOcrProcessing(true);
      setError("");
      pushOcrLog("system", `Bắt đầu ${modeLabel}: ${file.name}`);
      try {
        const form = new FormData();
        form.set("file", file);
        form.set("fieldTemplateId", selectedFieldTemplateId);
        let res = await fetch("/api/report/mapping/extract-process", {
          method: "POST",
          body: form,
        });
        let data = (await res.json()) as OcrProcessResponse;
        if (!res.ok || !data.ok) {
          if (fallbackEnabled) {
            pushOcrLog("system", `Unified extract lỗi, fallback sang ${isDocx ? "DOCX route" : "OCR route"}...`);
            res = await fetch(fallbackProcessUrl, {
              method: "POST",
              body: form,
            });
            data = (await res.json()) as OcrProcessResponse;
          } else {
            throw new Error(
              data.error ?? `${modeLabel} failed on unified extract (fallback disabled).`,
            );
          }
        }
        if (!res.ok || !data.ok) {
          throw new Error(data.error ?? `${modeLabel} failed.`);
        }
        const next: OcrSuggestionMap = {};
        for (const item of data.suggestions ?? []) {
          next[item.fieldKey] = {
            fieldKey: item.fieldKey,
            proposedValue: item.proposedValue,
            confidenceScore: item.confidenceScore,
            status: "pending",
            source: item.source ?? (isDocx ? "docx_ai" : "ocr_ai"),
          };
        }
        const repeaterNext: RepeaterSuggestionMap = {};
        for (const item of data.repeaterSuggestions ?? []) {
          const typedItem = item as RepeaterSuggestionItem;
          if (!typedItem.groupPath || !Array.isArray(typedItem.rows) || typedItem.rows.length === 0) continue;
          repeaterNext[typedItem.groupPath] = {
            groupPath: typedItem.groupPath,
            fieldKeys: typedItem.fieldKeys ?? [],
            rows: typedItem.rows,
            confidenceScore: typedItem.confidenceScore ?? 0.6,
            status: typedItem.status ?? "pending",
            source: "docx_ai",
          };
        }
        setOcrSuggestionsByField(next);
        setRepeaterSuggestionsByGroup(repeaterNext);
        setLastOcrMeta(data.meta);
        if (Object.keys(next).length > 0 || Object.keys(repeaterNext).length > 0) setOcrReviewModalOpen(true);
        pushOcrLog("ai", `${modeLabel} thành công, phát hiện ${Object.keys(next).length} trường dữ liệu.`);
        if (Object.keys(repeaterNext).length > 0) {
          pushOcrLog("ai", `${modeLabel} phát hiện ${Object.keys(repeaterNext).length} nhóm repeater.`);
        }
        pushOcrLog("system", "Đã masking dữ liệu nhạy cảm trước khi AI xử lý.");
      } catch (error) {
        const msg = error instanceof Error ? error.message : `${modeLabel} failed.`;
        setError(msg);
        pushOcrLog("error", `${modeLabel} lỗi: ${msg}`);
      } finally {
        setOcrProcessing(false);
      }
    },
    [pushOcrLog, selectedFieldTemplateId],
  );

  const handleAcceptOcrSuggestion = useCallback((fieldKey: string) => {
    setOcrSuggestionsByField((prev) => {
      const item = prev[fieldKey];
      if (!item || item.status !== "pending") return prev;
      setManualValues((mv) => ({ ...mv, [fieldKey]: item.proposedValue }));
      setValues((vv) => ({ ...vv, [fieldKey]: item.proposedValue }));
      pushOcrLog("system", `Đã chấp nhận OCR suggestion cho field: ${fieldKey}`);
      return { ...prev, [fieldKey]: { ...item, status: "accepted" } };
    });
  }, [pushOcrLog]);

  const handleDeclineOcrSuggestion = useCallback((fieldKey: string) => {
    setOcrSuggestionsByField((prev) => {
      const item = prev[fieldKey];
      if (!item || item.status !== "pending") return prev;
      pushOcrLog("system", `Đã từ chối OCR suggestion cho field: ${fieldKey}`);
      return { ...prev, [fieldKey]: { ...item, status: "declined" } };
    });
  }, [pushOcrLog]);

  const handleAcceptAllOcr = useCallback(() => {
    setOcrSuggestionsByField((prev) => {
      const next = { ...prev };
      let count = 0;
      for (const [key, item] of Object.entries(next)) {
        if (item.status !== "pending") continue;
        setManualValues((mv) => ({ ...mv, [key]: item.proposedValue }));
        setValues((vv) => ({ ...vv, [key]: item.proposedValue }));
        next[key] = { ...item, status: "accepted" };
        count++;
      }
      if (count > 0) pushOcrLog("system", `[Bulk Accept] ${count} fields`);
      return next;
    });
  }, [pushOcrLog]);

  const handleDeclineAllOcr = useCallback(() => {
    setOcrSuggestionsByField((prev) => {
      const next: OcrSuggestionMap = {};
      let count = 0;
      for (const [key, item] of Object.entries(prev)) {
        if (item.status === "pending") {
          next[key] = { ...item, status: "declined" };
          count++;
        } else {
          next[key] = item;
        }
      }
      if (count > 0) pushOcrLog("system", `[Bulk Decline] ${count} fields`);
      return next;
    });
  }, [pushOcrLog]);

  const handleAcceptRepeaterSuggestion = useCallback((groupPath: string) => {
    setRepeaterSuggestionsByGroup((prev) => {
      const item = prev[groupPath];
      if (!item || item.status !== "pending") return prev;
      setValues((current) => ({ ...current, [groupPath]: item.rows }));
      pushOcrLog("system", `Đã chấp nhận DOCX repeater cho nhóm: ${groupPath} (${item.rows.length} bản ghi)`);
      return { ...prev, [groupPath]: { ...item, status: "accepted" } };
    });
  }, [pushOcrLog]);

  const handleDeclineRepeaterSuggestion = useCallback((groupPath: string) => {
    setRepeaterSuggestionsByGroup((prev) => {
      const item = prev[groupPath];
      if (!item || item.status !== "pending") return prev;
      pushOcrLog("system", `Đã từ chối DOCX repeater cho nhóm: ${groupPath}`);
      return { ...prev, [groupPath]: { ...item, status: "declined" } };
    });
  }, [pushOcrLog]);

  const handleAcceptAllRepeater = useCallback(() => {
    setRepeaterSuggestionsByGroup((prev) => {
      const next = { ...prev };
      let count = 0;
      const patchValues: Record<string, unknown> = {};
      for (const [groupPath, item] of Object.entries(next)) {
        if (item.status !== "pending") continue;
        patchValues[groupPath] = item.rows;
        next[groupPath] = { ...item, status: "accepted" };
        count += 1;
      }
      if (count > 0) {
        setValues((current) => ({ ...current, ...patchValues }));
        pushOcrLog("system", `[Bulk Accept Repeater] ${count} nhóm`);
      }
      return next;
    });
  }, [pushOcrLog]);

  const handleDeclineAllRepeater = useCallback(() => {
    setRepeaterSuggestionsByGroup((prev) => {
      const next = { ...prev };
      let count = 0;
      for (const [groupPath, item] of Object.entries(next)) {
        if (item.status !== "pending") continue;
        next[groupPath] = { ...item, status: "declined" };
        count += 1;
      }
      if (count > 0) pushOcrLog("system", `[Bulk Decline Repeater] ${count} nhóm`);
      return next;
    });
  }, [pushOcrLog]);

  useEffect(() => {
    ocrLogEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [ocrLogs]);

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

  const pendingOcrCount = useMemo(
    () => Object.values(ocrSuggestionsByField).filter((i) => i.status === "pending").length,
    [ocrSuggestionsByField],
  );

  if (loading) {
    return <p className="text-sm text-coral-tree-600">{t("mapping.loading")}</p>;
  }

  return (
    <section className="space-y-4">
      <div className="space-y-3 rounded-xl border border-zinc-200 dark:border-white/[0.08] bg-white/90 dark:bg-[#0f1629]/90 p-3 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold dark:text-slate-100">{t("mapping.title")}</h2>
            <p className="text-sm text-zinc-600 dark:text-slate-300">
              {t("mapping.activeVersion")}: <span className="font-medium">{activeVersionId || t("mapping.na")}</span> (
              {activeVersion?.status ?? t("mapping.unknown")})
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex flex-wrap items-center gap-2 rounded-lg border border-zinc-200 dark:border-white/[0.08] bg-zinc-50/60 dark:bg-[#080c18] p-1">
              <button
                type="button"
                onClick={() => void undoLastAction()}
                disabled={undoHistory.length === 0}
                className="flex h-9 items-center gap-2 rounded-md border border-zinc-300 dark:border-white/[0.10] bg-white dark:bg-white/[0.05] px-3 text-sm font-medium text-zinc-700 dark:text-slate-200 hover:bg-zinc-50 dark:hover:bg-white/[0.06] disabled:opacity-50"
              >
                <Undo2 className="h-4 w-4" />
                {t("mapping.undo")} ({undoHistory.length}/5)
              </button>
              <button
                type="button"
                onClick={() => setFunctionListModalOpen(true)}
                className="flex h-9 items-center gap-2 rounded-md border border-zinc-300 dark:border-white/[0.10] bg-white dark:bg-white/[0.05] px-3 text-sm font-medium text-zinc-700 dark:text-slate-200 hover:bg-zinc-50 dark:hover:bg-white/[0.06]"
              >
                <BookOpen className="h-4 w-4" />
                Danh sách hàm
              </button>
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
              openCreateFieldTemplateModal={() => openCreateMasterTemplateModal()}
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
        <MappingVisualToolbar
          t={t}
          hasContext={hasContext}
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          showUnmappedOnly={showUnmappedOnly}
          setShowUnmappedOnly={setShowUnmappedOnly}
          onOpenAddFieldModal={() => void openCreateMasterTemplateModal()}
          sidebar={
            pendingOcrCount > 0 ? (
              <button
                type="button"
                onClick={() => setOcrReviewModalOpen(true)}
                className="rounded-full border border-amber-300 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/10 px-2 py-0.5 text-[11px] font-semibold text-amber-700 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-500/20 transition-colors"
              >
                {pendingOcrCount} chờ review
              </button>
            ) : (
              <span className="text-xs text-slate-500 dark:text-slate-400">{`OCR: ${ocrLogs.length} log`}</span>
            )
          }
          ocrProcessing={ocrProcessing}
          onOcrFileSelected={(file) => void handleOcrFileSelected(file)}
        />
        <SystemLogCard logs={ocrLogs} endRef={ocrLogEndRef} title="OCR Timeline" emptyText="Chưa có OCR log..." variant="light" />
        {message ? <p className="text-sm text-emerald-700">{message}</p> : null}
        {error ? <p className="text-sm text-rose-700">{error}</p> : null}
      </div>

      <MappingVisualSection
        t={t}
        hasContext={hasContext}
        setAddingFieldModal={setAddingFieldModal}
        showTechnicalKeys={showTechnicalKeys}
        setEditingFieldTemplateName={setEditingFieldTemplateName}
        editingFieldTemplateId={editingFieldTemplateId}
        editingFieldTemplateName={editingFieldTemplateName}
        savingEditedTemplate={savingEditedTemplate}
        saveEditedFieldTemplate={() => void saveEditedFieldTemplate()}
        stopEditingFieldTemplate={stopEditingFieldTemplate}
        openImportBackupModal={() => {}}
        openImportGroupModal={openImportGroupModal}
        openDeleteGenericTemplateModal={openDeleteGenericTemplateModal}
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
        ocrSuggestionsByField={ocrSuggestionsByField}
        onAcceptOcrSuggestion={handleAcceptOcrSuggestion}
        onDeclineOcrSuggestion={handleDeclineOcrSuggestion}
      />

      <MappingModals
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
      <OcrReviewModal
        isOpen={ocrReviewModalOpen}
        onClose={() => setOcrReviewModalOpen(false)}
        suggestions={ocrSuggestionsByField}
        repeaterSuggestions={repeaterSuggestionsByGroup}
        fieldCatalog={fieldCatalog}
        meta={lastOcrMeta}
        onAcceptOne={handleAcceptOcrSuggestion}
        onDeclineOne={handleDeclineOcrSuggestion}
        onAcceptAll={handleAcceptAllOcr}
        onDeclineAll={handleDeclineAllOcr}
        onAcceptRepeaterOne={handleAcceptRepeaterSuggestion}
        onDeclineRepeaterOne={handleDeclineRepeaterSuggestion}
        onAcceptRepeaterAll={handleAcceptAllRepeater}
        onDeclineRepeaterAll={handleDeclineAllRepeater}
      />
      <DeleteConfirmModal
        open={deleteMasterModalOpen}
        title="Xóa template mẫu"
        message="Hành động này không thể hoàn tác. Các bản gán (instance) đã tạo từ template này sẽ giữ nguyên dữ liệu đã clone."
        expectedName={editingFieldTemplateName}
        typedName={deleteMasterTypedName}
        setTypedName={setDeleteMasterTypedName}
        confirmLabel="Xóa template mẫu"
        loading={deleteMasterLoading}
        onClose={closeDeleteMasterModal}
        onConfirm={confirmDeleteMasterTemplate}
      />
      <ValidationResultPanel t={t} validation={validation} />

    </section>
  );
}

export default function MappingPage() {
  return (
    <Suspense fallback={<p className="text-sm text-coral-tree-600">Loading mapping...</p>}>
      <MappingPageContent />
    </Suspense>
  );
}
