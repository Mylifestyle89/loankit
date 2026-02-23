import type { ChangeEvent, Dispatch, SetStateAction } from "react";
import type { DragEndEvent } from "@dnd-kit/core";
import type { FieldCatalogItem } from "@/lib/report/config-schema";
import type { TypeLabelMap } from "../helpers";
import { MappingVisualToolbar } from "./MappingVisualToolbar";
import { EditingTemplateBanner } from "./EditingTemplateBanner";
import { FieldCatalogBoard } from "./FieldCatalogBoard";
import { MappingSidebar } from "./MappingSidebar";
import type { FieldTemplateItem } from "../types";

type GroupedTreeNode = {
  parent: string;
  children: Array<{ fullPath: string; subgroup: string; fields: FieldCatalogItem[] }>;
};

type MappingVisualSectionProps = {
  t: (key: string) => string;
  hasContext: boolean;
  searchTerm: string;
  setSearchTerm: Dispatch<SetStateAction<string>>;
  setAddingFieldModal: Dispatch<SetStateAction<boolean>>;
  exportingDocx: boolean;
  exportAndOpenDocx: () => void;
  lastExportedDocxPath: string;
  customers: Array<{ id: string; customer_name: string; customer_code: string }>;
  selectedCustomerId: string;
  setSelectedCustomerId: Dispatch<SetStateAction<string>>;
  loadingCustomers: boolean;
  loading: boolean;
  fieldTemplates: FieldTemplateItem[];
  allFieldTemplates: FieldTemplateItem[];
  selectedFieldTemplateId: string;
  applySelectedFieldTemplate: (id: string) => void;
  loadingFieldTemplates: boolean;
  openCreateFieldTemplateModal: () => void;
  assignSelectedFieldTemplate: () => void;
  openEditFieldTemplatePicker: () => void;
  showTechnicalKeys: boolean;
  setShowTechnicalKeys: Dispatch<SetStateAction<boolean>>;
  importingCatalog: boolean;
  handleImportFieldFile: (
    e: ChangeEvent<HTMLInputElement>,
    options?: { mode?: "append" | "overwrite"; templateName?: string | null },
  ) => void;
  openMergeGroupsModal: () => void;
  setEditingFieldTemplateId: Dispatch<SetStateAction<string>>;
  setEditingFieldTemplateName: Dispatch<SetStateAction<string>>;
  editingFieldTemplateId: string;
  editingFieldTemplateName: string;
  savingEditedTemplate: boolean;
  saveEditedFieldTemplate: () => void;
  stopEditingFieldTemplate: () => void;
  openBackupFolder: () => void;
  sensors: any;
  handleDragEnd: (event: DragEndEvent) => void;
  groupedFieldTree: GroupedTreeNode[];
  parentGroups: string[];
  collapsedParentGroups: string[];
  collapseAllGroups: () => void;
  expandAllGroups: () => void;
  openCreateSubgroupModal: (parentGroup: string) => void;
  toggleParentCollapse: (parent: string) => void;
  toggleRepeaterGroup: (groupPath: string) => void;
  prepareAddFieldForGroup: (groupPath: string) => void;
  openEditGroupModal: (group: string) => void;
  onDeleteGroup: (groupPath: string) => void;
  values: Record<string, unknown>;
  fieldCatalog: FieldCatalogItem[];
  typeLabels: TypeLabelMap;
  onRepeaterItemChange: (groupPath: string, index: number, field: FieldCatalogItem, rawVal: string) => void;
  onManualChange: (field: FieldCatalogItem, rawValue: string) => void;
  removeRepeaterItem: (groupPath: string, index: number) => void;
  addRepeaterItem: (groupPath: string) => void;
  onFieldLabelChange: (fieldKey: string, labelVi: string) => void;
  onFieldTypeChange: (fieldKey: string, type: FieldCatalogItem["type"]) => void;
  moveField: (fieldKey: string, direction: "up" | "down") => void;
  openChangeGroupModal: (fieldKey: string) => void;
  deleteField: (fieldKey: string) => void;
  formulas: Record<string, string>;
  onOpenFormulaModal: (fieldKey: string) => void;
};

