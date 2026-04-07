"use client";

/**
 * mapping-page-content.tsx
 *
 * Inner content of MappingPage (wrapped in Suspense in page.tsx).
 * Consumes useMappingPageLogic and delegates rendering to sub-components.
 */

import { useMappingPageLogic } from "../hooks/useMappingPageLogic";
import { buildInternalFieldKey } from "../helpers";

import { ValidationResultPanel } from "./validation-result-panel";
import { MappingModals } from "./mapping-modals";
import { MappingVisualSection } from "./mapping-visual-section";
import { MappingVisualToolbar } from "./mapping-visual-toolbar";
import { MappingHeader } from "./mapping-header";
import { MappingStatusBar } from "./mapping-status-bar";
import { MappingSidebar } from "./mapping-sidebar";
import { CustomerPickerModal } from "./modals/customer-picker-modal";
import { TemplatePickerModal } from "./modals/template-picker-modal";
import { DeleteConfirmModal } from "./modals/delete-confirm-modal";
import { ImportGroupPromptModal } from "./modals/import-group-prompt-modal";
import { OcrReviewModal } from "./modals/ocr-review-modal";
import { SnapshotRestoreModal } from "./modals/snapshot-restore-modal";
import { SystemLogCard } from "./system-log-card";
import { FinancialAnalysisModal } from "@/components/financial-analysis/financial-analysis-modal";
import { useCustomerStore } from "../stores/use-customer-store";
import { useFieldTemplateStore } from "../stores/use-field-template-store";
import { useUiStore } from "../stores/use-ui-store";
import { useOcrStore } from "../stores/use-ocr-store";

export function MappingPageContent() {
  const {
    t,
    financialAnalysisOpen, setFinancialAnalysisOpen,
    snapshotRestoreOpen, setSnapshotRestoreOpen,
    customerPickerOpen, setCustomerPickerOpen,
    templatePickerOpen, setTemplatePickerOpen,
    toolbarUploadRef,
    ocrLogEndRef,
    sidebarOpen, toggleSidebar,
    aliasText, validation, fieldCatalog, formulas,
    ocrSuggestionsByField, repeaterSuggestionsByGroup,
    ocrLogs, lastOcrMeta,
    loading, saving, message, error,
    searchTerm, showUnmappedOnly, showTechnicalKeys, selectedGroup,
    addingFieldModal, functionListModalOpen,
    importGroupModalOpen, ocrReviewModalOpen, deleteMaster,
    newField, formulaModalFieldKey, importGroupTemplateId,
    importGroupPath, importGroupPrompt,
    selectedCustomerId,
    allFieldTemplates, editingFieldTemplatePicker,
    editPickerTemplateId, editingFieldTemplateId, editingFieldTemplateName,
    savingEditedTemplate, promotingToMaster,
    editingGroup, editingGroupValue, editingGroupError,
    changingFieldGroup, changingFieldGroupValue, changingFieldGroupNewName,
    mergingGroups, mergeSourceGroups, mergeTargetGroup,
    mergeOrderMode, mergeGroupsError, collapsedParentGroups,
    undoHistory,
    setEditPickerTemplateId, setEditingGroupValue,
    setChangingFieldGroupValue, setChangingFieldGroupNewName,
    setMergeTargetGroup, setMergeGroupsError, setMergeOrderMode,
    setAddingFieldModal, setNewField, setSelectedGroup,
    setEditingGroup, setEditingGroupError, setFunctionListModalOpen,
    setFormulaModalFieldKey, setFormulas, setImportGroupTemplateId,
    setImportGroupPath, setEditingFieldTemplateName,
    setShowTechnicalKeys, setSearchTerm, setShowUnmappedOnly,
    saveDraft,
    applySelectedFieldTemplate, openEditFieldTemplatePicker,
    closeEditFieldTemplatePicker, startEditingExistingTemplate,
    stopEditingFieldTemplate, assignSelectedFieldTemplate,
    closeDeleteMasterModal, confirmDeleteMasterTemplate,
    openCreateMasterTemplateModal, openImportGroupModal, closeImportGroupModal,
    applyImportGroupToCurrentTemplate, resolveImportGroupPrompt,
    openDeleteGenericTemplateModal,
    hasContext, groupedFieldTree, parentGroups, effectiveValues,
    sampleByField, confidenceByField, typeLabels, pendingOcrCount,
    undoLastAction, openChangeGroupModal, onManualChange, moveField,
    onFieldLabelChange, onFieldTypeChange, addNewField,
    prepareAddFieldForGroup, deleteField, deleteGroup,
    existingGroups, mergePreview, closeChangeGroupModal, applyChangeGroup,
    toggleRepeaterGroup, addRepeaterItem, removeRepeaterItem,
    onRepeaterItemChange, openEditGroupModal, openCreateSubgroupModal,
    closeEditGroupModal, toggleParentCollapse, collapseAllGroups,
    expandAllGroups, applyEditGroup, openMergeGroupsModal,
    closeMergeGroupsModal, toggleMergeSourceGroup, applyMergeGroups,
    sensors, handleDragEnd,
    handleOcrFileSelected, handleApplyFinancialValues,
    handleImportFieldFile,
    handleOpenCustomerPicker, handleOpenTemplatePicker,
    handleUploadDocument, handleOpenFinancialAnalysis,
    handleOpenOcrReview, handleSaveEditedFieldTemplate,
    handlePromoteToMasterTemplate, handleOpenFormulaModal,
    handleAcceptOcrSuggestion, handleDeclineOcrSuggestion,
    isEditingMaster, mappedFieldCount,
  } = useMappingPageLogic();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand-200 border-t-brand-500 dark:border-brand-700 dark:border-t-brand-400" />
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
          onOpenCustomerPicker={handleOpenCustomerPicker}
          onOpenTemplatePicker={handleOpenTemplatePicker}
          onUploadDocument={handleUploadDocument}
          onOpenFinancialAnalysis={handleOpenFinancialAnalysis}
          onToggleSidebar={toggleSidebar}
          hasCustomer={!!selectedCustomerId}
          hasTemplate={!!selectedCustomerId || !!editingFieldTemplateId}
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
          onOpenOcrReview={handleOpenOcrReview}
          fieldCount={fieldCatalog.length}
          mappedFieldCount={mappedFieldCount}
          fieldCatalog={fieldCatalog}
          effectiveValues={effectiveValues}
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
        saveEditedFieldTemplate={handleSaveEditedFieldTemplate}
        stopEditingFieldTemplate={stopEditingFieldTemplate}
        openImportGroupModal={openImportGroupModal}
        openDeleteGenericTemplateModal={openDeleteGenericTemplateModal}
        isEditingMaster={isEditingMaster}
        promoteToMasterTemplate={handlePromoteToMasterTemplate}
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
        onOpenFormulaModal={handleOpenFormulaModal}
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
          useUiStore.getState().setModals({ deleteMaster: { ...curr, typedName: v } });
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
        customerTypeFilter="corporate"
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
