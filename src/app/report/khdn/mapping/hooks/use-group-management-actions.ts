import type { FieldCatalogItem } from "@/lib/report/config-schema";
import { useMappingDataStore } from "../stores/use-mapping-data-store";
import { useGroupUiStore } from "../stores/use-group-ui-store";
import { useUiStore } from "../stores/use-ui-store";

/**
 * Merge, split and reorder group actions for the Mapping page.
 * Extracted from useGroupManagement to keep that file under 300 lines.
 */
export function useGroupManagementActions({
  t,
  parentGroups,
}: {
  t: (key: string) => string;
  parentGroups: string[];
}) {
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

  function applyEditGroup(existingGroups: string[]) {
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

    setFieldCatalog((prev) =>
      prev.map((item) => (item.group === target ? { ...item, group: next } : item)),
    );
    gu.setCustomGroups((prev) => prev.map((g) => (g === target ? next : g)));
    if (ui.filters.selectedGroup === target) ui.setFilters({ selectedGroup: next });
    if (ui.context.newField.group === target)
      ui.setContext((ctx) => ({ newField: { ...ctx.newField, group: next } }));
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

    if (sources.length < 2) {
      gu.setMergeGroupsError(t("mapping.merge.errMinGroups"));
      return;
    }
    if (!target) {
      gu.setMergeGroupsError(t("mapping.merge.errTarget"));
      return;
    }

    setFieldCatalog((prev) => {
      const renamed = prev.map((item) =>
        sources.includes(item.group) ? { ...item, group: target } : item,
      );
      if (mergeOrderMode === "keep") return renamed;
      const sorted = renamed
        .filter((item) => item.group === target)
        .sort((a: FieldCatalogItem, b: FieldCatalogItem) =>
          a.label_vi.localeCompare(b.label_vi, "vi"),
        );
      let cursor = 0;
      return renamed.map((item) => (item.group !== target ? item : sorted[cursor++]));
    });

    gu.setCustomGroups((prev) => {
      const filtered = prev.filter((g) => !sources.includes(g));
      return filtered.includes(target) ? filtered : [...filtered, target];
    });

    ui.setFilters({
      selectedGroup: sources.includes(ui.filters.selectedGroup)
        ? target
        : ui.filters.selectedGroup,
    });
    if (sources.includes(ui.context.newField.group)) {
      ui.setContext((ctx) => ({ newField: { ...ctx.newField, group: target } }));
    }
    ui.setStatus({
      message: t("mapping.msg.groupsMerged").replace("{count}", String(sources.length)),
    });
    closeMergeGroupsModal();
  }

  return {
    openEditGroupModal,
    openCreateSubgroupModal,
    closeEditGroupModal,
    applyEditGroup,
    toggleParentCollapse,
    collapseAllGroups,
    expandAllGroups,
    openMergeGroupsModal,
    closeMergeGroupsModal,
    toggleMergeSourceGroup,
    applyMergeGroups,
  };
}
