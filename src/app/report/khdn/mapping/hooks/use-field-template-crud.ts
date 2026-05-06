import { normalizeFieldCatalogForSchema } from "../helpers";
import { useMappingDataStore } from "../stores/use-mapping-data-store";
import { useFieldTemplateStore } from "../stores/use-field-template-store";
import { useCustomerStore } from "../stores/use-customer-store";
import { useUiStore } from "../stores/use-ui-store";
import { useFieldTemplateApply } from "./use-field-template-apply";

/**
 * Assign and save field templates (write/mutation operations).
 * Apply/switch operations are in use-field-template-apply.ts.
 * promoteToMasterTemplate has been removed (Q2-a: concept dies with MappingInstance).
 */
export function useFieldTemplateCrud({
  t,
  loadFieldTemplates,
  loadAllFieldTemplates,
  closeEditFieldTemplatePicker,
}: {
  t: (key: string) => string;
  loadFieldTemplates: (customerId?: string) => Promise<void>;
  loadAllFieldTemplates: () => Promise<void>;
  closeEditFieldTemplatePicker: () => void;
}) {
  function handleApiError(e: unknown, defaultKey: string) {
    useUiStore.getState().setStatus({ error: e instanceof Error ? e.message : t(defaultKey) });
  }

  const apply = useFieldTemplateApply({ t, closeEditFieldTemplatePicker });

  /**
   * Assigns the selected master template to ALL loans of the customer (Q4-a).
   * Calls POST /api/customers/[customerId]/loans/assign-master with confirm dialog.
   */
  async function assignSelectedFieldTemplate() {
    const ft = useFieldTemplateStore.getState();
    const { selectedCustomerId } = useCustomerStore.getState();
    if (!selectedCustomerId)
      return useUiStore
        .getState()
        .setStatus({ error: t("mapping.fieldTemplate.errSelectCustomer") });
    if (!ft.selectedFieldTemplateId)
      return useUiStore
        .getState()
        .setStatus({ error: t("mapping.fieldTemplate.errSelectAttach") });
    const selectedMaster = ft.allFieldTemplates.find((i) => i.id === ft.selectedFieldTemplateId);
    if (!selectedMaster)
      return useUiStore
        .getState()
        .setStatus({ error: "Vui lòng chọn template mẫu từ thư viện để áp dụng." });

    useUiStore.getState().setStatus({ error: "" });
    try {
      // First fetch count of loans for the confirm dialog
      const loansRes = await fetch(`/api/customers/${encodeURIComponent(selectedCustomerId)}/loans`, {
        cache: "no-store",
      });
      const loansData = (await loansRes.json()) as {
        ok: boolean;
        loans?: Array<{ id: string; code: string; status: string }>;
        error?: string;
      };
      if (!loansData.ok) throw new Error(loansData.error ?? "Không thể tải danh sách hồ sơ vay.");

      const loanCount = loansData.loans?.length ?? 0;
      const confirmed = window.confirm(
        `Áp dụng template "${selectedMaster.name}" cho ${loanCount} hồ sơ vay của khách hàng?`,
      );
      if (!confirmed) return;

      const res = await fetch(
        `/api/customers/${encodeURIComponent(selectedCustomerId)}/loans/assign-master`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ masterTemplateId: selectedMaster.id }),
        },
      );
      const data = (await res.json()) as { ok: boolean; count?: number; error?: string };
      if (!data.ok) throw new Error(data.error ?? t("mapping.fieldTemplate.errAttach"));

      useUiStore
        .getState()
        .setStatus({
          message: `Đã áp dụng mẫu "${selectedMaster.name}" cho ${data.count ?? loanCount} hồ sơ vay.`,
        });
      await loadFieldTemplates(selectedCustomerId);
    } catch (e) {
      handleApiError(e, "mapping.fieldTemplate.errAttach");
    }
  }

  /**
   * Saves edits to the master template being edited.
   * Instance branch removed (Q2-a) — all writes go to master via /api/report/master-templates.
   */
  async function saveEditedFieldTemplate() {
    const ft = useFieldTemplateStore.getState();
    const md = useMappingDataStore.getState();
    const { selectedCustomerId } = useCustomerStore.getState();
    if (!ft.editingFieldTemplateId)
      return useUiStore.getState().setStatus({ error: t("mapping.fieldTemplate.errSelectEdit") });
    const nextName = ft.editingFieldTemplateName.trim();
    if (!nextName)
      return useUiStore.getState().setStatus({ error: t("mapping.fieldTemplate.errName") });

    ft.setSavingEditedTemplate(true);
    useUiStore.getState().setStatus({ error: "" });
    try {
      const normalizedCatalog = normalizeFieldCatalogForSchema(md.fieldCatalog);
      const masterTemplateId = ft.editingFieldTemplateId;

      // Save mapping + values scoped to master
      await Promise.all([
        fetch("/api/report/mapping", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            created_by: "web-user",
            notes: "Auto-saved before template update",
            mapping: JSON.parse(md.mappingText || "{}"),
            alias_map: JSON.parse(md.aliasText || "{}"),
            field_catalog: normalizedCatalog,
            master_template_id: masterTemplateId,
          }),
        }),
        fetch("/api/report/values", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            manual_values: {
              ...md.manualValues,
              ...Object.fromEntries(Object.entries(md.values).filter(([, v]) => Array.isArray(v))),
            },
            field_formulas: md.formulas,
            master_template_id: masterTemplateId,
          }),
        }),
      ]);

      // Update master template name + catalog
      const res = await fetch("/api/report/master-templates", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          master_id: masterTemplateId,
          name: nextName,
          field_catalog: normalizedCatalog,
        }),
      });
      const data = (await res.json()) as { ok: boolean; error?: string };
      if (!data.ok) throw new Error(data.error ?? t("mapping.fieldTemplate.errSave"));

      await Promise.all([
        loadAllFieldTemplates(),
        selectedCustomerId ? loadFieldTemplates(selectedCustomerId) : Promise.resolve(),
      ]);
      useUiStore
        .getState()
        .setStatus({ message: t("mapping.msg.templateUpdated").replace("{name}", nextName) });
    } catch (e) {
      handleApiError(e, "mapping.fieldTemplate.errSave");
    } finally {
      useFieldTemplateStore.getState().setSavingEditedTemplate(false);
    }
  }

  return {
    applySelectedFieldTemplate: apply.applySelectedFieldTemplate,
    startEditingExistingTemplate: apply.startEditingExistingTemplate,
    stopEditingFieldTemplate: apply.stopEditingFieldTemplate,
    assignSelectedFieldTemplate,
    saveEditedFieldTemplate,
  };
}
