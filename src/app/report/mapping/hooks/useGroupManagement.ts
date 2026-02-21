import { useMemo } from "react";
import type { Dispatch, SetStateAction } from "react";
import type { FieldCatalogItem } from "@/lib/report/config-schema";

type GroupTreeNode = {
  parent: string;
  children: Array<{ fullPath: string; subgroup: string; fields: FieldCatalogItem[] }>;
};

type UseGroupManagementParams = {
  t: (key: string) => string;
  fieldCatalog: FieldCatalogItem[];
  groupedFieldTree: GroupTreeNode[];
  parentGroups: string[];
  selectedGroup: string;
  newField: { label_vi: string; group: string; type: "string" | "number" | "percent" | "date" | "table" };
  changingFieldGroup: string | null;
  changingFieldGroupValue: string;
  changingFieldGroupNewName: string;
  editingGroup: string | null;
  editingGroupValue: string;
  mergeSourceGroups: string[];
  mergeTargetGroup: string;
  mergeOrderMode: "keep" | "alpha";
  setValues: Dispatch<SetStateAction<Record<string, unknown>>>;
  setFieldCatalog: Dispatch<SetStateAction<FieldCatalogItem[]>>;
  setCustomGroups: Dispatch<SetStateAction<string[]>>;
  setMessage: Dispatch<SetStateAction<string>>;
  setSelectedGroup: Dispatch<SetStateAction<string>>;
  setNewField: Dispatch<
    SetStateAction<{ label_vi: string; group: string; type: "string" | "number" | "percent" | "date" | "table" }>
  >;
  setChangingFieldGroup: Dispatch<SetStateAction<string | null>>;
  setChangingFieldGroupValue: Dispatch<SetStateAction<string>>;
  setChangingFieldGroupNewName: Dispatch<SetStateAction<string>>;
  setEditingGroup: Dispatch<SetStateAction<string | null>>;
  setEditingGroupValue: Dispatch<SetStateAction<string>>;
  setEditingGroupError: Dispatch<SetStateAction<string>>;
  setMergingGroups: Dispatch<SetStateAction<boolean>>;
  setMergeSourceGroups: Dispatch<SetStateAction<string[]>>;
  setMergeTargetGroup: Dispatch<SetStateAction<string>>;
  setMergeOrderMode: Dispatch<SetStateAction<"keep" | "alpha">>;
  setMergeGroupsError: Dispatch<SetStateAction<string>>;
  setCollapsedParentGroups: Dispatch<SetStateAction<string[]>>;
  customGroups: string[];
};

