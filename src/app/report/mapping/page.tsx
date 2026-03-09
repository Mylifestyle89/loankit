"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useLanguage } from "@/components/language-provider";


import { ValidationResultPanel } from "./components/ValidationResultPanel";
import { MappingModals } from "./components/MappingModals";
import { MappingVisualSection } from "./components/MappingVisualSection";
import { MappingVisualToolbar } from "./components/MappingVisualToolbar";
import { MappingHeader } from "./components/MappingHeader";
import { MappingStatusBar } from "./components/MappingStatusBar";
import { MappingSidebar } from "./components/MappingSidebar";
import { CustomerPickerModal } from "./components/Modals/CustomerPickerModal";
import { TemplatePickerModal } from "./components/Modals/TemplatePickerModal";
import { DeleteConfirmModal } from "./components/Modals/DeleteConfirmModal";
import { ImportGroupPromptModal } from "./components/Modals/ImportGroupPromptModal";
import { OcrReviewModal } from "./components/Modals/OcrReviewModal";
import { SnapshotRestoreModal } from "./components/Modals/SnapshotRestoreModal";
import { SystemLogCard } from "./components/SystemLogCard";
import { FinancialAnalysisModal } from "@/components/FinancialAnalysisModal";
import { useFieldCatalogImport } from "./hooks/useFieldCatalogImport";
import { useFieldTemplates } from "./hooks/useFieldTemplates";
import { useGroupManagement } from "./hooks/useGroupManagement";
import { useMappingApi } from "./hooks/useMappingApi";
import { useAutoSaveSnapshot } from "./hooks/useAutoSaveSnapshot";
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
import { useModalStore } from "@/lib/report/use-modal-store";

// ── Stores ──────────────────────────────────────────────────────────────────
import { useMappingDataStore } from "./stores/use-mapping-data-store";
import { useOcrStore } from "./stores/use-ocr-store";
import { useUiStore } from "./stores/use-ui-store";
import { useCustomerStore } from "./stores/use-customer-store";
import { useFieldTemplateStore } from "./stores/use-field-template-store";
import { useGroupUiStore } from "./stores/use-group-ui-store";
import { useUndoStore } from "./stores/use-undo-store";
import { useMappingDispatches } from "./hooks/useMappingDispatches";
import { useMappingComputed } from "./hooks/useMappingComputed";
import { useFieldGroupActions } from "./hooks/useFieldGroupActions";
import { useTemplateActions } from "./hooks/useTemplateActions";
import { useAiOcrActions } from "./hooks/useAiOcrActions";
import { useDragAndDrop } from "./hooks/useDragAndDrop";
import { useMappingEffects } from "./hooks/useMappingEffects";

