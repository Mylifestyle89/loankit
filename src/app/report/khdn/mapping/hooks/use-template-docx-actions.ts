import { useCallback, useRef } from "react";
import { useUiStore } from "../stores/use-ui-store";
import { useMappingDataStore } from "../stores/use-mapping-data-store";
import { useFieldTemplateStore } from "../stores/use-field-template-store";
import { useCustomerStore } from "../stores/use-customer-store";
import { normalizeFieldCatalogForSchema } from "../helpers";
import type { FieldCatalogItem } from "@/lib/report/config-schema";
import { useTemplateMasterMutations } from "./use-template-master-mutations";

/**
 * Import-group prompt, BK import, delete-master modal actions.
 * Create/import-group mutations are in use-template-master-mutations.ts.
 * Extracted from useTemplateActions to keep files under 300 lines.
 */
export function useTemplateDocxActions({
  t,
  loadAllFieldTemplates,
  loadFieldTemplates,
  stopEditingFieldTemplate,
}: {
  t: (key: string) => string;
  loadAllFieldTemplates: () => Promise<void>;
  loadFieldTemplates: (customerId: string) => Promise<void>;
  stopEditingFieldTemplate: () => void;
}) {
  const masterMutations = useTemplateMasterMutations({ t, loadAllFieldTemplates, loadFieldTemplates });

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
          const data = (await res.json()) as {
            ok: boolean;
            master_template?: { id: string; name: string };
          };
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
      const isMaster = allFieldTemplates.some((tmpl) => tmpl.id === tplId);
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

  return {
    openImportGroupPrompt,
    resolveImportGroupPrompt,
    handleApplyBkImport,
    openDeleteGenericTemplateModal,
    closeDeleteMasterModal,
    confirmDeleteMasterTemplate,
    openCreateMasterTemplateModal: masterMutations.openCreateMasterTemplateModal,
    createTemplateFromImport: masterMutations.createTemplateFromImport,
    openImportGroupModal: masterMutations.openImportGroupModal,
    closeImportGroupModal: masterMutations.closeImportGroupModal,
    applyImportGroupToCurrentTemplate: masterMutations.applyImportGroupToCurrentTemplate,
  };
}
