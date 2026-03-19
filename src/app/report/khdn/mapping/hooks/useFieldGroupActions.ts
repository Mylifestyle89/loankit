import { useCallback } from "react";
import { useMappingDataStore } from "../stores/use-mapping-data-store";
import { useGroupUiStore } from "../stores/use-group-ui-store";
import { useUiStore } from "../stores/use-ui-store";
import { useUndoStore } from "../stores/use-undo-store";
import { useFieldUsageStore } from "../stores/use-field-usage-store";
import { useModalStore } from "@/lib/report/use-modal-store";
import type { FieldCatalogItem } from "@/lib/report/config-schema";
import { normalizeInputByType, buildInternalFieldKey, toInternalType } from "../helpers";

export interface UseFieldGroupActionsProps {
    t: (key: string) => string;
}

export function useFieldGroupActions({ t }: UseFieldGroupActionsProps) {
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

    const deleteField = useCallback(
        (fieldKey: string) => {
            // Reverse sync warning: check if field is used in templates
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
                        Array.from(groupsToDelete).map((g) => g.split("/")[0]).filter(Boolean),
                    );

                    setFieldCatalog((prev) => prev.filter((f) => !groupsToDelete.has(f.group.trim())));
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
                                error: e instanceof Error ? e.message : "Failed to update mapping on group delete.",
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

    return {
        pushUndoSnapshot,
        undoLastAction,
        openChangeGroupModal,
        onManualChange,
        moveField,
        onFieldLabelChange,
        onFieldTypeChange,
        addNewField,
        prepareAddFieldForGroup,
        deleteField,
        deleteGroup,
    };
}
