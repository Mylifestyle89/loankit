import { useCallback } from "react";
import { useMappingDataStore } from "../stores/use-mapping-data-store";
import { useGroupUiStore } from "../stores/use-group-ui-store";
import { useUiStore } from "../stores/use-ui-store";
import { useUndoStore } from "../stores/use-undo-store";
import { useFieldUsageStore } from "../stores/use-field-usage-store";
import { useModalStore } from "@/lib/report/use-modal-store";

/**
 * Bulk move, bulk delete (field + group) and undo actions.
 * Extracted from useFieldGroupActions to keep that file under 300 lines.
 */
export function useFieldGroupBulkActions({ t }: { t: (key: string) => string }) {
  const openModal = useModalStore((s) => s.openModal);

  const pushUndoSnapshot = useCallback(() => {
    const mds = useMappingDataStore.getState();
    const guis = useGroupUiStore.getState();
    const { filters, context } = useUiStore.getState();
    useUndoStore.getState().pushUndo({
      fieldCatalog: [...mds.fieldCatalog],
      values: { ...mds.values },
      manualValues: { ...mds.manualValues },
      formulas: { ...mds.formulas },
      customGroups: [...guis.customGroups],
      selectedGroup: filters.selectedGroup,
      newField: { ...context.newField },
      mappingText: mds.mappingText,
      collapsedParentGroups: [...guis.collapsedParentGroups],
    });
  }, []);

  const undoLastAction = useCallback(() => {
    const snapshot = useUndoStore.getState().popUndo();
    if (!snapshot) return;
    const { setFieldCatalog, setValues, setManualValues, setFormulas, setMappingText } =
      useMappingDataStore.getState();
    const { setCustomGroups, setCollapsedParentGroups } = useGroupUiStore.getState();
    const { setFilters, setContext, setStatus } = useUiStore.getState();
    setFieldCatalog(snapshot.fieldCatalog);
    setValues(snapshot.values);
    setManualValues(snapshot.manualValues);
    setFormulas(snapshot.formulas);
    setCustomGroups(snapshot.customGroups);
    setFilters({ selectedGroup: snapshot.selectedGroup });
    setContext({ newField: snapshot.newField });
    setMappingText(snapshot.mappingText);
    setCollapsedParentGroups(snapshot.collapsedParentGroups);
    setStatus({ message: t("mapping.msg.undoDone"), error: "" });
  }, [t]);

  const deleteField = useCallback(
    (fieldKey: string) => {
      const usage = useFieldUsageStore.getState().usageMap[fieldKey];
      const usageWarning = usage?.length
        ? `\n\n⚠️ Field này đang được dùng trong ${usage.length} mẫu: ${usage.join(", ")}`
        : "";
      if (typeof window !== "undefined" && !window.confirm(t("mapping.deleteFieldConfirm") + usageWarning))
        return;
      pushUndoSnapshot();
      const { setFieldCatalog, setValues, setManualValues, setFormulas, setMappingText } =
        useMappingDataStore.getState();
      const { setStatus } = useUiStore.getState();
      setFieldCatalog((prev) => prev.filter((f) => f.field_key !== fieldKey));
      setValues((prev) => { const n = { ...prev }; delete n[fieldKey]; return n; });
      setManualValues((prev) => { const n = { ...prev }; delete n[fieldKey]; return n; });
      setFormulas((prev) => { const n = { ...prev }; delete n[fieldKey]; return n; });
      setMappingText((prevTxt) => {
        try {
          const obj = JSON.parse(prevTxt);
          if (obj && Array.isArray(obj.mappings)) {
            obj.mappings = obj.mappings.filter(
              (m: { template_field?: unknown }) => m.template_field !== fieldKey,
            );
            return JSON.stringify(obj, null, 2);
          }
        } catch (e) {
          setStatus({
            error: e instanceof Error ? e.message : "Failed to update mapping on field delete.",
          });
        }
        return prevTxt;
      });
      setStatus({ message: t("mapping.msg.fieldDeleted"), error: "" });
    },
    [pushUndoSnapshot, t],
  );

  const deleteGroup = useCallback(
    (groupPath: string) => {
      const {
        fieldCatalog: cat,
        setFieldCatalog,
        setValues,
        setManualValues,
        setFormulas,
        setMappingText,
      } = useMappingDataStore.getState();
      const { customGroups: cGroups, setCustomGroups, setCollapsedParentGroups } =
        useGroupUiStore.getState();

      const normalized = groupPath.trim();
      if (!normalized) return;

      const groupsToDelete = new Set(
        [...cGroups, ...cat.map((f) => f.group)]
          .map((g) => g.trim())
          .filter((g) => g === normalized || g.startsWith(`${normalized}/`)),
      );
      if (groupsToDelete.size === 0) return;

      const fieldsToDelete = cat.filter((f) => groupsToDelete.has(f.group.trim()));

      openModal("deleteGroupConfirm", {
        groupPath: normalized,
        fieldCount: fieldsToDelete.length,
        onConfirm: () => {
          pushUndoSnapshot();
          const { filters, context, setFilters, setContext, setStatus } = useUiStore.getState();
          const fieldKeysToDelete = new Set(fieldsToDelete.map((f) => f.field_key));
          const firstSegmentsToDelete = new Set(
            Array.from(groupsToDelete)
              .map((g) => g.split("/")[0])
              .filter(Boolean),
          );

          setFieldCatalog((prev) =>
            prev.filter((f) => !groupsToDelete.has(f.group.trim())),
          );
          setCustomGroups((prev) =>
            prev.filter((g) => {
              const trimmed = g.trim();
              return !(trimmed === normalized || trimmed.startsWith(`${normalized}/`));
            }),
          );
          setValues((prev) => {
            const n: Record<string, unknown> = { ...prev };
            for (const key of fieldKeysToDelete) delete n[key];
            for (const group of groupsToDelete) delete n[group];
            return n;
          });
          setManualValues((prev) => {
            const n = { ...prev };
            for (const key of fieldKeysToDelete) delete n[key];
            return n;
          });
          setFormulas((prev) => {
            const n = { ...prev };
            for (const key of fieldKeysToDelete) delete n[key];
            return n;
          });
          setCollapsedParentGroups((prev) =>
            prev.filter((parent) => !firstSegmentsToDelete.has(parent)),
          );
          if (
            filters.selectedGroup.trim() === normalized ||
            filters.selectedGroup.trim().startsWith(`${normalized}/`)
          ) {
            setFilters({ selectedGroup: "" });
          }
          if (
            context.newField.group.trim() === normalized ||
            context.newField.group.trim().startsWith(`${normalized}/`)
          ) {
            setContext({ newField: { ...context.newField, group: "Nhóm mới" } });
          }
          setMappingText((prevTxt) => {
            try {
              const obj = JSON.parse(prevTxt);
              if (obj && Array.isArray(obj.mappings)) {
                obj.mappings = obj.mappings.filter(
                  (m: { template_field?: unknown }) =>
                    !fieldKeysToDelete.has(String(m.template_field ?? "")),
                );
                return JSON.stringify(obj, null, 2);
              }
            } catch (e) {
              setStatus({
                error:
                  e instanceof Error ? e.message : "Failed to update mapping on group delete.",
              });
            }
            return prevTxt;
          });
          setStatus({
            message: t("mapping.msg.groupDeleted").replace("{name}", normalized),
            error: "",
          });
        },
      });
    },
    [openModal, pushUndoSnapshot, t],
  );

  return { pushUndoSnapshot, undoLastAction, deleteField, deleteGroup };
}