function MappingPageContent() {
  const { t } = useLanguage();
  const searchParams = useSearchParams();

  const [financialAnalysisOpen, setFinancialAnalysisOpen] = useState(false);
  const [snapshotRestoreOpen, setSnapshotRestoreOpen] = useState(false);
  const [customerPickerOpen, setCustomerPickerOpen] = useState(false);
  const [templatePickerOpen, setTemplatePickerOpen] = useState(false);
  const sidebarOpen = useUiStore((s) => s.sidebarOpen);
  const toggleSidebar = useUiStore((s) => s.toggleSidebar);

  // Hidden file input for toolbar Upload button
  const toolbarUploadRef = useRef<HTMLInputElement>(null);
  useAutoSaveSnapshot();

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
  const promotingToMaster = useFieldTemplateStore((s) => s.promotingToMaster);

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

  const openModal = useModalStore((s) => s.openModal);
  const openedAiSuggestionFromQueryRef = useRef(false);

  // ── Dispatch-compatible store setters ─────────────────────────────────────
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

  const selectedMappingInstanceId = useMemo(() => {
    if (!selectedCustomerId) return undefined;
    const candidateId = selectedFieldTemplateId || editingFieldTemplateId;
    if (!candidateId) return undefined;
    // In customer mode, only IDs from fieldTemplates are mapping-instance IDs.
    return fieldTemplates.some((template) => template.id === candidateId) ? candidateId : undefined;
  }, [editingFieldTemplateId, fieldTemplates, selectedCustomerId, selectedFieldTemplateId]);

  // ── Hooks ─────────────────────────────────────────────────────────────────
  const {
    loadData,
    loadCustomers,
    saveDraft,
    getAutoProcessAssets,
    uploadAutoProcessFile,
    runSmartAutoBatch,
    openAutoProcessOutputFolder,
  } = useMappingApi({ t, selectedMappingInstanceId });

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
    promoteToMasterTemplate,
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

  // ── Computed values ───────────────────────────────────────────────────────
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

  // ── Field & Group management actions ───────────────────────────────────────
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

  // ── Callbacks ─────────────────────────────────────────────────────────────

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

  // ── useEffects ────────────────────────────────────────────────────────────
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

  // ── Ctrl+Z undo shortcut ──────────────────────────────────────────────────
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

  const mappedFieldCount = useMemo(() => {
    if (!fieldCatalog.length) return 0;
    return fieldCatalog.filter((f) => {
      return f.field_key && effectiveValues[f.field_key] != null && effectiveValues[f.field_key] !== "";
    }).length;
  }, [fieldCatalog, effectiveValues]);

  // ── Render ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-violet-200 border-t-violet-600 dark:border-violet-800 dark:border-t-violet-400" />
      </div>
    );
  }

  return (
    <section className="space-y-4">
      <div className="space-y-3 rounded-xl border border-zinc-200 dark:border-white/[0.08] bg-white/90 dark:bg-[#141414]/90 p-3 shadow-sm">
        <MappingHeader saving={saving} saveDraft={saveDraft} />

        <MappingVisualToolbar
          t={t}
          hasContext={hasContext}
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          showUnmappedOnly={showUnmappedOnly}
          setShowUnmappedOnly={setShowUnmappedOnly}
          showTechnicalKeys={showTechnicalKeys}
          setShowTechnicalKeys={setShowTechnicalKeys}
          onOpenCustomerPicker={() => setCustomerPickerOpen(true)}
          onOpenTemplatePicker={() => setTemplatePickerOpen(true)}
          onUploadDocument={() => toolbarUploadRef.current?.click()}
          onOpenFinancialAnalysis={() => {
            if (!selectedCustomerId) {
              useUiStore.getState().setStatus({ error: "Xin hãy chọn khách hàng trước khi sử dụng Phân tích tài chính." });
              return;
            }
            setFinancialAnalysisOpen(true);
          }}
          onToggleSidebar={toggleSidebar}
          hasCustomer={!!selectedCustomerId}
          hasTemplate={!!selectedFieldTemplateId || !!editingFieldTemplateId}
          sidebarOpen={sidebarOpen}
        />

        {/* Hidden file input for toolbar Upload button */}
        <input
          ref={toolbarUploadRef}
          type="file"
          accept=".docx,.png,.jpg,.jpeg,.webp,.pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void handleOcrFileSelected(file);
            e.target.value = "";
          }}
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

        <MappingStatusBar
          undoLastAction={undoLastAction}
          undoHistoryLength={undoHistory.length}
          pendingOcrCount={pendingOcrCount}
          ocrLogCount={ocrLogs.length}
          onOpenOcrReview={() => useUiStore.getState().setModals({ ocrReview: true })}
          fieldCount={fieldCatalog.length}
          mappedFieldCount={mappedFieldCount}
        />
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
        openImportGroupModal={openImportGroupModal}
        openDeleteGenericTemplateModal={openDeleteGenericTemplateModal}
        isEditingMaster={allFieldTemplates.some((i) => i.id === editingFieldTemplateId)}
        promoteToMasterTemplate={() => void promoteToMasterTemplate()}
        promotingToMaster={promotingToMaster}
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

      <FinancialAnalysisModal
        isOpen={financialAnalysisOpen}
        onClose={() => setFinancialAnalysisOpen(false)}
        fieldCatalog={fieldCatalog}
        onApply={handleApplyFinancialValues}
      />

      <SnapshotRestoreModal
        open={snapshotRestoreOpen}
        onClose={() => setSnapshotRestoreOpen(false)}
      />

      <CustomerPickerModal
        isOpen={customerPickerOpen}
        onClose={() => setCustomerPickerOpen(false)}
        onSelect={(id) => {
          useFieldTemplateStore.getState().setEditingFieldTemplateId("");
          useFieldTemplateStore.getState().setEditingFieldTemplateName("");
          useCustomerStore.getState().setSelectedCustomerId(id);
          setCustomerPickerOpen(false);
        }}
      />

      <TemplatePickerModal
        isOpen={templatePickerOpen}
        onClose={() => setTemplatePickerOpen(false)}
        onSelect={(id) => {
          applySelectedFieldTemplate(id);
          setTemplatePickerOpen(false);
        }}
        onCreateNew={() => {
          setTemplatePickerOpen(false);
          void openCreateMasterTemplateModal();
        }}
        onEditTemplate={() => {
          setTemplatePickerOpen(false);
          void openEditFieldTemplatePicker();
        }}
        onAttachTemplate={() => {
          setTemplatePickerOpen(false);
          void assignSelectedFieldTemplate();
        }}
      />

      <MappingSidebar
        openMergeGroupsModal={openMergeGroupsModal}
        handleImportFieldFile={handleImportFieldFile}
        onOpenSnapshotRestore={() => setSnapshotRestoreOpen(true)}
      />
    </section>
  );
}

export default function MappingPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center py-16"><div className="h-6 w-6 animate-spin rounded-full border-2 border-violet-200 border-t-violet-600 dark:border-violet-800 dark:border-t-violet-400" /></div>}>
      <MappingPageContent />
    </Suspense>
  );
}
