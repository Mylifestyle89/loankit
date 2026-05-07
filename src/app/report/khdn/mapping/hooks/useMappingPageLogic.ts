"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useLanguage } from "@/components/language-provider";
import { useModalStore } from "@/lib/report/use-modal-store";

// ── Stores ───────────────────────────────────────────────────────────────────
import { useMappingDataStore } from "../stores/use-mapping-data-store";
import { useOcrStore } from "../stores/use-ocr-store";
import { useUiStore } from "../stores/use-ui-store";
import { useCustomerStore } from "../stores/use-customer-store";
import { useFieldTemplateStore } from "../stores/use-field-template-store";
import { useGroupUiStore } from "../stores/use-group-ui-store";
import { useUndoStore } from "../stores/use-undo-store";
import { useFieldUsageStore } from "../stores/use-field-usage-store";

// ── Feature hooks ─────────────────────────────────────────────────────────────
import { useFieldCatalogImport } from "./useFieldCatalogImport";
import { useFieldTemplates } from "./useFieldTemplates";
import { useGroupManagement } from "./useGroupManagement";
import { useMappingApi } from "./useMappingApi";
import { useMappingDispatches } from "./useMappingDispatches";
import { useMappingComputed } from "./useMappingComputed";
import { useFieldGroupActions } from "./useFieldGroupActions";
import { useTemplateActions } from "./useTemplateActions";
import { useAiOcrActions } from "./useAiOcrActions";
import { useDragAndDrop } from "./useDragAndDrop";
import { useMappingEffects } from "./useMappingEffects";
import { useMappingModalState } from "./use-mapping-modal-state";

/**
 * Aggregates all state, computed values, and handlers for the Mapping page.
 * The page component consumes this hook and only handles JSX rendering.
 */
