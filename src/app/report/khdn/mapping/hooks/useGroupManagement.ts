import { useMemo } from "react";
import type { FieldCatalogItem } from "@/lib/report/config-schema";
import { toNumber } from "@/lib/report/field-calc";
import { buildInternalFieldKey } from "../helpers";
import { useMappingDataStore } from "../stores/use-mapping-data-store";
import { useGroupUiStore } from "../stores/use-group-ui-store";
import { useGroupManagementActions } from "./use-group-management-actions";

type GroupTreeNode = {
  parent: string;
  children: Array<{ fullPath: string; subgroup: string; fields: FieldCatalogItem[] }>;
};

type UseGroupManagementParams = {
  t: (key: string) => string;
  groupedFieldTree: GroupTreeNode[];
  parentGroups: string[];
};

/** Safe numeric parse: returns a number when parseable, otherwise the original string. */
function parseNumericValue(val: string, type: FieldCatalogItem["type"]): unknown {
  if (type === "number" || type === "percent") {
    const num = toNumber(val);
    return num !== null ? num : val;
  }
  return val;
}

/** Re-computes the STT (row number) field for every item after a splice. */
function recomputeStt(
  list: Record<string, unknown>[],
  sttKey: string | null,
): Record<string, unknown>[] {
  if (!sttKey) return list;
  return list.map((item, i) => ({
    ...(typeof item === "object" && item !== null ? item : {}),
    [sttKey]: i + 1,
  }));
}

/**
 * Main group-management hook — composes repeater helpers + action sub-hook.
 * Re-exports all functions under the original API surface for backward compat.
 */
