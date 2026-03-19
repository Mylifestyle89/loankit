import { useCallback, useRef } from "react";
import { useUiStore } from "../stores/use-ui-store";
import { useMappingDataStore } from "../stores/use-mapping-data-store";
import { useFieldTemplateStore } from "../stores/use-field-template-store";
import { useCustomerStore } from "../stores/use-customer-store";
import { useModalStore } from "@/lib/report/use-modal-store";
import { normalizeFieldCatalogForSchema, slugifyBusinessText } from "../helpers";
import type { FieldCatalogItem } from "@/lib/report/config-schema";

export interface UseTemplateActionsProps {
    t: (key: string) => string;
    loadAllFieldTemplates: () => Promise<void>;
    loadFieldTemplates: (customerId: string) => Promise<void>;
    stopEditingFieldTemplate: () => void;
}

export function useTemplateActions({
    t,
    loadAllFieldTemplates,
    loadFieldTemplates,
    stopEditingFieldTemplate,
}: UseTemplateActionsProps) {
    const openModal = useModalStore((s) => s.openModal);

    const importGroupPromptResolver = useRef<
        ((decision: "create_once" | "create_all" | "stop") => void) | null
    >(null);

    const openImportGroupPrompt = useCallback(
        (args: { rowNumber: number; missingPath: string; level: "parent" | "subgroup" }) =>
            new Promise<"create_once" | "create_all" | "stop">((resolve) => {
                importGroupPromptResolver.current = resolve;
                useUiStore.getState().setContext({ importGroupPrompt: args });
            }),
        [],
    );

    const resolveImportGroupPrompt = useCallback(
        (decision: "create_once" | "create_all" | "stop") => {
            importGroupPromptResolver.current?.(decision);
            importGroupPromptResolver.current = null;
            useUiStore.getState().setContext({ importGroupPrompt: null });
        },
        [],
    );

    const handleApplyBkImport = useCallback(
        async (payload: {
            mode: "data-only" | "template-and-data";
            values: Record<string, string>;
            newFields?: FieldCatalogItem[];
            templateName?: string;
        }) => {
            const { setManualValues, setValues, setFieldCatalog } = useMappingDataStore.getState();
            const ft = useFieldTemplateStore.getState();

            if (payload.mode === "template-and-data" && payload.newFields) {
                const name = payload.templateName || "BK Import";
                try {
                    const res = await fetch("/api/report/master-templates", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ name, field_catalog: payload.newFields }),
                    });
                    const data = (await res.json()) as { ok: boolean; master_template?: { id: string; name: string } };

                    if (data.ok && data.master_template) {
                        const normalizedCatalog = normalizeFieldCatalogForSchema(payload.newFields);
                        setFieldCatalog(normalizedCatalog);

                        ft.setEditingFieldTemplateId(data.master_template.id);
                        ft.setEditingFieldTemplateName(name);
                        ft.setSelectedFieldTemplateId("");

                        await loadAllFieldTemplates();

                        useUiStore.getState().setStatus({
                            message: `Đã tạo template "${name}" với ${payload.newFields.length} trường.`,
                        });
                    }
                } catch (e) {
                    useUiStore.getState().setStatus({
                        error: e instanceof Error ? e.message : "Không thể tạo template.",
                    });
                }
            }

            setManualValues((prev) => ({ ...prev, ...payload.values }));
            setValues((prev) => ({ ...prev, ...payload.values }));
        },
        [loadAllFieldTemplates],
    );

    const openDeleteGenericTemplateModal = useCallback(() => {
        useUiStore
            .getState()
            .setModals((prev) => ({ ...prev, deleteMaster: { open: true, typedName: "", loading: false } }));
    }, []);

    const closeDeleteMasterModal = useCallback(() => {
        useUiStore
            .getState()
            .setModals((prev) => ({ ...prev, deleteMaster: { open: false, typedName: "", loading: false } }));
    }, []);

    const confirmDeleteMasterTemplate = useCallback(async () => {
        const { editingFieldTemplateId: tplId, editingFieldTemplateName: tplName, allFieldTemplates } =
            useFieldTemplateStore.getState();
        const { selectedCustomerId } = useCustomerStore.getState();
        const { setStatus } = useUiStore.getState();
        if (!tplId || !tplName.trim()) return;
        useUiStore
            .getState()
            .setModals((prev) => ({ ...prev, deleteMaster: { ...prev.deleteMaster, loading: true } }));
        setStatus({ error: "" });
        try {
            const isMaster = allFieldTemplates.some((t) => t.id === tplId);
            const url = isMaster
                ? `/api/report/master-templates/${tplId}`
                : `/api/report/mapping-instances/${tplId}`;
            const res = await fetch(url, { method: "DELETE" });
            const data = (await res.json()) as { ok: boolean; error?: string };
            if (!data.ok) throw new Error(data.error ?? "Xóa thất bại.");
            setStatus({ message: t("mapping.msg.templateDeleted").replace("{name}", tplName) });
            closeDeleteMasterModal();
            stopEditingFieldTemplate();
            await Promise.all([
                loadAllFieldTemplates(),
                selectedCustomerId ? loadFieldTemplates(selectedCustomerId) : Promise.resolve(),
            ]);
        } catch (e) {
            setStatus({ error: e instanceof Error ? e.message : "Xóa thất bại." });
        } finally {
            useUiStore
                .getState()
                .setModals((prev) => ({ ...prev, deleteMaster: { ...prev.deleteMaster, loading: false } }));
        }
    }, [closeDeleteMasterModal, loadAllFieldTemplates, loadFieldTemplates, stopEditingFieldTemplate, t]);

    const openCreateMasterTemplateModal = useCallback(
        (initialName = "") => {
            openModal("createMasterTemplate", {
                initialName,
                onSuccess: async (created: { id: string; name: string }) => {
                    const { setStatus } = useUiStore.getState();
                    const { selectedCustomerId: cid } = useCustomerStore.getState();
                    const {
                        setSelectedFieldTemplateId,
                        setEditingFieldTemplateId,
                        setEditingFieldTemplateName: setTplName,
                    } = useFieldTemplateStore.getState();
                    const { setFieldCatalog, setValues, setManualValues } = useMappingDataStore.getState();

                    setStatus({
                        message: t("mapping.msg.templateSaved").replace("{name}", created.name),
                        error: "",
                    });
                    await loadAllFieldTemplates();

                    if (cid) {
                        await loadFieldTemplates(cid);
                        const attachRes = await fetch("/api/report/mapping-instances", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                                customer_id: cid,
                                master_id: created.id,
                                name: `${created.name}-${Date.now()}`,
                            }),
                        });
                        const attachData = (await attachRes.json()) as {
                            ok: boolean;
                            mapping_instance?: { id: string };
                        };
                        await loadFieldTemplates(cid);
                        if (attachData.ok && attachData.mapping_instance?.id) {
                            setSelectedFieldTemplateId(attachData.mapping_instance.id);
                        }
                    } else {
                        setSelectedFieldTemplateId(created.id);
                    }

                    setFieldCatalog([]);
                    setValues({});
                    setManualValues({});
                    setEditingFieldTemplateId(created.id);
                    setTplName(created.name);
                },
                onError: (msg: string) => {
                    useUiStore.getState().setStatus({ error: msg });
                },
            });
        },
        [loadAllFieldTemplates, loadFieldTemplates, openModal, t],
    );

    const createTemplateFromImport = useCallback(
        async (params: {
            templateName: string;
            fieldCatalog: FieldCatalogItem[];
        }) => {
            const { setFieldCatalog, setValues, setManualValues } = useMappingDataStore.getState();

            const normalizedCatalog = normalizeFieldCatalogForSchema(params.fieldCatalog);
            const res = await fetch("/api/report/master-templates", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: params.templateName,
                    field_catalog: normalizedCatalog,
                }),
            });
            const data = (await res.json()) as {
                ok: boolean;
                master_template?: { id: string; name: string };
            };

            if (!data.ok || !data.master_template) {
                useUiStore.getState().setStatus({ error: "Lỗi kết nối khi lưu Template mới" });
                return;
            }
            setFieldCatalog(normalizedCatalog);
            setValues({});
            setManualValues({});

            const ft = useFieldTemplateStore.getState();
            ft.setEditingFieldTemplateId(data.master_template.id);
            ft.setEditingFieldTemplateName(params.templateName);
            ft.setSelectedFieldTemplateId("");
            await loadAllFieldTemplates();

            useUiStore.getState().setModals((prev) => ({ ...prev, importingCatalog: false }));
            useUiStore.getState().setStatus({
                message: `Đã tạo "${params.templateName}" từ file JSON (${normalizedCatalog.length} fields).`,
            });
        },
        [loadAllFieldTemplates],
    );

    const openImportGroupModal = useCallback(() => {
        useUiStore.getState().setContext({ importGroupTemplateId: "", importGroupPath: "" });
        useUiStore.getState().setModals((prev) => ({ ...prev, importGroup: true }));
    }, []);

    const closeImportGroupModal = useCallback(() => {
        useUiStore.getState().setModals((prev) => ({ ...prev, importGroup: false }));
    }, []);

    const applyImportGroupToCurrentTemplate = useCallback(() => {
        const { editingFieldTemplateId: tplId } = useFieldTemplateStore.getState();
        const { allFieldTemplates: allTpls } = useFieldTemplateStore.getState();
        const { context, setStatus, setModals } = useUiStore.getState();
        const { setFieldCatalog } = useMappingDataStore.getState();
        const { importGroupTemplateId: srcTplId, importGroupPath: srcPath } = context;

        if (!tplId) {
            setStatus({ error: "Vui lòng vào chế độ chỉnh template trước." });
            return;
        }
        if (!srcTplId || !srcPath) {
            setStatus({ error: "Vui lòng chọn mẫu nguồn và nhóm dữ liệu." });
            return;
        }

        const sourceTemplate = allTpls.find((tpl) => tpl.id === srcTplId);
        if (!sourceTemplate) {
            setStatus({ error: "Không tìm thấy mẫu nguồn." });
            return;
        }

        const sourceFields = normalizeFieldCatalogForSchema(sourceTemplate.field_catalog ?? []).filter(
            (field) => {
                const group = field.group?.trim() ?? "";
                return group === srcPath || group.startsWith(`${srcPath}/`);
            },
        );

        if (sourceFields.length === 0) {
            setStatus({ error: "Nhóm nguồn không có field để thêm." });
            return;
        }

        setFieldCatalog((prev) => {
            const existingKeys = new Set(prev.map((f) => f.field_key));
            const next = [...prev];
            for (const field of sourceFields) {
                let targetKey = field.field_key;
                if (existingKeys.has(targetKey)) {
                    const groupSlug = slugifyBusinessText(field.group || "nhom") || "nhom";
                    const labelSlug = slugifyBusinessText(field.label_vi || "truong") || "truong";
                    const base = `imported.${groupSlug}.${labelSlug}`;
                    targetKey = base;
                    let i = 2;
                    while (existingKeys.has(targetKey)) { targetKey = `${base}_${i}`; i += 1; }
                }
                existingKeys.add(targetKey);
                next.push({ ...field, field_key: targetKey });
            }
            return next;
        });

        setStatus({ message: `Đã thêm nhóm "${srcPath}" từ mẫu "${sourceTemplate.name}".`, error: "" });
        setModals((prev) => ({ ...prev, importGroup: false }));
    }, []);

    return {
        openImportGroupPrompt,
        resolveImportGroupPrompt,
        handleApplyBkImport,
        openDeleteGenericTemplateModal,
        closeDeleteMasterModal,
        confirmDeleteMasterTemplate,
        openCreateMasterTemplateModal,
        createTemplateFromImport,
        openImportGroupModal,
        closeImportGroupModal,
        applyImportGroupToCurrentTemplate,
    };
}
