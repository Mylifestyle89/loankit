import { useCallback } from "react";
import { useMappingDataStore } from "../stores/use-mapping-data-store";
import { useGroupUiStore } from "../stores/use-group-ui-store";
import { useUiStore } from "../stores/use-ui-store";
import { useModalStore } from "@/lib/report/use-modal-store";
import type { FieldCatalogItem } from "@/lib/report/config-schema";
import { normalizeInputByType, buildInternalFieldKey, toInternalType } from "../helpers";
import { useFieldGroupBulkActions } from "./use-field-group-bulk-actions";

export interface UseFieldGroupActionsProps {
  t: (key: string) => string;
}

/**
 * Main field & group actions hook — composes single-field mutations + bulk sub-hook.
 * Re-exports all functions under the original API surface for backward compat.
 */
export function useFieldGroupActions({ t }: UseFieldGroupActionsProps) {
  const bulk = useFieldGroupBulkActions({ t });

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

  return {
    pushUndoSnapshot: bulk.pushUndoSnapshot,
    undoLastAction: bulk.undoLastAction,
    openChangeGroupModal,
    onManualChange,
    moveField,
    onFieldLabelChange,
    onFieldTypeChange,
    addNewField,
    prepareAddFieldForGroup,
    deleteField: bulk.deleteField,
    deleteGroup: bulk.deleteGroup,
  };
}