export function useGroupManagement({ t, groupedFieldTree, parentGroups }: UseGroupManagementParams) {
  const fieldCatalog = useMappingDataStore((s) => s.fieldCatalog);
  const customGroups = useGroupUiStore((s) => s.customGroups);
  const mergeSourceGroups = useGroupUiStore((s) => s.mergeSourceGroups);
  const mergeTargetGroup = useGroupUiStore((s) => s.mergeTargetGroup);

  function isSttField(field: FieldCatalogItem): boolean {
    return field.label_vi.trim().toUpperCase() === "STT";
  }

  function getGroupSttFieldKey(groupPath: string, fields: FieldCatalogItem[]): string | null {
    const sttField = fields.find(
      (item) => item.group === groupPath && item.is_repeater && isSttField(item),
    );
    return sttField?.field_key ?? null;
  }

  const existingGroups = useMemo(() => {
    const groups = new Set([...fieldCatalog.map((item) => item.group), ...customGroups]);
    return Array.from(groups).sort((a, b) => a.localeCompare(b, "vi"));
  }, [fieldCatalog, customGroups]);

  const mergePreview = useMemo(() => {
    const selected = new Set(mergeSourceGroups);
    const fieldCount = fieldCatalog.reduce(
      (count, item) => (selected.has(item.group) ? count + 1 : count),
      0,
    );
    return { groupCount: mergeSourceGroups.length, fieldCount, targetGroup: mergeTargetGroup.trim() };
  }, [fieldCatalog, mergeSourceGroups, mergeTargetGroup]);

  // ── Change-group modal ───────────────────────────────────────────────────────

  function closeChangeGroupModal() {
    const gu = useGroupUiStore.getState();
    gu.setChangingFieldGroup(null);
    gu.setChangingFieldGroupValue("");
    gu.setChangingFieldGroupNewName("");
  }

  function applyChangeGroup() {
    const gu = useGroupUiStore.getState();
    const { fieldCatalog: catalog, setFieldCatalog } = useMappingDataStore.getState();
    const { changingFieldGroup, changingFieldGroupValue, changingFieldGroupNewName } = gu;
    if (!changingFieldGroup) return;
    if (!catalog.find((f) => f.field_key === changingFieldGroup)) return;

    let targetGroup = changingFieldGroupValue.trim();
    if (targetGroup === "__create_new__") {
      targetGroup = changingFieldGroupNewName.trim();
      if (!targetGroup) return;
      if (!existingGroups.includes(targetGroup)) {
        gu.setCustomGroups((prev) =>
          prev.includes(targetGroup) ? prev : [...prev, targetGroup],
        );
      }
    }

    setFieldCatalog((prev) =>
      prev.map((item) =>
        item.field_key === changingFieldGroup
          ? { ...item, group: targetGroup, is_repeater: false }
          : item,
      ),
    );
    useGroupUiStore.getState(); // trigger re-render via store
    import("../stores/use-ui-store").then(({ useUiStore }) => {
      useUiStore.getState().setStatus({ message: t("mapping.msg.groupChanged") });
    });
    closeChangeGroupModal();
  }

  // ── Repeater group ───────────────────────────────────────────────────────────

  function toggleRepeaterGroup(groupPath: string) {
    const { setFieldCatalog, setValues } = useMappingDataStore.getState();
    const isRepeater = groupedFieldTree
      .flatMap((p) => p.children)
      .find((c) => c.fullPath === groupPath)
      ?.fields.some((f) => f.is_repeater);

    const turningOn = !isRepeater;
    setFieldCatalog((prev) => {
      const toggled = prev.map((f) =>
        f.group === groupPath ? { ...f, is_repeater: turningOn } : f,
      );
      if (!turningOn) return toggled;
      if (toggled.some((item) => item.group === groupPath && item.is_repeater && isSttField(item)))
        return toggled;

      const sttKey = buildInternalFieldKey({
        group: groupPath,
        labelVi: "STT",
        existingKeys: toggled.map((item) => item.field_key),
      });
      const sttField: FieldCatalogItem = {
        field_key: sttKey,
        label_vi: "STT",
        group: groupPath,
        type: "number",
        required: false,
        examples: [],
        is_repeater: true,
      };
      const insertIndex = toggled.findIndex((item) => item.group === groupPath);
      return insertIndex === -1
        ? [...toggled, sttField]
        : [...toggled.slice(0, insertIndex), sttField, ...toggled.slice(insertIndex)];
    });

    if (turningOn) {
      setValues((prev) => {
        if (Array.isArray(prev[groupPath])) return prev;
        return { ...prev, [groupPath]: [] };
      });
    }
  }

  function addRepeaterItem(groupPath: string) {
    const { fieldCatalog: catalog, setValues } = useMappingDataStore.getState();
    const sttFieldKey = getGroupSttFieldKey(groupPath, catalog);
    setValues((prev) => {
      const currentList = Array.isArray(prev[groupPath]) ? (prev[groupPath] as unknown[]) : [];
      const newItem = sttFieldKey ? { [sttFieldKey]: currentList.length + 1 } : {};
      return { ...prev, [groupPath]: [...currentList, newItem] };
    });
  }

  function removeRepeaterItem(groupPath: string, index: number) {
    const { fieldCatalog: catalog, setValues } = useMappingDataStore.getState();
    const sttFieldKey = getGroupSttFieldKey(groupPath, catalog);
    setValues((prev) => {
      const currentList = Array.isArray(prev[groupPath])
        ? [...(prev[groupPath] as Record<string, unknown>[])]
        : [];
      currentList.splice(index, 1);
      return { ...prev, [groupPath]: recomputeStt(currentList, sttFieldKey) };
    });
  }

  function onRepeaterItemChange(
    groupPath: string,
    index: number,
    field: FieldCatalogItem,
    rawVal: string,
  ) {
    const { setValues } = useMappingDataStore.getState();
    setValues((prev) => {
      const currentList = Array.isArray(prev[groupPath])
        ? [...(prev[groupPath] as Record<string, unknown>[])]
        : [];
      const currentItem = (currentList[index] as Record<string, unknown>) ?? {};
      currentList[index] = {
        ...currentItem,
        [field.field_key]: parseNumericValue(rawVal, field.type),
      };
      return { ...prev, [groupPath]: currentList };
    });
  }

  const actions = useGroupManagementActions({ t, parentGroups });

  return {
    existingGroups,
    mergePreview,
    closeChangeGroupModal,
    applyChangeGroup,
    toggleRepeaterGroup,
    addRepeaterItem,
    removeRepeaterItem,
    onRepeaterItemChange,
    openEditGroupModal: actions.openEditGroupModal,
    openCreateSubgroupModal: actions.openCreateSubgroupModal,
    closeEditGroupModal: actions.closeEditGroupModal,
    applyEditGroup: () => actions.applyEditGroup(existingGroups),
    toggleParentCollapse: actions.toggleParentCollapse,
    collapseAllGroups: actions.collapseAllGroups,
    expandAllGroups: actions.expandAllGroups,
    openMergeGroupsModal: actions.openMergeGroupsModal,
    closeMergeGroupsModal: actions.closeMergeGroupsModal,
    toggleMergeSourceGroup: actions.toggleMergeSourceGroup,
    applyMergeGroups: actions.applyMergeGroups,
  };
}
