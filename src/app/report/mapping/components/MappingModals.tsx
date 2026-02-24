import type { Dispatch, SetStateAction } from "react";
import type { FieldCatalogItem } from "@/lib/report/config-schema";
import { FieldTemplateModals } from "./Modals/FieldTemplateModals";
import { EditGroupModal } from "./Modals/EditGroupModal";
import { ChangeFieldGroupModal } from "./Modals/ChangeFieldGroupModal";
import { MergeGroupsModal } from "./Modals/MergeGroupsModal";
import { AddFieldModal } from "./Modals/AddFieldModal";
import { FunctionListModal } from "./Modals/FunctionListModal";
import { FormulaModal } from "./Modals/FormulaModal";
import { ImportTemplateGroupModal } from "./Modals/ImportTemplateGroupModal";
import type { FieldTemplateItem } from "../types";

type MappingModalsProps = {
  creatingFieldTemplate: boolean;
  closeCreateFieldTemplateModal: () => void;
  newFieldTemplateName: string;
  setNewFieldTemplateName: Dispatch<SetStateAction<string>>;
  saveFieldTemplate: () => void;
  savingFieldTemplate: boolean;
  editingFieldTemplatePicker: boolean;
  closeEditFieldTemplatePicker: () => void;
  editPickerTemplateId: string;
  setEditPickerTemplateId: Dispatch<SetStateAction<string>>;
  allFieldTemplates: FieldTemplateItem[];
  onStartEditingExistingTemplate: (templateId: string) => void;

  editingGroup: string | null;
  closeEditGroupModal: () => void;
  editingGroupValue: string;
  setEditingGroupValue: Dispatch<SetStateAction<string>>;
  editingGroupError: string;
  applyEditGroup: () => void;

  changingFieldGroup: string | null;
  closeChangeGroupModal: () => void;
  changingFieldGroupValue: string;
  setChangingFieldGroupValue: Dispatch<SetStateAction<string>>;
  changingFieldGroupNewName: string;
  setChangingFieldGroupNewName: Dispatch<SetStateAction<string>>;
  existingGroups: string[];
  fieldCatalog: FieldCatalogItem[];
  applyChangeGroup: () => void;

  mergingGroups: boolean;
  closeMergeGroupsModal: () => void;
  mergeSourceGroups: string[];
  toggleMergeSourceGroup: (group: string) => void;
  mergeTargetGroup: string;
  setMergeTargetGroup: Dispatch<SetStateAction<string>>;
  mergeGroupsError: string;
  setMergeGroupsError: Dispatch<SetStateAction<string>>;
  mergeOrderMode: "keep" | "alpha";
  setMergeOrderMode: Dispatch<SetStateAction<"keep" | "alpha">>;
  mergePreview: { groupCount: number; fieldCount: number; targetGroup: string };
  applyMergeGroups: () => void;

  addingFieldModal: boolean;
  setAddingFieldModal: Dispatch<SetStateAction<boolean>>;
  newField: { label_vi: string; group: string; type: "string" | "number" | "percent" | "date" | "table" };
  setNewField: Dispatch<SetStateAction<{ label_vi: string; group: string; type: "string" | "number" | "percent" | "date" | "table" }>>;
  selectedGroup: string;
  setSelectedGroup: Dispatch<SetStateAction<string>>;
  setEditingGroup: Dispatch<SetStateAction<string | null>>;
  setEditingGroupError: Dispatch<SetStateAction<string>>;
  addNewField: (override?: Partial<{ label_vi: string; group: string; type: "string" | "number" | "percent" | "date" | "table" }>) => void;
  buildInternalFieldKey: (params: { group: string; labelVi: string; existingKeys: string[] }) => string;

  functionListModalOpen: boolean;
  setFunctionListModalOpen: Dispatch<SetStateAction<boolean>>;
  aliasText: string;
  formulaModalFieldKey: string | null;
  setFormulaModalFieldKey: Dispatch<SetStateAction<string | null>>;
  formulas: Record<string, string>;
  setFormulas: Dispatch<SetStateAction<Record<string, string>>>;

  importGroupModalOpen: boolean;
  closeImportGroupModal: () => void;
  importGroupTemplateId: string;
  setImportGroupTemplateId: Dispatch<SetStateAction<string>>;
  importGroupPath: string;
  setImportGroupPath: Dispatch<SetStateAction<string>>;
  applyImportGroupToCurrentTemplate: () => void;
};

