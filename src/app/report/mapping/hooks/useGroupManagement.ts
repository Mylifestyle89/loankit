import { useMemo } from "react";
import type { FieldCatalogItem } from "@/lib/report/config-schema";
import { buildInternalFieldKey } from "../helpers";
import { useMappingDataStore } from "../stores/use-mapping-data-store";
import { useGroupUiStore } from "../stores/use-group-ui-store";
import { useUiStore } from "../stores/use-ui-store";

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
    const num = parseFloat(val.replace(/,/g, ""));
    return isNaN(num) ? val : num;
  }
  return val;
}

/** Re-computes the STT (row number) field for every item after a splice. */
function recomputeStt(list: Record<string, unknown>[], sttKey: string | null): Record<string, unknown>[] {
  if (!sttKey) return list;
  return list.map((item, i) => ({ ...(typeof item === "object" && item !== null ? item : {}), [sttKey]: i + 1 }));
}

export function useGroupManagement({ t, groupedFieldTree, parentGroups }: UseGroupManagementParams) {
  // Reactive subscriptions for useMemo — plain getState() is not enough here
  const fieldCatalog = useMappingDataStore((s) => s.fieldCatalog);
  const customGroups = useGroupUiStore((s) => s.customGroups);
  const mergeSourceGroups = useGroupUiStore((s) => s.mergeSourceGroups);
  const mergeTargetGroup = useGroupUiStore((s) => s.mergeTargetGroup);

  function isSttField(field: FieldCatalogItem): boolean {
    return field.label_vi.trim().toUpperCase() === "STT";
  }

  function getGroupSttFieldKey(groupPath: string, fields: FieldCatalogItem[]): string | null {
    const sttField = fields.find((item) => item.group === groupPath && item.is_repeater && isSttField(item));
    return sttField?.field_key ?? null;
  }

  const existingGroups = useMemo(() => {
    const groups = new Set([...fieldCatalog.map((item) => item.group), ...customGroups]);
    return Array.from(groups).sort((a, b) => a.localeCompare(b, "vi"));
  }, [fieldCatalog, customGroups]);

  const mergePreview = useMemo(() => {
    const selected = new Set(mergeSourceGroups);
    const fieldCount = fieldCatalog.reduce((count, item) => (selected.has(item.group) ? count + 1 : count), 0);
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
        gu.setCustomGroups((prev) => (prev.includes(targetGroup) ? prev : [...prev, targetGroup]));
      }
    }

    setFieldCatalog((prev) =>
      prev.map((item) =>
        item.field_key === changingFieldGroup ? { ...item, group: targetGroup, is_repeater: false } : item,
      ),
    );
    useUiStore.getState().setStatus({ message: t("mapping.msg.groupChanged") });
    closeChangeGroupModal();
  }

  // ── Repeater group ───────────────────────────────────────────────────────────

  function toggleRepeaterGroup(groupPath: string) {
    const { setFieldCatalog } = useMappingDataStore.getState();
    const isRepeater = groupedFieldTree
      .flatMap((p) => p.children)
      .find((c) => c.fullPath === groupPath)
      ?.fields.some((f) => f.is_repeater);

    const turningOn = !isRepeater;
    setFieldCatalog((prev) => {
      const toggled = prev.map((f) => (f.group === groupPath ? { ...f, is_repeater: turningOn } : f));
      if (!turningOn) return toggled;
      if (toggled.some((item) => item.group === groupPath && item.is_repeater && isSttField(item))) return toggled;

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

  function onRepeaterItemChange(groupPath: string, index: number, field: FieldCatalogItem, rawVal: string) {
    const { setValues } = useMappingDataStore.getState();
    setValues((prev) => {
      const currentList = Array.isArray(prev[groupPath])
        ? [...(prev[groupPath] as Record<string, unknown>[])]
        : [];
      const currentItem = (currentList[index] as Record<string, unknown>) ?? {};
      currentList[index] = { ...currentItem, [field.field_key]: parseNumericValue(rawVal, field.type) };
      return { ...prev, [groupPath]: currentList };
    });
  }

  // ── Edit-group modal ─────────────────────────────────────────────────────────

  function openEditGroupModal(group: string) {
    const gu = useGroupUiStore.getState();
    gu.setEditingGroup(group);
    gu.setEditingGroupValue(group);
    gu.setEditingGroupError("");
  }

  function openCreateSubgroupModal(parentGroup: string) {
    const gu = useGroupUiStore.getState();
    gu.setEditingGroup("");
    gu.setEditingGroupValue(`${parentGroup}/`);
    gu.setEditingGroupError("");
  }

  function closeEditGroupModal() {
    const gu = useGroupUiStore.getState();
    gu.setEditingGroup(null);
    gu.setEditingGroupValue("");
    gu.setEditingGroupError("");
  }

  function applyEditGroup() {
    const gu = useGroupUiStore.getState();
    const { setFieldCatalog } = useMappingDataStore.getState();
    const ui = useUiStore.getState();
    const { editingGroup, editingGroupValue } = gu;
    const target = editingGroup ?? "";
    const next = editingGroupValue.trim();
    if (!next) {
      gu.setEditingGroupError(t("mapping.editGroup.errEmpty"));
      return;
    }

    if (!target) {
      gu.setCustomGroups((prev) => (prev.includes(next) ? prev : [...prev, next]));
      ui.setFilters({ selectedGroup: next });
      ui.setContext((ctx) => ({ newField: { ...ctx.newField, group: next } }));
      closeEditGroupModal();
      return;
    }

    setFieldCatalog((prev) => prev.map((item) => (item.group === target ? { ...item, group: next } : item)));
    gu.setCustomGroups((prev) => prev.map((g) => (g === target ? next : g)));
    if (ui.filters.selectedGroup === target) ui.setFilters({ selectedGroup: next });
    if (ui.context.newField.group === target) ui.setContext((ctx) => ({ newField: { ...ctx.newField, group: next } }));
    closeEditGroupModal();
  }

  // ── Collapse / expand ────────────────────────────────────────────────────────

  function toggleParentCollapse(parent: string) {
    useGroupUiStore.getState().setCollapsedParentGroups((prev) =>
      prev.includes(parent) ? prev.filter((item) => item !== parent) : [...prev, parent],
    );
  }

  function collapseAllGroups() {
    useGroupUiStore.getState().setCollapsedParentGroups(parentGroups);
  }

  function expandAllGroups() {
    useGroupUiStore.getState().setCollapsedParentGroups([]);
  }

  // ── Merge-groups modal ───────────────────────────────────────────────────────

  function openMergeGroupsModal() {
    const gu = useGroupUiStore.getState();
    gu.setMergingGroups(true);
    gu.setMergeSourceGroups([]);
    gu.setMergeTargetGroup("");
    gu.setMergeOrderMode("keep");
    gu.setMergeGroupsError("");
  }

  function closeMergeGroupsModal() {
    const gu = useGroupUiStore.getState();
    gu.setMergingGroups(false);
    gu.setMergeSourceGroups([]);
    gu.setMergeTargetGroup("");
    gu.setMergeOrderMode("keep");
    gu.setMergeGroupsError("");
  }

  function toggleMergeSourceGroup(group: string) {
    useGroupUiStore.getState().setMergeSourceGroups((prev) =>
      prev.includes(group) ? prev.filter((g) => g !== group) : [...prev, group],
    );
  }

  function applyMergeGroups() {
    const gu = useGroupUiStore.getState();
    const { setFieldCatalog } = useMappingDataStore.getState();
    const ui = useUiStore.getState();
    const { mergeSourceGroups: sources, mergeTargetGroup: rawTarget, mergeOrderMode } = gu;
    const target = rawTarget.trim();

    if (sources.length < 2) { gu.setMergeGroupsError(t("mapping.merge.errMinGroups")); return; }
    if (!target) { gu.setMergeGroupsError(t("mapping.merge.errTarget")); return; }

    setFieldCatalog((prev) => {
      const renamed = prev.map((item) => (sources.includes(item.group) ? { ...item, group: target } : item));
      if (mergeOrderMode === "keep") return renamed;
      const sorted = renamed
        .filter((item) => item.group === target)
        .sort((a, b) => a.label_vi.localeCompare(b.label_vi, "vi"));
      let cursor = 0;
      return renamed.map((item) => (item.group !== target ? item : sorted[cursor++]));
    });

    gu.setCustomGroups((prev) => {
      const filtered = prev.filter((g) => !sources.includes(g));
      return filtered.includes(target) ? filtered : [...filtered, target];
    });

    // Atomic UI update: both selectedGroup and newField in one pass
    ui.setFilters({ selectedGroup: sources.includes(ui.filters.selectedGroup) ? target : ui.filters.selectedGroup });
    if (sources.includes(ui.context.newField.group)) {
      ui.setContext((ctx) => ({ newField: { ...ctx.newField, group: target } }));
    }
    ui.setStatus({ message: t("mapping.msg.groupsMerged").replace("{count}", String(sources.length)) });
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