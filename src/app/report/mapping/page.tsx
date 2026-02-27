"use client";

import type { Dispatch, SetStateAction } from "react";
import { Suspense, useCallback, useEffect, useMemo, useRef } from "react";
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
  OcrProcessResponse,
  OcrSuggestionMap,
  RepeaterSuggestionItem,
  RepeaterSuggestionMap,
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

// ── Stores ──────────────────────────────────────────────────────────────────
import { useMappingDataStore } from "./stores/use-mapping-data-store";
import { useOcrStore } from "./stores/use-ocr-store";
import { useUiStore } from "./stores/use-ui-store";
import { useCustomerStore } from "./stores/use-customer-store";
import { useFieldTemplateStore } from "./stores/use-field-template-store";
import { useGroupUiStore } from "./stores/use-group-ui-store";
import { useUndoStore } from "./stores/use-undo-store";

/**
 * Bridges a Zustand simple setter into a React `Dispatch<SetStateAction<T>>`.
 * Lets us pass store setters to child components typed with useState-style setters.
 */
function dispatchify<T>(getVal: () => T, setter: (v: T) => void): Dispatch<SetStateAction<T>> {
  return (action) => {
    const next = typeof action === "function" ? (action as (prev: T) => T)(getVal()) : action;
    setter(next);
  };
}

