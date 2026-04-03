import { useCallback } from "react";
import { useUiStore } from "../stores/use-ui-store";
import { useMappingDataStore } from "../stores/use-mapping-data-store";
import { useFieldTemplateStore } from "../stores/use-field-template-store";
import { useCustomerStore } from "../stores/use-customer-store";
import { useModalStore } from "@/lib/report/use-modal-store";
import { normalizeFieldCatalogForSchema, slugifyBusinessText } from "../helpers";
import type { FieldCatalogItem } from "@/lib/report/config-schema";

/**
 * Create master template, import group into current template, and import-group modal actions.
 * Extracted from use-template-docx-actions to keep that file under 300 lines.
 */
export function useTemplateMasterMutations({
  t,
  loadAllFieldTemplates,
  loadFieldTemplates,
}: {
  t: (key: string) => string;
  loadAllFieldTemplates: () => Promise<void>;
  loadFieldTemplates: (customerId: string) => Promise<void>;
}) {
  const openModal = useModalStore((s) => s.openModal);

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
    async (params: { templateName: string; fieldCatalog: FieldCatalogItem[] }) => {
      const { setFieldCatalog, setValues, setManualValues } = useMappingDataStore.getState();
      const normalizedCatalog = normalizeFieldCatalogForSchema(params.fieldCatalog);
      const res = await fetch("/api/report/master-templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: params.templateName, field_catalog: normalizedCatalog }),
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

    if (!tplId) { setStatus({ error: "Vui lòng vào chế độ chỉnh template trước." }); return; }
    if (!srcTplId || !srcPath) { setStatus({ error: "Vui lòng chọn mẫu nguồn và nhóm dữ liệu." }); return; }

    const sourceTemplate = allTpls.find((tpl) => tpl.id === srcTplId);
    if (!sourceTemplate) { setStatus({ error: "Không tìm thấy mẫu nguồn." }); return; }

    const sourceFields = normalizeFieldCatalogForSchema(sourceTemplate.field_catalog ?? []).filter(
      (field) => {
        const group = field.group?.trim() ?? "";
        return group === srcPath || group.startsWith(`${srcPath}/`);
      },
    );
    if (sourceFields.length === 0) { setStatus({ error: "Nhóm nguồn không có field để thêm." }); return; }

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
    openCreateMasterTemplateModal,
    createTemplateFromImport,
    openImportGroupModal,
    closeImportGroupModal,
    applyImportGroupToCurrentTemplate,
  };
}
