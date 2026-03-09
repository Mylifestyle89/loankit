import { useMemo } from "react";
import type { Dispatch, SetStateAction } from "react";
import { useFieldTemplateStore } from "../stores/use-field-template-store";
import { useGroupUiStore } from "../stores/use-group-ui-store";
import { useUiStore } from "../stores/use-ui-store";
import { useMappingDataStore } from "../stores/use-mapping-data-store";

function dispatchify<T>(getVal: () => T, setter: (v: T) => void): Dispatch<SetStateAction<T>> {
    return (action) => {
        const next = typeof action === "function" ? (action as (prev: T) => T)(getVal()) : action;
        setter(next);
    };
}

export function useMappingDispatches() {
    return useMemo(() => ({
        setEditPickerTemplateId: dispatchify(
            () => useFieldTemplateStore.getState().editPickerTemplateId,
            useFieldTemplateStore.getState().setEditPickerTemplateId,
        ),
        setEditingGroupValue: dispatchify(
            () => useGroupUiStore.getState().editingGroupValue,
            useGroupUiStore.getState().setEditingGroupValue,
        ),
        setChangingFieldGroupValue: dispatchify(
            () => useGroupUiStore.getState().changingFieldGroupValue,
            useGroupUiStore.getState().setChangingFieldGroupValue,
        ),
        setChangingFieldGroupNewName: dispatchify(
            () => useGroupUiStore.getState().changingFieldGroupNewName,
            useGroupUiStore.getState().setChangingFieldGroupNewName,
        ),
        setMergeTargetGroup: dispatchify(
            () => useGroupUiStore.getState().mergeTargetGroup,
            useGroupUiStore.getState().setMergeTargetGroup,
        ),
        setMergeGroupsError: dispatchify(
            () => useGroupUiStore.getState().mergeGroupsError,
            useGroupUiStore.getState().setMergeGroupsError,
        ),
        setMergeOrderMode: dispatchify(
            () => useGroupUiStore.getState().mergeOrderMode,
            useGroupUiStore.getState().setMergeOrderMode,
        ),
        setAddingFieldModal: dispatchify(
            () => useUiStore.getState().modals.addingField,
            (v) => useUiStore.getState().setModals({ addingField: v }),
        ),
        setNewField: dispatchify(
            () => useUiStore.getState().context.newField,
            (v) => useUiStore.getState().setContext({ newField: v }),
        ),
        setSelectedGroup: dispatchify(
            () => useUiStore.getState().filters.selectedGroup,
            (v) => useUiStore.getState().setFilters({ selectedGroup: v }),
        ),
        setEditingGroup: dispatchify(
            () => useGroupUiStore.getState().editingGroup,
            useGroupUiStore.getState().setEditingGroup,
        ),
        setEditingGroupError: dispatchify(
            () => useGroupUiStore.getState().editingGroupError,
            useGroupUiStore.getState().setEditingGroupError,
        ),
        setFunctionListModalOpen: dispatchify(
            () => useUiStore.getState().modals.functionList,
            (v) => useUiStore.getState().setModals({ functionList: v }),
        ),
        setFormulaModalFieldKey: dispatchify(
            () => useUiStore.getState().context.formulaFieldKey,
            (v) => useUiStore.getState().setContext({ formulaFieldKey: v }),
        ),
        setFormulas: dispatchify(
            () => useMappingDataStore.getState().formulas,
            (v) => useMappingDataStore.getState().setFormulas(v),
        ),
        setImportGroupTemplateId: dispatchify(
            () => useUiStore.getState().context.importGroupTemplateId,
            (v) => useUiStore.getState().setContext({ importGroupTemplateId: v }),
        ),
        setImportGroupPath: dispatchify(
            () => useUiStore.getState().context.importGroupPath,
            (v) => useUiStore.getState().setContext({ importGroupPath: v }),
        ),
        setEditingFieldTemplateName: dispatchify(
            () => useFieldTemplateStore.getState().editingFieldTemplateName,
            useFieldTemplateStore.getState().setEditingFieldTemplateName,
        ),
        setShowTechnicalKeys: dispatchify(
            () => useUiStore.getState().filters.showTechnicalKeys,
            (v) => useUiStore.getState().setFilters({ showTechnicalKeys: v }),
        ),
        setSearchTerm: dispatchify(
            () => useUiStore.getState().filters.searchTerm,
            (v) => useUiStore.getState().setFilters({ searchTerm: v }),
        ),
        setShowUnmappedOnly: dispatchify(
            () => useUiStore.getState().filters.showUnmappedOnly,
            (v) => useUiStore.getState().setFilters({ showUnmappedOnly: v }),
        ),
    }), []);
}