export function useMappingPageLogic() {
  const { t } = useLanguage();
  const searchParams = useSearchParams();

  // ── Modal state (local UI) ─────────────────────────────────────────────────
  const {
    financialAnalysisOpen, setFinancialAnalysisOpen,
    customerPickerOpen, setCustomerPickerOpen,
    templatePickerOpen, setTemplatePickerOpen,
    toolbarUploadRef,
    ocrLogEndRef,
    openedAiSuggestionFromQueryRef,
    handleOpenOcrReview,
    handleAcceptOcrSuggestion,
    handleDeclineOcrSuggestion,
  } = useMappingModalState();

  // ── Store subscriptions ────────────────────────────────────────────────────
  const sidebarOpen = useUiStore((s) => s.sidebarOpen);
  const toggleSidebar = useUiStore((s) => s.toggleSidebar);

  const mappingText = useMappingDataStore((s) => s.mappingText);
  const aliasText = useMappingDataStore((s) => s.aliasText);
  const validation = useMappingDataStore((s) => s.validation);
  const activeVersionId = useMappingDataStore((s) => s.activeVersionId);
  const versions = useMappingDataStore((s) => s.versions);
  const fieldCatalog = useMappingDataStore((s) => s.fieldCatalog);
  const values = useMappingDataStore((s) => s.values);
  const formulas = useMappingDataStore((s) => s.formulas);
  const storedMasterTemplateId = useMappingDataStore((s) => s.selectedMasterTemplateId);
  const storedLoanId = useMappingDataStore((s) => s.selectedLoanId);
  const multiActiveLoansWarning = useMappingDataStore((s) => s.multiActiveLoansWarning);

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
  const openModal = useModalStore((s) => s.openModal);

  const selectedMasterTemplateId =
    storedMasterTemplateId || selectedFieldTemplateId || editingFieldTemplateId || undefined;
  const selectedLoanId = storedLoanId || undefined;

  // ── Dispatches ─────────────────────────────────────────────────────────────
  const {
    setEditPickerTemplateId,
    setEditingGroupValue,
    setChangingFieldGroupValue,
    setChangingFieldGroupNewName,
    setMergeTargetGroup,
    setMergeGroupsError,
    setMergeOrderMode,
    setAddingFieldModal,
    setNewField,
    setSelectedGroup,
    setEditingGroup,
    setEditingGroupError,
    setFunctionListModalOpen,
    setFormulaModalFieldKey,
    setFormulas,
    setImportGroupTemplateId,
    setImportGroupPath,
    setEditingFieldTemplateName,
    setShowTechnicalKeys,
    setSearchTerm,
    setShowUnmappedOnly,
  } = useMappingDispatches();

  // ── Feature hooks ──────────────────────────────────────────────────────────
  const {
    loadData,
    loadCustomers,
    saveDraft,
    getAutoProcessAssets,
    uploadAutoProcessFile,
    runSmartAutoBatch,
    openAutoProcessOutputFolder,
  } = useMappingApi({ t, selectedMasterTemplateId, selectedLoanId });

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

  const {
    openImportGroupPrompt,
    resolveImportGroupPrompt,
    handleApplyBkImport,
    openDeleteGenericTemplateModal,
    closeDeleteMasterModal,
    confirmDeleteMasterTemplate,
    openCreateMasterTemplateModal,
    createTemplateFromImport,
    openImportGroupModal,
    closeImportGroupModal,
    applyImportGroupToCurrentTemplate,
  } = useTemplateActions({
    t,
    loadAllFieldTemplates,
    loadFieldTemplates,
    stopEditingFieldTemplate,
  });

  const {
    aiPlaceholders,
    aiPlaceholderLabels,
    visibleFieldCatalog,
    hasContext,
    groupedFieldTree,
    parentGroups,
    effectiveValues,
    sampleByField,
    confidenceByField,
    typeLabels,
    pendingOcrCount,
  } = useMappingComputed({
    t,
    mappingText,
    aliasText,
    fieldCatalog,
    values,
    formulas,
    activeVersionId,
    versions,
    editingFieldTemplateId,
    selectedCustomerId,
    selectedFieldTemplateId,
    customGroups,
    searchTerm,
    showUnmappedOnly,
    ocrSuggestionsByField,
  });

  const {
    undoLastAction,
    openChangeGroupModal,
    onManualChange,
    moveField,
    onFieldLabelChange,
    onFieldTypeChange,
    addNewField,
    prepareAddFieldForGroup,
    deleteField,
    deleteGroup,
  } = useFieldGroupActions({ t });

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

  const { sensors, handleDragEnd } = useDragAndDrop();

  const {
    runAiSuggestion,
    handleOcrFileSelected,
    handleApplyFinancialValues,
  } = useAiOcrActions({
    t,
    aiPlaceholders,
    aiPlaceholderLabels,
    handleApplyBkImport,
    runSmartAutoBatch,
    getAutoProcessAssets,
    uploadAutoProcessFile,
    openAutoProcessOutputFolder,
  });

  const { handleImportFieldFile } = useFieldCatalogImport({
    t,
    onMissingGroupPrompt: openImportGroupPrompt,
    onCreateTemplateFromImport: createTemplateFromImport,
  });

  // ── Effects ────────────────────────────────────────────────────────────────
  useMappingEffects({
    loadData,
    loadCustomers,
    loadAllFieldTemplates,
    loadFieldTemplates,
    runAiSuggestion,
    searchParams,
    selectedCustomerId,
    editingFieldTemplateId,
    ocrLogEndRef,
  });

  const fetchFieldUsage = useFieldUsageStore((s) => s.fetchUsage);
  useEffect(() => { void fetchFieldUsage(); }, [fetchFieldUsage]);

  // Focus field from URL param (quick navigation from Template page)
  useEffect(() => {
    const focusKey = searchParams.get("focus");
    if (!focusKey) return;
    const timer = setTimeout(() => {
      const row = document.querySelector<HTMLElement>(`[data-field-row="${CSS.escape(focusKey)}"]`);
      if (!row) return;
      row.scrollIntoView({ behavior: "smooth", block: "center" });
      row.classList.add("ring-2", "ring-brand-500", "ring-offset-1", "bg-brand-50/50", "dark:bg-brand-500/10");
      setTimeout(() => {
        row.classList.remove("ring-2", "ring-brand-500", "ring-offset-1", "bg-brand-50/50", "dark:bg-brand-500/10");
      }, 3000);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchParams]);

  // Ctrl+Z undo shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        undoLastAction();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [undoLastAction]);

  // ── Toolbar callbacks ──────────────────────────────────────────────────────
  const handleOpenCustomerPicker = useCallback(() => setCustomerPickerOpen(true), [setCustomerPickerOpen]);
  const handleOpenTemplatePicker = useCallback(() => setTemplatePickerOpen(true), [setTemplatePickerOpen]);
  const handleUploadDocument = useCallback(() => toolbarUploadRef.current?.click(), [toolbarUploadRef]);
  const handleOpenFinancialAnalysis = useCallback(() => {
    if (!selectedCustomerId) {
      useUiStore.getState().setStatus({ error: "Xin hãy chọn khách hàng trước khi sử dụng Phân tích tài chính." });
      return;
    }
    setFinancialAnalysisOpen(true);
  }, [selectedCustomerId, setFinancialAnalysisOpen]);
  const handleSaveEditedFieldTemplate = useCallback(
    () => void saveEditedFieldTemplate(),
    [saveEditedFieldTemplate],
  );
  const handleOpenFormulaModal = useCallback(
    (fieldKey: string) => useUiStore.getState().setContext({ formulaFieldKey: fieldKey }),
    [],
  );

  // ── Derived memos ──────────────────────────────────────────────────────────
  const isEditingMaster = useMemo(
    () => allFieldTemplates.some((i) => i.id === editingFieldTemplateId),
    [allFieldTemplates, editingFieldTemplateId],
  );

  const mappedFieldCount = useMemo(() => {
    if (!fieldCatalog.length) return 0;
    return fieldCatalog.filter((f) => {
      return f.field_key && effectiveValues[f.field_key] != null && effectiveValues[f.field_key] !== "";
    }).length;
  }, [fieldCatalog, effectiveValues]);

  return {
    // i18n
    t,
    // UI state
    financialAnalysisOpen, setFinancialAnalysisOpen,
    customerPickerOpen, setCustomerPickerOpen,
    templatePickerOpen, setTemplatePickerOpen,
    toolbarUploadRef,
    ocrLogEndRef,
    openedAiSuggestionFromQueryRef,
    // Sidebar
    sidebarOpen, toggleSidebar,
    // Mapping data
    mappingText, aliasText, validation, activeVersionId, versions,
    fieldCatalog, values, formulas,
    // OCR
    ocrProcessing, ocrSuggestionsByField, repeaterSuggestionsByGroup,
    ocrLogs, lastOcrMeta,
    // UI status + filters + modals + context
    loading, saving, message, error,
    searchTerm, showUnmappedOnly, showTechnicalKeys, selectedGroup,
    addingFieldModal, importingCatalog, functionListModalOpen,
    importGroupModalOpen, ocrReviewModalOpen, deleteMaster,
    newField, formulaModalFieldKey, importGroupTemplateId,
    importGroupPath, importGroupPrompt,
    // Customer
    customers, loadingCustomers, selectedCustomerId,
    // Field templates
    fieldTemplates, allFieldTemplates, loadingFieldTemplates,
    selectedFieldTemplateId, editingFieldTemplatePicker,
    editPickerTemplateId, editingFieldTemplateId, editingFieldTemplateName,
    savingEditedTemplate,
    selectedMasterTemplateId,
    selectedLoanId,
    multiActiveLoansWarning,
    // Group UI
    editingGroup, editingGroupValue, editingGroupError, customGroups,
    changingFieldGroup, changingFieldGroupValue, changingFieldGroupNewName,
    mergingGroups, mergeSourceGroups, mergeTargetGroup,
    mergeOrderMode, mergeGroupsError, collapsedParentGroups,
    // Undo
    undoHistory,
    // Misc
    openModal,
    // Dispatches
    setEditPickerTemplateId, setEditingGroupValue,
    setChangingFieldGroupValue, setChangingFieldGroupNewName,
    setMergeTargetGroup, setMergeGroupsError, setMergeOrderMode,
    setAddingFieldModal, setNewField, setSelectedGroup,
    setEditingGroup, setEditingGroupError, setFunctionListModalOpen,
    setFormulaModalFieldKey, setFormulas, setImportGroupTemplateId,
    setImportGroupPath, setEditingFieldTemplateName,
    setShowTechnicalKeys, setSearchTerm, setShowUnmappedOnly,
    // API
    saveDraft, loadData,
    // Field templates actions
    applySelectedFieldTemplate, openEditFieldTemplatePicker,
    closeEditFieldTemplatePicker, startEditingExistingTemplate,
    stopEditingFieldTemplate, assignSelectedFieldTemplate,
    // Template actions
    openImportGroupPrompt, resolveImportGroupPrompt,
    openDeleteGenericTemplateModal, closeDeleteMasterModal,
    confirmDeleteMasterTemplate, openCreateMasterTemplateModal,
    openImportGroupModal, closeImportGroupModal,
    applyImportGroupToCurrentTemplate,
    // Computed
    hasContext, groupedFieldTree, parentGroups, effectiveValues,
    sampleByField, confidenceByField, typeLabels, pendingOcrCount,
    // Field & group actions
    undoLastAction, openChangeGroupModal, onManualChange, moveField,
    onFieldLabelChange, onFieldTypeChange, addNewField,
    prepareAddFieldForGroup, deleteField, deleteGroup,
    existingGroups, mergePreview, closeChangeGroupModal, applyChangeGroup,
    toggleRepeaterGroup, addRepeaterItem, removeRepeaterItem,
    onRepeaterItemChange, openEditGroupModal, openCreateSubgroupModal,
    closeEditGroupModal, toggleParentCollapse, collapseAllGroups,
    expandAllGroups, applyEditGroup, openMergeGroupsModal,
    closeMergeGroupsModal, toggleMergeSourceGroup, applyMergeGroups,
    // DnD
    sensors, handleDragEnd,
    // OCR / AI actions
    handleOcrFileSelected, handleApplyFinancialValues,
    handleImportFieldFile,
    // Callbacks
    handleOpenCustomerPicker, handleOpenTemplatePicker,
    handleUploadDocument, handleOpenFinancialAnalysis,
    handleOpenOcrReview, handleSaveEditedFieldTemplate,
    handleOpenFormulaModal,
    handleAcceptOcrSuggestion, handleDeclineOcrSuggestion,
    // Derived
    isEditingMaster, mappedFieldCount,
  };
}