export function MappingModals({
  creatingFieldTemplate,
  closeCreateFieldTemplateModal,
  newFieldTemplateName,
  setNewFieldTemplateName,
  saveFieldTemplate,
  savingFieldTemplate,
  editingFieldTemplatePicker,
  closeEditFieldTemplatePicker,
  editPickerTemplateId,
  setEditPickerTemplateId,
  allFieldTemplates,
  onStartEditingExistingTemplate,
  editingGroup,
  closeEditGroupModal,
  editingGroupValue,
  setEditingGroupValue,
  editingGroupError,
  applyEditGroup,
  changingFieldGroup,
  closeChangeGroupModal,
  changingFieldGroupValue,
  setChangingFieldGroupValue,
  changingFieldGroupNewName,
  setChangingFieldGroupNewName,
  existingGroups,
  fieldCatalog,
  applyChangeGroup,
  mergingGroups,
  closeMergeGroupsModal,
  mergeSourceGroups,
  toggleMergeSourceGroup,
  mergeTargetGroup,
  setMergeTargetGroup,
  mergeGroupsError,
  setMergeGroupsError,
  mergeOrderMode,
  setMergeOrderMode,
  mergePreview,
  applyMergeGroups,
  addingFieldModal,
  setAddingFieldModal,
  newField,
  setNewField,
  selectedGroup,
  setSelectedGroup,
  setEditingGroup,
  setEditingGroupError,
  addNewField,
  buildInternalFieldKey,
  functionListModalOpen,
  setFunctionListModalOpen,
  aliasText,
  formulaModalFieldKey,
  setFormulaModalFieldKey,
  formulas,
  setFormulas,
  importGroupModalOpen,
  closeImportGroupModal,
  importGroupTemplateId,
  setImportGroupTemplateId,
  importGroupPath,
  setImportGroupPath,
  applyImportGroupToCurrentTemplate,
}: MappingModalsProps) {
  const formulaField = formulaModalFieldKey
    ? fieldCatalog.find((f) => f.field_key === formulaModalFieldKey) ?? null
    : null;

  return (
    <>
      <FunctionListModal
        isOpen={functionListModalOpen}
        onClose={() => setFunctionListModalOpen(false)}
        aliasText={aliasText}
      />

      <FormulaModal
        isOpen={formulaModalFieldKey !== null}
        onClose={() => setFormulaModalFieldKey(null)}
        field={formulaField}
        currentFormula={formulaModalFieldKey ? formulas[formulaModalFieldKey] ?? "" : ""}
        onSave={(fieldKey, formula) => {
          setFormulas((prev) => ({ ...prev, [fieldKey]: formula }));
          setFormulaModalFieldKey(null);
        }}
        onClear={(fieldKey) => {
          setFormulas((prev) => {
            const next = { ...prev };
            delete next[fieldKey];
            return next;
          });
          setFormulaModalFieldKey(null);
        }}
      />

      <FieldTemplateModals
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
        startEditingExistingTemplate={onStartEditingExistingTemplate}
      />

      <ImportTemplateGroupModal
        isOpen={importGroupModalOpen}
        onClose={closeImportGroupModal}
        templates={allFieldTemplates}
        selectedSourceTemplateId={importGroupTemplateId}
        setSelectedSourceTemplateId={setImportGroupTemplateId}
        selectedGroupPath={importGroupPath}
        setSelectedGroupPath={setImportGroupPath}
        onApply={applyImportGroupToCurrentTemplate}
      />

      <EditGroupModal
        isOpen={editingGroup !== null}
        onClose={closeEditGroupModal}
        editingGroup={editingGroup}
        editingGroupValue={editingGroupValue}
        setEditingGroupValue={setEditingGroupValue}
        editingGroupError={editingGroupError}
        applyEditGroup={applyEditGroup}
      />

      <ChangeFieldGroupModal
        isOpen={changingFieldGroup !== null}
        onClose={closeChangeGroupModal}
        changingFieldGroup={changingFieldGroup}
        changingFieldGroupValue={changingFieldGroupValue}
        setChangingFieldGroupValue={setChangingFieldGroupValue}
        changingFieldGroupNewName={changingFieldGroupNewName}
        setChangingFieldGroupNewName={setChangingFieldGroupNewName}
        existingGroups={existingGroups}
        fieldCatalog={fieldCatalog}
        applyChangeGroup={applyChangeGroup}
      />

      <MergeGroupsModal
        isOpen={mergingGroups}
        onClose={closeMergeGroupsModal}
        existingGroups={existingGroups}
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
      />

      <AddFieldModal
        isOpen={addingFieldModal}
        onClose={() => setAddingFieldModal(false)}
        newField={newField}
        setNewField={setNewField}
        selectedGroup={selectedGroup}
        setSelectedGroup={setSelectedGroup}
        existingGroups={existingGroups}
        fieldCatalogKeys={fieldCatalog.map((item) => item.field_key)}
        setEditingGroup={(value) => setEditingGroup(value)}
        setEditingGroupValue={setEditingGroupValue}
        setEditingGroupError={setEditingGroupError}
        addNewField={addNewField}
        buildInternalFieldKey={buildInternalFieldKey}
      />
    </>
  );
}