export function MappingVisualSection({
  t,
  hasContext,
  searchTerm,
  setSearchTerm,
  setAddingFieldModal,
  exportingDocx,
  exportAndOpenDocx,
  lastExportedDocxPath,
  customers,
  selectedCustomerId,
  setSelectedCustomerId,
  loadingCustomers,
  loading,
  fieldTemplates,
  allFieldTemplates,
  selectedFieldTemplateId,
  applySelectedFieldTemplate,
  loadingFieldTemplates,
  openCreateFieldTemplateModal,
  assignSelectedFieldTemplate,
  openEditFieldTemplatePicker,
  showTechnicalKeys,
  setShowTechnicalKeys,
  importingCatalog,
  handleImportFieldFile,
  openMergeGroupsModal,
  setEditingFieldTemplateId,
  setEditingFieldTemplateName,
  editingFieldTemplateId,
  editingFieldTemplateName,
  savingEditedTemplate,
  saveEditedFieldTemplate,
  stopEditingFieldTemplate,
  openBackupFolder,
  sensors,
  handleDragEnd,
  groupedFieldTree,
  parentGroups,
  collapsedParentGroups,
  collapseAllGroups,
  expandAllGroups,
  openCreateSubgroupModal,
  toggleParentCollapse,
  toggleRepeaterGroup,
  prepareAddFieldForGroup,
  openEditGroupModal,
  onDeleteGroup,
  values,
  fieldCatalog,
  typeLabels,
  onRepeaterItemChange,
  onManualChange,
  removeRepeaterItem,
  addRepeaterItem,
  onFieldLabelChange,
  onFieldTypeChange,
  moveField,
  openChangeGroupModal,
  deleteField,
  formulas,
  onOpenFormulaModal,
}: MappingVisualSectionProps) {
  return (
    <section className="space-y-4">
      <MappingVisualToolbar
        t={t}
        hasContext={hasContext}
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        onOpenAddFieldModal={() => setAddingFieldModal(true)}
        exportingDocx={exportingDocx}
        onExportAndOpenDocx={exportAndOpenDocx}
        lastExportedDocxPath={lastExportedDocxPath}
        sidebar={
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
          />
        }
      />

      <EditingTemplateBanner
        t={t}
        editingFieldTemplateId={editingFieldTemplateId}
        editingFieldTemplateName={editingFieldTemplateName}
        setEditingFieldTemplateName={setEditingFieldTemplateName}
        saveEditedFieldTemplate={saveEditedFieldTemplate}
        savingEditedTemplate={savingEditedTemplate}
        stopEditingFieldTemplate={stopEditingFieldTemplate}
        openBackupFolder={openBackupFolder}
      />

      <FieldCatalogBoard
        t={t}
        sensors={sensors}
        onDragEnd={handleDragEnd}
        groupedFieldTree={groupedFieldTree}
        hasContext={hasContext}
        parentGroups={parentGroups}
        collapsedParentGroups={collapsedParentGroups}
        collapseAllGroups={collapseAllGroups}
        expandAllGroups={expandAllGroups}
        onOpenAddFieldModal={() => setAddingFieldModal(true)}
        openCreateSubgroupModal={openCreateSubgroupModal}
        toggleParentCollapse={toggleParentCollapse}
        toggleRepeaterGroup={toggleRepeaterGroup}
        prepareAddFieldForGroup={prepareAddFieldForGroup}
        openEditGroupModal={openEditGroupModal}
        onDeleteGroup={onDeleteGroup}
        values={values}
        fieldCatalog={fieldCatalog}
        showTechnicalKeys={showTechnicalKeys}
        typeLabels={typeLabels}
        onRepeaterItemChange={onRepeaterItemChange}
        onManualChange={onManualChange}
        removeRepeaterItem={removeRepeaterItem}
        addRepeaterItem={addRepeaterItem}
        onFieldLabelChange={onFieldLabelChange}
        onFieldTypeChange={onFieldTypeChange}
        onMoveField={moveField}
        onOpenChangeGroupModal={openChangeGroupModal}
        onDeleteField={deleteField}
        formulas={formulas}
        onOpenFormulaModal={onOpenFormulaModal}
      />
    </section>
  );
}
