import { memo, type Dispatch, type SetStateAction } from "react";
import type { DragEndEvent, SensorDescriptor, SensorOptions } from "@dnd-kit/core";
import type { FieldCatalogItem } from "@/lib/report/config-schema";
import type { TypeLabelMap } from "../helpers";
import type { OcrSuggestionMap } from "../types";
import { EditingTemplateBanner } from "./editing-template-banner";
import { FieldCatalogBoard } from "./field-catalog-board";
import type { GroupedTreeNode } from "@/core/use-cases/mapping-engine";

type MappingVisualSectionProps = {
  t: (key: string) => string;
  hasContext: boolean;
  setAddingFieldModal: Dispatch<SetStateAction<boolean>>;
  editingFieldTemplateId: string;
  editingFieldTemplateName: string;
  savingEditedTemplate: boolean;
  saveEditedFieldTemplate: () => void;
  setEditingFieldTemplateName: Dispatch<SetStateAction<string>>;
  stopEditingFieldTemplate: () => void | Promise<void>;
  openImportGroupModal: () => void;
  openDeleteGenericTemplateModal: () => void;
  isEditingMaster: boolean;
  sensors: SensorDescriptor<SensorOptions>[];
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
  showTechnicalKeys: boolean;
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
  confidenceByField: Record<string, number>;
  sampleByField: Record<string, string>;
  ocrSuggestionsByField: OcrSuggestionMap;
  onAcceptOcrSuggestion: (fieldKey: string) => void;
  onDeclineOcrSuggestion: (fieldKey: string) => void;
};

export const MappingVisualSection = memo(function MappingVisualSection({
  t,
  hasContext,
  setAddingFieldModal,
  showTechnicalKeys,
  setEditingFieldTemplateName,
  editingFieldTemplateId,
  editingFieldTemplateName,
  savingEditedTemplate,
  saveEditedFieldTemplate,
  stopEditingFieldTemplate,
  openImportGroupModal,
  openDeleteGenericTemplateModal,
  isEditingMaster,
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
  confidenceByField,
  sampleByField,
  ocrSuggestionsByField,
  onAcceptOcrSuggestion,
  onDeclineOcrSuggestion,
}: MappingVisualSectionProps) {
  return (
    <section className="space-y-4">
      <EditingTemplateBanner
        t={t}
        editingFieldTemplateId={editingFieldTemplateId}
        editingFieldTemplateName={editingFieldTemplateName}
        setEditingFieldTemplateName={setEditingFieldTemplateName}
        saveEditedFieldTemplate={saveEditedFieldTemplate}
        savingEditedTemplate={savingEditedTemplate}
        stopEditingFieldTemplate={stopEditingFieldTemplate}
        openImportGroupModal={openImportGroupModal}
        openDeleteGenericTemplateModal={openDeleteGenericTemplateModal}
        isEditingMaster={isEditingMaster}
      />

      <FieldCatalogBoard
        t={t}
        sensors={sensors}
        onDragEnd={handleDragEnd}
        groupedFieldTree={groupedFieldTree}
        hasContext={hasContext}
        parentGroups={parentGroups}
        collapsedParentGroups={collapsedParentGroups}
        data={{ values, fieldCatalog, showTechnicalKeys, typeLabels, formulas, confidenceByField, sampleByField, ocrSuggestionsByField }}
        groupActions={{
          collapseAllGroups,
          expandAllGroups,
          onOpenAddFieldModal: () => setAddingFieldModal(true),
          openCreateSubgroupModal,
          toggleParentCollapse,
          toggleRepeaterGroup,
          prepareAddFieldForGroup,
          openEditGroupModal,
          onDeleteGroup,
        }}
        fieldActions={{
          onRepeaterItemChange,
          onManualChange,
          removeRepeaterItem,
          addRepeaterItem,
          onFieldLabelChange,
          onFieldTypeChange,
          onMoveField: moveField,
          onOpenChangeGroupModal: openChangeGroupModal,
          onDeleteField: deleteField,
          onOpenFormulaModal,
          onAcceptOcrSuggestion,
          onDeclineOcrSuggestion,
        }}
      />
    </section>
  );
});