function MappingPageContent() {
  const { t } = useLanguage();
  const searchParams = useSearchParams();

  // ── Reactive store subscriptions ──────────────────────────────────────────
  const mappingText = useMappingDataStore((s) => s.mappingText);
  const aliasText = useMappingDataStore((s) => s.aliasText);
  const validation = useMappingDataStore((s) => s.validation);
  const activeVersionId = useMappingDataStore((s) => s.activeVersionId);
  const versions = useMappingDataStore((s) => s.versions);
  const fieldCatalog = useMappingDataStore((s) => s.fieldCatalog);
  const values = useMappingDataStore((s) => s.values);
  const formulas = useMappingDataStore((s) => s.formulas);

  const ocrProcessing = useOcrStore((s) => s.ocrProcessing);
  const ocrSuggestionsByField = useOcrStore((s) => s.ocrSuggestionsByField);
  const repeaterSuggestionsByGroup = useOcrStore((s) => s.repeaterSuggestionsByGroup);
  const ocrLogs = useOcrStore((s) => s.ocrLogs);
  const lastOcrMeta = useOcrStore((s) => s.lastOcrMeta);

  const { loading, saving, message, error } = useUiStore((s) => s.status);
  const { searchTerm, showUnmappedOnly, showTechnicalKeys, selectedGroup } = useUiStore(
    (s) => s.filters,
  );
  const {
    addingField: addingFieldModal,
    importingCatalog,
    functionList: functionListModalOpen,
    importGroup: importGroupModalOpen,
    ocrReview: ocrReviewModalOpen,
    deleteMaster,
  } = useUiStore((s) => s.modals);
  const {
    newField,
    formulaFieldKey: formulaModalFieldKey,
    importGroupTemplateId,
    importGroupPath,
    importGroupPrompt,
  } = useUiStore((s) => s.context);

  const customers = useCustomerStore((s) => s.customers);
  const loadingCustomers = useCustomerStore((s) => s.loadingCustomers);
  const selectedCustomerId = useCustomerStore((s) => s.selectedCustomerId);

  const fieldTemplates = useFieldTemplateStore((s) => s.fieldTemplates);
  const allFieldTemplates = useFieldTemplateStore((s) => s.allFieldTemplates);
  const loadingFieldTemplates = useFieldTemplateStore((s) => s.loadingFieldTemplates);
  const selectedFieldTemplateId = useFieldTemplateStore((s) => s.selectedFieldTemplateId);
  const editingFieldTemplatePicker = useFieldTemplateStore((s) => s.editingFieldTemplatePicker);
  const editPickerTemplateId = useFieldTemplateStore((s) => s.editPickerTemplateId);
  const editingFieldTemplateId = useFieldTemplateStore((s) => s.editingFieldTemplateId);
  const editingFieldTemplateName = useFieldTemplateStore((s) => s.editingFieldTemplateName);
  const savingEditedTemplate = useFieldTemplateStore((s) => s.savingEditedTemplate);

  const editingGroup = useGroupUiStore((s) => s.editingGroup);
  const editingGroupValue = useGroupUiStore((s) => s.editingGroupValue);
  const editingGroupError = useGroupUiStore((s) => s.editingGroupError);
  const customGroups = useGroupUiStore((s) => s.customGroups);
  const changingFieldGroup = useGroupUiStore((s) => s.changingFieldGroup);
  const changingFieldGroupValue = useGroupUiStore((s) => s.changingFieldGroupValue);
  const changingFieldGroupNewName = useGroupUiStore((s) => s.changingFieldGroupNewName);
  const mergingGroups = useGroupUiStore((s) => s.mergingGroups);
  const mergeSourceGroups = useGroupUiStore((s) => s.mergeSourceGroups);
  const mergeTargetGroup = useGroupUiStore((s) => s.mergeTargetGroup);
  const mergeOrderMode = useGroupUiStore((s) => s.mergeOrderMode);
  const mergeGroupsError = useGroupUiStore((s) => s.mergeGroupsError);
  const collapsedParentGroups = useGroupUiStore((s) => s.collapsedParentGroups);

  const undoHistory = useUndoStore((s) => s.undoHistory);

  // ── Refs ──────────────────────────────────────────────────────────────────
  const ocrLogEndRef = useRef<HTMLDivElement | null>(null);
  const importGroupPromptResolver = useRef<
    ((decision: "create_once" | "create_all" | "stop") => void) | null
  >(null);

  const { openModal } = useModal();

  // ── Dispatch-compatible store setters ─────────────────────────────────────
  const setEditPickerTemplateId = dispatchify(
    () => useFieldTemplateStore.getState().editPickerTemplateId,
    useFieldTemplateStore.getState().setEditPickerTemplateId,
  );
  const setEditingGroupValue = dispatchify(
    () => useGroupUiStore.getState().editingGroupValue,
    useGroupUiStore.getState().setEditingGroupValue,
  );
  const setChangingFieldGroupValue = dispatchify(
    () => useGroupUiStore.getState().changingFieldGroupValue,
    useGroupUiStore.getState().setChangingFieldGroupValue,
  );
  const setChangingFieldGroupNewName = dispatchify(
    () => useGroupUiStore.getState().changingFieldGroupNewName,
    useGroupUiStore.getState().setChangingFieldGroupNewName,
  );
  const setMergeTargetGroup = dispatchify(
    () => useGroupUiStore.getState().mergeTargetGroup,
    useGroupUiStore.getState().setMergeTargetGroup,
  );
  const setMergeGroupsError = dispatchify(
    () => useGroupUiStore.getState().mergeGroupsError,
    useGroupUiStore.getState().setMergeGroupsError,
  );
  const setMergeOrderMode = dispatchify(
    () => useGroupUiStore.getState().mergeOrderMode,
    useGroupUiStore.getState().setMergeOrderMode,
  );
  const setAddingFieldModal = dispatchify(
    () => useUiStore.getState().modals.addingField,
    (v) => useUiStore.getState().setModals({ addingField: v }),
  );
  const setNewField = dispatchify(
    () => useUiStore.getState().context.newField,
    (v) => useUiStore.getState().setContext({ newField: v }),
  );
  const setSelectedGroup = dispatchify(
    () => useUiStore.getState().filters.selectedGroup,
    (v) => useUiStore.getState().setFilters({ selectedGroup: v }),
  );
  const setEditingGroup = dispatchify(
    () => useGroupUiStore.getState().editingGroup,
    useGroupUiStore.getState().setEditingGroup,
  );
  const setEditingGroupError = dispatchify(
    () => useGroupUiStore.getState().editingGroupError,
    useGroupUiStore.getState().setEditingGroupError,
  );
  const setFunctionListModalOpen = dispatchify(
    () => useUiStore.getState().modals.functionList,
    (v) => useUiStore.getState().setModals({ functionList: v }),
  );
  const setFormulaModalFieldKey = dispatchify(
    () => useUiStore.getState().context.formulaFieldKey,
    (v) => useUiStore.getState().setContext({ formulaFieldKey: v }),
  );
  const setFormulas = dispatchify(
    () => useMappingDataStore.getState().formulas,
    (v) => useMappingDataStore.getState().setFormulas(v),
  );
  const setImportGroupTemplateId = dispatchify(
    () => useUiStore.getState().context.importGroupTemplateId,
    (v) => useUiStore.getState().setContext({ importGroupTemplateId: v }),
  );
  const setImportGroupPath = dispatchify(
    () => useUiStore.getState().context.importGroupPath,
    (v) => useUiStore.getState().setContext({ importGroupPath: v }),
  );
  const setEditingFieldTemplateName = dispatchify(
    () => useFieldTemplateStore.getState().editingFieldTemplateName,
    useFieldTemplateStore.getState().setEditingFieldTemplateName,
  );
  const setShowTechnicalKeys = dispatchify(
    () => useUiStore.getState().filters.showTechnicalKeys,
    (v) => useUiStore.getState().setFilters({ showTechnicalKeys: v }),
  );
  const setSearchTerm = dispatchify(
    () => useUiStore.getState().filters.searchTerm,
    (v) => useUiStore.getState().setFilters({ searchTerm: v }),
  );
  const setShowUnmappedOnly = dispatchify(
    () => useUiStore.getState().filters.showUnmappedOnly,
    (v) => useUiStore.getState().setFilters({ showUnmappedOnly: v }),
  );

  // ── Hooks ─────────────────────────────────────────────────────────────────
  const {
    loadData,
    saveDraft,
    getAutoProcessAssets,
    uploadAutoProcessFile,
    runSmartAutoBatch,
    openAutoProcessOutputFolder,
  } = useMappingApi({ t });

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
  } = useFieldTemplates({ t });

  // ── Computed values ───────────────────────────────────────────────────────
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

    for (const field of fieldCatalog) {
      const key = field.field_key?.trim();
      const label = field.label_vi?.trim();
      if (!key || !label) continue;
      if (placeholderSet.has(key)) result[key] = label;
    }

    try {
      const parsed = JSON.parse(aliasText) as Record<string, unknown>;
      const looksTechnical = (value: string) => /[._]/.test(value);
      for (const [k, v] of Object.entries(parsed)) {
        const key = k.trim();
        if (typeof v !== "string") continue;
        const value = v.trim();
        if (!key || !value) continue;
        if (placeholderSet.has(key) && !result[key] && !looksTechnical(value)) {
          result[key] = value;
          continue;
        }
        if (placeholderSet.has(value) && !result[value] && !looksTechnical(key)) {
          result[value] = key;
        }
      }
    } catch {
      // best-effort
    }

    return result;
  }, [aiPlaceholders, aliasText, fieldCatalog]);

  const activeVersion = useMemo(
    () => versions?.find((item) => item.id === activeVersionId),
    [activeVersionId, versions],
  );

  const visibleFieldCatalog = useMemo(
    () =>
      editingFieldTemplateId || (selectedCustomerId && selectedFieldTemplateId)
        ? fieldCatalog
        : [],
    [editingFieldTemplateId, fieldCatalog, selectedCustomerId, selectedFieldTemplateId],
  );

  const hasContext = !!selectedCustomerId || !!editingFieldTemplateId;

  const groupedFieldTree = useMemo(
    () =>
      buildGroupedFieldTree({
        visibleFieldCatalog,
        customGroups,
        searchTerm,
        values,
        showUnmappedOnly,
      }),
    [customGroups, searchTerm, showUnmappedOnly, values, visibleFieldCatalog],
  );

  const parentGroups = useMemo(
    () => groupedFieldTree.map((node) => node.parent),
    [groupedFieldTree],
  );

  const effectiveValues = useMemo(
    () => computeEffectiveValues({ values, formulas, fieldCatalog }),
    [values, formulas, fieldCatalog],
  );

  const sampleByField = useMemo<Record<string, string>>(() => {
    const result: Record<string, string> = {};
    for (const field of fieldCatalog) {
      const raw = effectiveValues[field.field_key];
      if (raw === null || raw === undefined) { result[field.field_key] = ""; continue; }
      if (typeof raw === "string") { result[field.field_key] = raw.trim(); continue; }
      if (typeof raw === "number" || typeof raw === "boolean") {
        result[field.field_key] = String(raw);
        continue;
      }
      if (Array.isArray(raw)) {
        result[field.field_key] = raw.length > 0 ? `${raw.length} records` : "";
        continue;
      }
      result[field.field_key] =
        Object.keys(raw as Record<string, unknown>).length > 0 ? "Object value" : "";
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

  // ── Group management hook ─────────────────────────────────────────────────
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
  } = useGroupManagement({ t, groupedFieldTree, parentGroups });

  // ── Callbacks ─────────────────────────────────────────────────────────────
  const openImportGroupPrompt = useCallback(
    (args: { rowNumber: number; missingPath: string; level: "parent" | "subgroup" }) =>
      new Promise<"create_once" | "create_all" | "stop">((resolve) => {
        importGroupPromptResolver.current = resolve;
        useUiStore.getState().setContext({ importGroupPrompt: args });
      }),
    [],
  );

  const resolveImportGroupPrompt = useCallback(
    (decision: "create_once" | "create_all" | "stop") => {
      importGroupPromptResolver.current?.(decision);
      importGroupPromptResolver.current = null;
      useUiStore.getState().setContext({ importGroupPrompt: null });
    },
    [],
  );

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const { fieldCatalog: cat, setFieldCatalog } = useMappingDataStore.getState();
    const getKey = (id: string) => (id.includes("___") ? id.split("___")[0] : id);
    const activeKey = getKey(String(active.id));
    const overKey = getKey(String(over.id));
    const oldIndex = cat.findIndex((f) => f.field_key === activeKey);
    const newIndex = cat.findIndex((f) => f.field_key === overKey);
    if (oldIndex !== -1 && newIndex !== -1 && cat[oldIndex].group === cat[newIndex].group) {
      setFieldCatalog(arrayMove(cat, oldIndex, newIndex));
    }
  }, []);

  const applyAiSuggestion = useCallback(
    (payload: ApplyAiSuggestionPayload) => {
      const { mappingText: txt, setMappingText } = useMappingDataStore.getState();
      const { setStatus } = useUiStore.getState();
      try {
        const { nextMappingText, matched } = applyAiSuggestionPure(txt, payload);
        setMappingText(nextMappingText);
        const groupingMsg = payload.grouping
          ? ` ${t("mapping.aiSuggest.groupingResult")
              .replace("{groupKey}", payload.grouping.groupKey)
              .replace("{repeatKey}", payload.grouping.repeatKey)}`
          : "";
        setStatus({
          message: t("mapping.aiSuggest.ok").replace("{count}", String(matched)) + groupingMsg,
          error: "",
        });
      } catch {
        setStatus({ error: t("mapping.aiSuggest.err.failed") });
      }
    },
    [t],
  );

  const runSmartAutoBatchFlow = useCallback(
    async (input: {
      excelPath: string;
      templatePath: string;
      rootKeyOverride?: string;
      jobType?: string;
    }) => {
      const { setAutoProcessing, setAutoProcessJob } = useOcrStore.getState();
      const { setStatus } = useUiStore.getState();
      setAutoProcessing(true);
      setStatus({ error: "" });
      try {
        const finalJob = await runSmartAutoBatch({
          excelPath: input.excelPath,
          templatePath: input.templatePath,
          rootKeyOverride: input.rootKeyOverride,
          jobType: input.jobType,
          onProgress: (job) => setAutoProcessJob(job),
        });
        setAutoProcessJob(finalJob);
        setStatus({
          message: t("mapping.smartAutoBatch.done").replace(
            "{count}",
            String(finalJob.output_paths.length),
          ),
        });
        await openAutoProcessOutputFolder(finalJob.job_id);
      } catch (e) {
        setStatus({
          error: e instanceof Error ? e.message : "Smart Auto-Batch thất bại.",
        });
      } finally {
        setAutoProcessing(false);
      }
    },
    [openAutoProcessOutputFolder, runSmartAutoBatch, t],
  );

  const openAutoProcessResultFolder = useCallback(async () => {
    const { autoProcessJob } = useOcrStore.getState();
    if (!autoProcessJob?.job_id) return;
    try {
      await openAutoProcessOutputFolder(autoProcessJob.job_id);
    } catch (e) {
      useUiStore
        .getState()
        .setStatus({
          error: e instanceof Error ? e.message : "Không thể mở thư mục kết quả.",
        });
    }
  }, [openAutoProcessOutputFolder]);

  const handleApplyFinancialValues = useCallback((aiValues: Record<string, string>) => {
    const { setManualValues, setValues } = useMappingDataStore.getState();
    setManualValues((prev) => ({ ...prev, ...aiValues }));
    setValues((prev) => ({ ...prev, ...aiValues }));
  }, []);

  const runAiSuggestion = useCallback(() => {
    const { autoProcessJob, autoProcessing: isAuto } = useOcrStore.getState();
    const { fieldCatalog: cat } = useMappingDataStore.getState();
    openModal("aiMapping", {
      placeholders: aiPlaceholders,
      placeholderLabels: aiPlaceholderLabels,
      onApply: applyAiSuggestion,
      onSmartAutoBatch: runSmartAutoBatchFlow,
      onLoadAssetOptions: () => getAutoProcessAssets(),
      onUploadFile: (file: File, kind: "data" | "template") => uploadAutoProcessFile(file, kind),
      autoProcessJob,
      autoProcessing: isAuto,
      onOpenOutputFolder: openAutoProcessResultFolder,
      t,
      fieldCatalog: cat,
      onApplyFinancialValues: handleApplyFinancialValues,
    });
  }, [
    aiPlaceholders,
    aiPlaceholderLabels,
    applyAiSuggestion,
    getAutoProcessAssets,
    handleApplyFinancialValues,
    openAutoProcessResultFolder,
    openModal,
    runSmartAutoBatchFlow,
    t,
    uploadAutoProcessFile,
  ]);

  const pushUndoSnapshot = useCallback(() => {
    const mds = useMappingDataStore.getState();
    const guis = useGroupUiStore.getState();
    const { filters, context } = useUiStore.getState();
    useUndoStore.getState().pushUndo({
      fieldCatalog: [...mds.fieldCatalog],
      values: { ...mds.values },
      manualValues: { ...mds.manualValues },
      formulas: { ...mds.formulas },
      customGroups: [...guis.customGroups],
      selectedGroup: filters.selectedGroup,
      newField: { ...context.newField },
      mappingText: mds.mappingText,
      collapsedParentGroups: [...guis.collapsedParentGroups],
    });
  }, []);

  const undoLastAction = useCallback(() => {
    const snapshot = useUndoStore.getState().popUndo();
    if (!snapshot) return;
    const { setFieldCatalog, setValues, setManualValues, setFormulas, setMappingText } =
      useMappingDataStore.getState();
    const { setCustomGroups, setCollapsedParentGroups } = useGroupUiStore.getState();
    const { setFilters, setContext, setStatus } = useUiStore.getState();
    setFieldCatalog(snapshot.fieldCatalog);
    setValues(snapshot.values);
    setManualValues(snapshot.manualValues);
    setFormulas(snapshot.formulas);
    setCustomGroups(snapshot.customGroups);
    setFilters({ selectedGroup: snapshot.selectedGroup });
    setContext({ newField: snapshot.newField });
    setMappingText(snapshot.mappingText);
    setCollapsedParentGroups(snapshot.collapsedParentGroups);
    setStatus({ message: t("mapping.msg.undoDone"), error: "" });
  }, [t]);

  const openChangeGroupModal = useCallback((fieldKey: string) => {
    const { fieldCatalog: cat } = useMappingDataStore.getState();
    const field = cat.find((f) => f.field_key === fieldKey);
    if (!field) return;
    const g = useGroupUiStore.getState();
    g.setChangingFieldGroup(fieldKey);
    g.setChangingFieldGroupValue("");
    g.setChangingFieldGroupNewName("");
  }, []);

  const onManualChange = useCallback((field: FieldCatalogItem, rawValue: string) => {
    const normalized = normalizeInputByType(rawValue, field.type);
    const { setManualValues, setValues } = useMappingDataStore.getState();
    setManualValues((prev) => ({ ...prev, [field.field_key]: normalized }));
    setValues((prev) => ({ ...prev, [field.field_key]: normalized }));
  }, []);

  const moveField = useCallback((fieldKey: string, direction: "up" | "down") => {
    const { fieldCatalog: cat, setFieldCatalog } = useMappingDataStore.getState();
    const index = cat.findIndex((f) => f.field_key === fieldKey);
    if (index === -1) return;
    const group = cat[index].group;
    let swapIndex = index;
    if (direction === "up") {
      for (let i = index - 1; i >= 0; i -= 1) {
        if (cat[i].group === group) { swapIndex = i; break; }
      }
    } else {
      for (let i = index + 1; i < cat.length; i += 1) {
        if (cat[i].group === group) { swapIndex = i; break; }
      }
    }
    if (swapIndex === index) return;
    const next = [...cat];
    const tmp = next[index];
    next[index] = next[swapIndex];
    next[swapIndex] = tmp;
    setFieldCatalog(next);
  }, []);

  const onFieldLabelChange = useCallback((fieldKey: string, labelVi: string) => {
    useMappingDataStore
      .getState()
      .setFieldCatalog((prev) =>
        prev.map((item) => (item.field_key === fieldKey ? { ...item, label_vi: labelVi } : item)),
      );
  }, []);

  const onFieldTypeChange = useCallback((fieldKey: string, type: FieldCatalogItem["type"]) => {
    useMappingDataStore
      .getState()
      .setFieldCatalog((prev) =>
        prev.map((item) => (item.field_key === fieldKey ? { ...item, type } : item)),
      );
  }, []);

  function addNewField(
    override?: Partial<{
      label_vi: string;
      group: string;
      type: "string" | "number" | "percent" | "date" | "table";
    }>,
  ) {
    const { context, filters, setContext, setFilters, setModals, setStatus } =
      useUiStore.getState();
    const { fieldCatalog: cat, setFieldCatalog, setValues, setManualValues } =
      useMappingDataStore.getState();

    const resolvedGroup =
      override?.group?.trim() || filters.selectedGroup.trim() || context.newField.group.trim();
    const label = (override?.label_vi ?? context.newField.label_vi).trim();
    const type = override?.type ?? context.newField.type;

    if (!label || !resolvedGroup) {
      setStatus({ error: t("mapping.msg.needFieldGroup") });
      return;
    }

    const fieldKey = buildInternalFieldKey({
      group: resolvedGroup,
      labelVi: label,
      existingKeys: cat.map((item) => item.field_key),
    });

    if (cat.some((item) => item.field_key === fieldKey)) {
      setStatus({ error: t("mapping.msg.duplicatedField") });
      return;
    }

    setStatus({ error: "" });
    const item: FieldCatalogItem = {
      field_key: fieldKey,
      label_vi: label,
      group: resolvedGroup,
      type: toInternalType(type),
      required: false,
      examples: [],
    };
    setFieldCatalog((prev) => [...prev, item]);
    setValues((prev) => ({ ...prev, [fieldKey]: "" }));
    setManualValues((prev) => ({ ...prev, [fieldKey]: "" }));
    setContext({ newField: { label_vi: "", group: resolvedGroup, type } });
    setFilters({ selectedGroup: resolvedGroup });
    setModals({ addingField: false });
    setStatus({ message: t("mapping.msg.addedField") });
  }

  function prepareAddFieldForGroup(groupPath: string) {
    const ui = useUiStore.getState();
    ui.setFilters({ selectedGroup: groupPath });
    ui.setContext({ newField: { ...ui.context.newField, group: groupPath } });
    ui.setModals({ addingField: true });
  }

  const openImportGroupModal = useCallback(() => {
    useUiStore.getState().setContext({ importGroupTemplateId: "", importGroupPath: "" });
    useUiStore.getState().setModals({ importGroup: true });
  }, []);

  const closeImportGroupModal = useCallback(() => {
    useUiStore.getState().setModals({ importGroup: false });
  }, []);

  const applyImportGroupToCurrentTemplate = useCallback(() => {
    const { editingFieldTemplateId: tplId } = useFieldTemplateStore.getState();
    const { allFieldTemplates: allTpls } = useFieldTemplateStore.getState();
    const { context, setStatus, setModals } = useUiStore.getState();
    const { setFieldCatalog } = useMappingDataStore.getState();
    const { importGroupTemplateId: srcTplId, importGroupPath: srcPath } = context;

    if (!tplId) {
      setStatus({ error: "Vui lòng vào chế độ chỉnh template trước." });
      return;
    }
    if (!srcTplId || !srcPath) {
      setStatus({ error: "Vui lòng chọn mẫu nguồn và nhóm dữ liệu." });
      return;
    }

    const sourceTemplate = allTpls.find((tpl) => tpl.id === srcTplId);
    if (!sourceTemplate) {
      setStatus({ error: "Không tìm thấy mẫu nguồn." });
      return;
    }

    const sourceFields = normalizeFieldCatalogForSchema(sourceTemplate.field_catalog ?? []).filter(
      (field) => {
        const group = field.group?.trim() ?? "";
        return group === srcPath || group.startsWith(`${srcPath}/`);
      },
    );

    if (sourceFields.length === 0) {
      setStatus({ error: "Nhóm nguồn không có field để thêm." });
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
          while (existingKeys.has(targetKey)) { targetKey = `${base}_${i}`; i += 1; }
        }
        existingKeys.add(targetKey);
        next.push({ ...field, field_key: targetKey });
      }
      return next;
    });

    setStatus({ message: `Đã thêm nhóm "${srcPath}" từ mẫu "${sourceTemplate.name}".`, error: "" });
    setModals({ importGroup: false });
  }, []);

  const deleteField = useCallback(
    (fieldKey: string) => {
      if (typeof window !== "undefined" && !window.confirm(t("mapping.deleteFieldConfirm")))
        return;
      pushUndoSnapshot();
      const { setFieldCatalog, setValues, setManualValues, setFormulas, setMappingText } =
        useMappingDataStore.getState();
      const { setStatus } = useUiStore.getState();
      setFieldCatalog((prev) => prev.filter((f) => f.field_key !== fieldKey));
      setValues((prev) => { const n = { ...prev }; delete n[fieldKey]; return n; });
      setManualValues((prev) => { const n = { ...prev }; delete n[fieldKey]; return n; });
      setFormulas((prev) => { const n = { ...prev }; delete n[fieldKey]; return n; });
      setMappingText((prevTxt) => {
        try {
          const obj = JSON.parse(prevTxt);
          if (obj && Array.isArray(obj.mappings)) {
            obj.mappings = obj.mappings.filter(
              (m: { template_field?: unknown }) => m.template_field !== fieldKey,
            );
            return JSON.stringify(obj, null, 2);
          }
        } catch (e) {
          setStatus({
            error: e instanceof Error ? e.message : "Failed to update mapping on field delete.",
          });
        }
        return prevTxt;
      });
      setStatus({ message: t("mapping.msg.fieldDeleted"), error: "" });
    },
    [pushUndoSnapshot, t],
  );

  const deleteGroup = useCallback(
    (groupPath: string) => {
      const {
        fieldCatalog: cat,
        setFieldCatalog,
        setValues,
        setManualValues,
        setFormulas,
        setMappingText,
      } = useMappingDataStore.getState();
      const { customGroups: cGroups, setCustomGroups, setCollapsedParentGroups } =
        useGroupUiStore.getState();

      const normalized = groupPath.trim();
      if (!normalized) return;

      const groupsToDelete = new Set(
        [...cGroups, ...cat.map((f) => f.group)]
          .map((g) => g.trim())
          .filter((g) => g === normalized || g.startsWith(`${normalized}/`)),
      );
      if (groupsToDelete.size === 0) return;

      const fieldsToDelete = cat.filter((f) => groupsToDelete.has(f.group.trim()));

      openModal("deleteGroupConfirm", {
        groupPath: normalized,
        fieldCount: fieldsToDelete.length,
        onConfirm: () => {
          pushUndoSnapshot();
          const { filters, context, setFilters, setContext, setStatus } = useUiStore.getState();
          const fieldKeysToDelete = new Set(fieldsToDelete.map((f) => f.field_key));
          const firstSegmentsToDelete = new Set(
            Array.from(groupsToDelete).map((g) => g.split("/")[0]).filter(Boolean),
          );

          setFieldCatalog((prev) => prev.filter((f) => !groupsToDelete.has(f.group.trim())));
          setCustomGroups((prev) =>
            prev.filter((g) => {
              const trimmed = g.trim();
              return !(trimmed === normalized || trimmed.startsWith(`${normalized}/`));
            }),
          );
          setValues((prev) => {
            const n: Record<string, unknown> = { ...prev };
            for (const key of fieldKeysToDelete) delete n[key];
            for (const group of groupsToDelete) delete n[group];
            return n;
          });
          setManualValues((prev) => {
            const n = { ...prev };
            for (const key of fieldKeysToDelete) delete n[key];
            return n;
          });
          setFormulas((prev) => {
            const n = { ...prev };
            for (const key of fieldKeysToDelete) delete n[key];
            return n;
          });
          setCollapsedParentGroups((prev) =>
            prev.filter((parent) => !firstSegmentsToDelete.has(parent)),
          );
          if (
            filters.selectedGroup.trim() === normalized ||
            filters.selectedGroup.trim().startsWith(`${normalized}/`)
          ) {
            setFilters({ selectedGroup: "" });
          }
          if (
            context.newField.group.trim() === normalized ||
            context.newField.group.trim().startsWith(`${normalized}/`)
          ) {
            setContext({ newField: { ...context.newField, group: "Nhóm mới" } });
          }
          setMappingText((prevTxt) => {
            try {
              const obj = JSON.parse(prevTxt);
              if (obj && Array.isArray(obj.mappings)) {
                obj.mappings = obj.mappings.filter(
                  (m: { template_field?: unknown }) =>
                    !fieldKeysToDelete.has(String(m.template_field ?? "")),
                );
                return JSON.stringify(obj, null, 2);
              }
            } catch (e) {
              setStatus({
                error: e instanceof Error ? e.message : "Failed to update mapping on group delete.",
              });
            }
            return prevTxt;
          });
          setStatus({
            message: t("mapping.msg.groupDeleted").replace("{name}", normalized),
            error: "",
          });
        },
      });
    },
    [openModal, pushUndoSnapshot, t],
  );

  const openDeleteGenericTemplateModal = useCallback(() => {
    useUiStore
      .getState()
      .setModals({ deleteMaster: { open: true, typedName: "", loading: false } });
  }, []);

  const closeDeleteMasterModal = useCallback(() => {
    useUiStore
      .getState()
      .setModals({ deleteMaster: { open: false, typedName: "", loading: false } });
  }, []);

  const confirmDeleteMasterTemplate = useCallback(async () => {
    const { editingFieldTemplateId: tplId, editingFieldTemplateName: tplName } =
      useFieldTemplateStore.getState();
    const { setStatus } = useUiStore.getState();
    if (!tplId || !tplName.trim()) return;
    useUiStore
      .getState()
      .setModals((prev) => ({ deleteMaster: { ...prev.deleteMaster, loading: true } }));
    setStatus({ error: "" });
    try {
      const res = await fetch(`/api/report/master-templates/${tplId}`, { method: "DELETE" });
      const data = (await res.json()) as { ok: boolean; error?: string };
      if (!data.ok) throw new Error(data.error ?? "Xóa thất bại.");
      setStatus({ message: t("mapping.msg.templateDeleted").replace("{name}", tplName) });
      closeDeleteMasterModal();
      stopEditingFieldTemplate();
      await loadAllFieldTemplates();
    } catch (e) {
      setStatus({ error: e instanceof Error ? e.message : "Xóa thất bại." });
    } finally {
      useUiStore
        .getState()
        .setModals((prev) => ({ deleteMaster: { ...prev.deleteMaster, loading: false } }));
    }
  }, [closeDeleteMasterModal, loadAllFieldTemplates, stopEditingFieldTemplate, t]);

  const openCreateMasterTemplateModal = useCallback(
    (initialName = "") => {
      openModal("createMasterTemplate", {
        initialName,
        onSuccess: async (created: { id: string; name: string }) => {
          const { setStatus } = useUiStore.getState();
          const { selectedCustomerId: cid } = useCustomerStore.getState();
          const {
            setSelectedFieldTemplateId,
            setEditingFieldTemplateId,
            setEditingFieldTemplateName: setTplName,
          } = useFieldTemplateStore.getState();
          const { setFieldCatalog, setValues, setManualValues } = useMappingDataStore.getState();

          setStatus({
            message: t("mapping.msg.templateSaved").replace("{name}", created.name),
            error: "",
          });
          await loadAllFieldTemplates();

          if (cid) {
            await loadFieldTemplates(cid);
            const attachRes = await fetch("/api/report/mapping-instances", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                customer_id: cid,
                master_id: created.id,
                name: `${created.name}-${Date.now()}`,
              }),
            });
            const attachData = (await attachRes.json()) as {
              ok: boolean;
              mapping_instance?: { id: string };
            };
            await loadFieldTemplates(cid);
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
          setTplName(created.name);
        },
        onError: (msg: string) => {
          useUiStore.getState().setStatus({ error: msg });
        },
      });
    },
    [loadAllFieldTemplates, loadFieldTemplates, openModal, t],
  );

  async function createTemplateFromImport(params: {
    templateName: string;
    fieldCatalog: FieldCatalogItem[];
  }) {
    const { selectedCustomerId: cid } = useCustomerStore.getState();
    const {
      setSelectedFieldTemplateId,
      setEditingFieldTemplateId,
      setEditingFieldTemplateName: setTplName,
    } = useFieldTemplateStore.getState();
    const { setFieldCatalog, setValues, setManualValues } = useMappingDataStore.getState();

    const normalizedCatalog = normalizeFieldCatalogForSchema(params.fieldCatalog);
    const res = await fetch("/api/report/field-templates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: params.templateName,
        field_catalog: normalizedCatalog,
        customer_id: cid || undefined,
      }),
    });
    const data = (await res.json()) as {
      ok: boolean;
      error?: string;
      field_template?: { id: string; name: string; field_catalog?: FieldCatalogItem[] };
    };
    if (!data.ok) throw new Error(data.error ?? t("mapping.fieldTemplate.errSave"));

    await loadAllFieldTemplates();
    if (cid) await loadFieldTemplates(cid);

    if (data.field_template) {
      const createdCatalog = normalizeFieldCatalogForSchema(
        data.field_template.field_catalog ?? normalizedCatalog,
      );
      setSelectedFieldTemplateId(data.field_template.id);
      setEditingFieldTemplateId(data.field_template.id);
      setTplName(data.field_template.name);
      setFieldCatalog(createdCatalog);
      const emptyValues = Object.fromEntries(createdCatalog.map((f) => [f.field_key, ""]));
      setManualValues({});
      setValues(emptyValues);
    }
  }

  const { handleImportFieldFile } = useFieldCatalogImport({
    t,
    onMissingGroupPrompt: openImportGroupPrompt,
    onCreateTemplateFromImport: createTemplateFromImport,
  });

  const handleOcrFileSelected = useCallback(async (file: File) => {
    const { selectedFieldTemplateId: tplId } = useFieldTemplateStore.getState();
    const { selectedCustomerId } = useCustomerStore.getState();
    const {
      setOcrProcessing,
      setOcrSuggestionsByField,
      setRepeaterSuggestionsByGroup,
      setLastOcrMeta,
      pushOcrLog,
    } = useOcrStore.getState();
    const { setStatus, setModals } = useUiStore.getState();

    if (!tplId) {
      setStatus({ error: "Vui lòng chọn Mapping Instance hoặc Template trước khi OCR." });
      pushOcrLog("error", "OCR thất bại: thiếu context mapping/template.");
      return;
    }

    const fileName = (file.name ?? "").toLowerCase();
    const mimeType = (file.type ?? "").toLowerCase();
    const isDocx =
      fileName.endsWith(".docx") ||
      mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    const modeLabel = isDocx ? "DOCX Extract" : "OCR";
    const fallbackProcessUrl = isDocx
      ? "/api/report/mapping/docx-process"
      : "/api/report/mapping/ocr-process";
    const fallbackEnabled =
      String(process.env.NEXT_PUBLIC_EXTRACT_FALLBACK_ENABLED ?? "").toLowerCase() === "true" ||
      process.env.NODE_ENV === "development";

    setOcrProcessing(true);
    setStatus({ error: "" });
    pushOcrLog("system", `Bắt đầu ${modeLabel}: ${file.name}`);

    try {
      const form = new FormData();
      form.set("file", file);
      // Khi có khách hàng, tplId là MappingInstance ID → gửi làm mappingInstanceId.
      // Khi không có khách hàng, tplId là MasterTemplate ID → gửi làm fieldTemplateId.
      if (selectedCustomerId) {
        form.set("mappingInstanceId", tplId);
      } else {
        form.set("fieldTemplateId", tplId);
      }
      let res = await fetch("/api/report/mapping/extract-process", { method: "POST", body: form });
      let data = (await res.json()) as OcrProcessResponse;

      if (!res.ok || !data.ok) {
        if (fallbackEnabled) {
          pushOcrLog(
            "system",
            `Unified extract lỗi, fallback sang ${isDocx ? "DOCX route" : "OCR route"}...`,
          );
          res = await fetch(fallbackProcessUrl, { method: "POST", body: form });
          data = (await res.json()) as OcrProcessResponse;
        } else {
          throw new Error(
            data.error ?? `${modeLabel} failed on unified extract (fallback disabled).`,
          );
        }
      }
      if (!res.ok || !data.ok) throw new Error(data.error ?? `${modeLabel} failed.`);

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
        const typed = item as RepeaterSuggestionItem;
        if (!typed.groupPath || !Array.isArray(typed.rows) || typed.rows.length === 0) continue;
        repeaterNext[typed.groupPath] = {
          groupPath: typed.groupPath,
          fieldKeys: typed.fieldKeys ?? [],
          rows: typed.rows,
          confidenceScore: typed.confidenceScore ?? 0.6,
          status: typed.status ?? "pending",
          source: "docx_ai",
        };
      }

      setOcrSuggestionsByField(next);
      setRepeaterSuggestionsByGroup(repeaterNext);
      setLastOcrMeta(data.meta);
      if (Object.keys(next).length > 0 || Object.keys(repeaterNext).length > 0) {
        setModals({ ocrReview: true });
      }
      pushOcrLog(
        "ai",
        `${modeLabel} thành công, phát hiện ${Object.keys(next).length} trường dữ liệu.`,
      );
      if (Object.keys(repeaterNext).length > 0) {
        pushOcrLog(
          "ai",
          `${modeLabel} phát hiện ${Object.keys(repeaterNext).length} nhóm repeater.`,
        );
      }
      pushOcrLog("system", "Đã masking dữ liệu nhạy cảm trước khi AI xử lý.");
    } catch (err) {
      const msg = err instanceof Error ? err.message : `${modeLabel} failed.`;
      setStatus({ error: msg });
      pushOcrLog("error", `${modeLabel} lỗi: ${msg}`);
    } finally {
      setOcrProcessing(false);
    }
  }, []);

  const loadCustomers = useCallback(async () => {
    const { setCustomers, setLoadingCustomers } = useCustomerStore.getState();
    const { setStatus } = useUiStore.getState();
    setLoadingCustomers(true);
    try {
      const res = await fetch("/api/customers", { cache: "no-store" });
      const data = (await res.json()) as {
        ok: boolean;
        error?: string;
        customers?: Array<{ id: string; customer_name: string; customer_code: string }>;
      };
      if (data.ok && data.customers) setCustomers(data.customers);
    } catch (e) {
      setStatus({ error: e instanceof Error ? e.message : t("mapping.err.loadData") });
    } finally {
      setLoadingCustomers(false);
    }
  }, [t]);

  // ── useEffects ────────────────────────────────────────────────────────────

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { void loadData(); }, []);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { void loadCustomers(); void loadAllFieldTemplates(); }, []);

  useEffect(() => {
    if (editingFieldTemplateId) return;
    if (!selectedCustomerId) {
      useFieldTemplateStore.getState().setFieldTemplates([]);
      useFieldTemplateStore.getState().setSelectedFieldTemplateId("");
      useMappingDataStore.getState().setTemplateData([], {}, {});
      return;
    }
    // Clear stale data before loading to prevent flash of old customer data
    useFieldTemplateStore.getState().setSelectedFieldTemplateId("");
    useMappingDataStore.getState().setTemplateData([], {}, {});
    void loadFieldTemplates(selectedCustomerId);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editingFieldTemplateId, selectedCustomerId]);

  useEffect(() => {
    const onOpenSuggestion = () => runAiSuggestion();
    window.addEventListener("mapping:open-ai-suggestion", onOpenSuggestion);
    return () => window.removeEventListener("mapping:open-ai-suggestion", onOpenSuggestion);
  }, [runAiSuggestion]);

  useEffect(() => {
    if (searchParams.get("openAiSuggestion") === "1") runAiSuggestion();
  }, [runAiSuggestion, searchParams]);

  useEffect(() => {
    ocrLogEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [ocrLogs]);

  // ── Render ────────────────────────────────────────────────────────────────
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
              {t("mapping.activeVersion")}:{" "}
              <span className="font-medium">{activeVersionId || t("mapping.na")}</span> (
              {activeVersion?.status ?? t("mapping.unknown")})
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex flex-wrap items-center gap-2 rounded-lg border border-zinc-200 dark:border-white/[0.08] bg-zinc-50/60 dark:bg-[#080c18] p-1">
              <button
                type="button"
                onClick={undoLastAction}
                disabled={undoHistory.length === 0}
                className="flex h-9 items-center gap-2 rounded-md border border-zinc-300 dark:border-white/[0.10] bg-white dark:bg-white/[0.05] px-3 text-sm font-medium text-zinc-700 dark:text-slate-200 hover:bg-zinc-50 dark:hover:bg-white/[0.06] disabled:opacity-50"
              >
                <Undo2 className="h-4 w-4" />
                {t("mapping.undo")} ({undoHistory.length}/5)
              </button>
              <button
                type="button"
                onClick={() => useUiStore.getState().setModals({ functionList: true })}
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
              setSelectedCustomerId={useCustomerStore.getState().setSelectedCustomerId}
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
              setEditingFieldTemplateId={useFieldTemplateStore.getState().setEditingFieldTemplateId}
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
                onClick={() => useUiStore.getState().setModals({ ocrReview: true })}
                className="rounded-full border border-amber-300 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/10 px-2 py-0.5 text-[11px] font-semibold text-amber-700 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-500/20 transition-colors"
              >
                {pendingOcrCount} chờ review
              </button>
            ) : (
              <span className="text-xs text-slate-500 dark:text-slate-400">
                {`OCR: ${ocrLogs.length} log`}
              </span>
            )
          }
          ocrProcessing={ocrProcessing}
          onOcrFileSelected={(file) => void handleOcrFileSelected(file)}
        />

        <SystemLogCard
          logs={ocrLogs}
          endRef={ocrLogEndRef}
          title="OCR Timeline"
          emptyText="Chưa có OCR log..."
          variant="light"
        />
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
        onOpenFormulaModal={(fieldKey) =>
          useUiStore.getState().setContext({ formulaFieldKey: fieldKey })
        }
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
        onAcceptOcrSuggestion={(fk) => void useOcrStore.getState().acceptSuggestion(fk)}
        onDeclineOcrSuggestion={(fk) => useOcrStore.getState().declineSuggestion(fk)}
      />

      <MappingModals
        editingFieldTemplatePicker={editingFieldTemplatePicker}
        closeEditFieldTemplatePicker={closeEditFieldTemplatePicker}
        editPickerTemplateId={editPickerTemplateId}
        setEditPickerTemplateId={setEditPickerTemplateId}
        allFieldTemplates={allFieldTemplates}
        onStartEditingExistingTemplate={(templateId) => {
          useCustomerStore.getState().setSelectedCustomerId("");
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
        onClose={() => useUiStore.getState().setModals({ ocrReview: false })}
        suggestions={ocrSuggestionsByField}
        repeaterSuggestions={repeaterSuggestionsByGroup}
        fieldCatalog={fieldCatalog}
        meta={lastOcrMeta}
        onAcceptOne={(fk) => void useOcrStore.getState().acceptSuggestion(fk)}
        onDeclineOne={(fk) => useOcrStore.getState().declineSuggestion(fk)}
        onAcceptAll={() => void useOcrStore.getState().acceptAllSuggestions()}
        onDeclineAll={() => useOcrStore.getState().declineAllSuggestions()}
        onAcceptRepeaterOne={(gp) => void useOcrStore.getState().acceptRepeaterSuggestion(gp)}
        onDeclineRepeaterOne={(gp) => useOcrStore.getState().declineRepeaterSuggestion(gp)}
        onAcceptRepeaterAll={() => void useOcrStore.getState().acceptAllRepeaterSuggestions()}
        onDeclineRepeaterAll={() => useOcrStore.getState().declineAllRepeaterSuggestions()}
      />

      <DeleteConfirmModal
        open={deleteMaster.open}
        title="Xóa template mẫu"
        message="Hành động này không thể hoàn tác. Các bản gán (instance) đã tạo từ template này sẽ giữ nguyên dữ liệu đã clone."
        expectedName={editingFieldTemplateName}
        typedName={deleteMaster.typedName}
        setTypedName={(v) => {
          const curr = useUiStore.getState().modals.deleteMaster;
          useUiStore
            .getState()
            .setModals({ deleteMaster: { ...curr, typedName: v } });
        }}
        confirmLabel="Xóa template mẫu"
        loading={deleteMaster.loading}
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