export function useGroupManagement({
  t,
  fieldCatalog,
  groupedFieldTree,
  parentGroups,
  selectedGroup,
  newField,
  changingFieldGroup,
  changingFieldGroupValue,
  changingFieldGroupNewName,
  editingGroup,
  editingGroupValue,
  mergeSourceGroups,
  mergeTargetGroup,
  mergeOrderMode,
  setValues,
  setFieldCatalog,
  setCustomGroups,
  setMessage,
  setSelectedGroup,
  setNewField,
  setChangingFieldGroup,
  setChangingFieldGroupValue,
  setChangingFieldGroupNewName,
  setEditingGroup,
  setEditingGroupValue,
  setEditingGroupError,
  setMergingGroups,
  setMergeSourceGroups,
  setMergeTargetGroup,
  setMergeOrderMode,
  setMergeGroupsError,
  setCollapsedParentGroups,
  customGroups,
}: UseGroupManagementParams) {
  const existingGroups = useMemo(() => {
    const groups = new Set([...fieldCatalog.map((item) => item.group), ...customGroups]);
    return Array.from(groups).sort((a, b) => a.localeCompare(b, "vi"));
  }, [fieldCatalog, customGroups]);

  const mergePreview = useMemo(() => {
    const selected = new Set(mergeSourceGroups);
    const fieldCount = fieldCatalog.reduce((count, item) => (selected.has(item.group) ? count + 1 : count), 0);
    return {
      groupCount: mergeSourceGroups.length,
      fieldCount,
      targetGroup: mergeTargetGroup.trim(),
    };
  }, [fieldCatalog, mergeSourceGroups, mergeTargetGroup]);

  function closeChangeGroupModal() {
    setChangingFieldGroup(null);
    setChangingFieldGroupValue("");
    setChangingFieldGroupNewName("");
  }

  function applyChangeGroup() {
    if (!changingFieldGroup) return;
    const field = fieldCatalog.find((f) => f.field_key === changingFieldGroup);
    if (!field) return;

    let targetGroup = changingFieldGroupValue.trim();
    if (targetGroup === "__create_new__") {
      targetGroup = changingFieldGroupNewName.trim();
      if (!targetGroup) return;
      if (!existingGroups.includes(targetGroup)) {
        setCustomGroups((prev) => (prev.includes(targetGroup) ? prev : [...prev, targetGroup]));
      }
    }

    setFieldCatalog((prev) =>
      prev.map((item) => (item.field_key === changingFieldGroup ? { ...item, group: targetGroup, is_repeater: false } : item)),
    );
    setMessage(t("mapping.msg.groupChanged"));
    closeChangeGroupModal();
  }

  function toggleRepeaterGroup(groupPath: string) {
    const isRepeater = groupedFieldTree
      .flatMap((p) => p.children)
      .find((c) => c.fullPath === groupPath)
      ?.fields.some((f) => f.is_repeater);

    setFieldCatalog((prev) => prev.map((f) => (f.group === groupPath ? { ...f, is_repeater: !isRepeater } : f)));
  }

  function addRepeaterItem(groupPath: string) {
    setValues((prev) => {
      const currentList = Array.isArray(prev[groupPath]) ? prev[groupPath] : [];
      return { ...prev, [groupPath]: [...currentList, {}] };
    });
  }

  function removeRepeaterItem(groupPath: string, index: number) {
    setValues((prev) => {
      const currentList = (Array.isArray(prev[groupPath]) ? prev[groupPath] : []) as any[];
      const newList = [...currentList];
      newList.splice(index, 1);
      return { ...prev, [groupPath]: newList };
    });
  }

  function onRepeaterItemChange(groupPath: string, index: number, field: FieldCatalogItem, rawVal: string) {
    setValues((prev) => {
      const currentList = (Array.isArray(prev[groupPath]) ? prev[groupPath] : []) as any[];
      const newList = [...currentList];
      if (!newList[index]) newList[index] = {};
      let parsedVal: unknown = rawVal;
      if (field.type === "number" || field.type === "percent") {
        const num = parseFloat(rawVal.replace(/,/g, ""));
        parsedVal = isNaN(num) ? rawVal : num;
      }
      newList[index] = { ...newList[index], [field.field_key]: parsedVal };
      return { ...prev, [groupPath]: newList };
    });
  }

  function openEditGroupModal(group: string) {
    setEditingGroup(group);
    setEditingGroupValue(group);
    setEditingGroupError("");
  }

  function openCreateSubgroupModal(parentGroup: string) {
    setEditingGroup("");
    setEditingGroupValue(`${parentGroup}/`);
    setEditingGroupError("");
  }

  function closeEditGroupModal() {
    setEditingGroup(null);
    setEditingGroupValue("");
    setEditingGroupError("");
  }

  function toggleParentCollapse(parent: string) {
    setCollapsedParentGroups((prev) => (prev.includes(parent) ? prev.filter((item) => item !== parent) : [...prev, parent]));
  }

  function collapseAllGroups() {
    setCollapsedParentGroups(parentGroups);
  }

  function expandAllGroups() {
    setCollapsedParentGroups([]);
  }

  function applyEditGroup() {
    const target = editingGroup ?? "";
    const next = editingGroupValue.trim();
    if (!next) {
      setEditingGroupError(t("mapping.editGroup.errEmpty"));
      return;
    }

    if (!target) {
      setCustomGroups((prev) => (prev.includes(next) ? prev : [...prev, next]));
      setSelectedGroup(next);
      setNewField((prev) => ({ ...prev, group: next }));
      closeEditGroupModal();
      return;
    }

    setFieldCatalog((prev) => prev.map((item) => (item.group === target ? { ...item, group: next } : item)));
    setCustomGroups((prev) => prev.map((g) => (g === target ? next : g)));
    if (selectedGroup === target) setSelectedGroup(next);
    if (newField.group === target) setNewField((prev) => ({ ...prev, group: next }));
    closeEditGroupModal();
  }

  function openMergeGroupsModal() {
    setMergingGroups(true);
    setMergeSourceGroups([]);
    setMergeTargetGroup("");
    setMergeOrderMode("keep");
    setMergeGroupsError("");
  }

  function closeMergeGroupsModal() {
    setMergingGroups(false);
    setMergeSourceGroups([]);
    setMergeTargetGroup("");
    setMergeOrderMode("keep");
    setMergeGroupsError("");
  }

  function toggleMergeSourceGroup(group: string) {
    setMergeSourceGroups((prev) => (prev.includes(group) ? prev.filter((g) => g !== group) : [...prev, group]));
  }

  function applyMergeGroups() {
    const target = mergeTargetGroup.trim();
    if (mergeSourceGroups.length < 2) {
      setMergeGroupsError(t("mapping.merge.errMinGroups"));
      return;
    }
    if (!target) {
      setMergeGroupsError(t("mapping.merge.errTarget"));
      return;
    }

    setFieldCatalog((prev) => {
      const renamed = prev.map((item) => (mergeSourceGroups.includes(item.group) ? { ...item, group: target } : item));
      if (mergeOrderMode === "keep") return renamed;
      const sortedTargetItems = renamed
        .filter((item) => item.group === target)
        .sort((a, b) => a.label_vi.localeCompare(b.label_vi, "vi"));
      let cursor = 0;
      return renamed.map((item) => {
        if (item.group !== target) return item;
        const nextItem = sortedTargetItems[cursor];
        cursor += 1;
        return nextItem;
      });
    });
    setCustomGroups((prev) => {
      const next = prev.filter((g) => !mergeSourceGroups.includes(g));
      return next.includes(target) ? next : [...next, target];
    });
    if (mergeSourceGroups.includes(selectedGroup)) setSelectedGroup(target);
    if (mergeSourceGroups.includes(newField.group)) setNewField((prev) => ({ ...prev, group: target }));
    setMessage(t("mapping.msg.groupsMerged").replace("{count}", String(mergeSourceGroups.length)));
    closeMergeGroupsModal();
  }

  return {
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
  };
}
