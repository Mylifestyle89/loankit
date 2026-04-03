import { normalizeFieldCatalogForSchema } from "../helpers";
import type { FieldTemplateItem, MappingInstanceItem, MasterTemplateItem } from "../types";
import { useFieldTemplateStore } from "../stores/use-field-template-store";
import { useUiStore } from "../stores/use-ui-store";

/**
 * Load, refresh and sync field templates from the API.
 * Extracted from useFieldTemplates to keep that file under 300 lines.
 */
export function useFieldTemplateSync({ t }: { t: (key: string) => string }) {
  function handleApiError(e: unknown, defaultKey: string) {
    useUiStore.getState().setStatus({ error: e instanceof Error ? e.message : t(defaultKey) });
  }

  async function loadFieldTemplates(customerId?: string) {
    const { setFieldTemplates, setLoadingFieldTemplates } = useFieldTemplateStore.getState();
    setLoadingFieldTemplates(true);
    try {
      const query = customerId ? `?customer_id=${encodeURIComponent(customerId)}` : "";
      const [instancesRes, mastersRes] = await Promise.all([
        fetch(`/api/report/mapping-instances${query}`, { cache: "no-store" }),
        fetch("/api/report/master-templates?with_usage=1", { cache: "no-store" }),
      ]);
      const [instancesData, mastersData] = (await Promise.all([
        instancesRes.json(),
        mastersRes.json(),
      ])) as [
        { ok: boolean; error?: string; mapping_instances?: MappingInstanceItem[] },
        { ok: boolean; error?: string; master_templates?: MasterTemplateItem[] },
      ];

      if (!instancesData.ok || !mastersData.ok) {
        throw new Error(instancesData.error ?? mastersData.error ?? t("mapping.fieldTemplate.errLoad"));
      }

      const templates: FieldTemplateItem[] = customerId
        ? (instancesData.mapping_instances ?? []).map((item) => ({
            id: item.id,
            name: item.name || item.master_snapshot_name || "Template khách hàng",
            created_at: item.updated_at || item.created_at,
            field_catalog: normalizeFieldCatalogForSchema(item.field_catalog ?? []),
            assigned_customer_count: 1,
          }))
        : (mastersData.master_templates ?? []).map((master) => ({
            id: master.id,
            name: master.name,
            created_at: master.created_at,
            field_catalog: master.field_catalog,
            assigned_customer_count: master.assigned_customer_count,
          }));

      setFieldTemplates(templates);
    } catch (e) {
      handleApiError(e, "mapping.fieldTemplate.errLoad");
    } finally {
      useFieldTemplateStore.getState().setLoadingFieldTemplates(false);
    }
  }

  async function loadAllFieldTemplates() {
    const { setAllFieldTemplates } = useFieldTemplateStore.getState();
    try {
      const res = await fetch("/api/report/master-templates?with_usage=1", { cache: "no-store" });
      const data = (await res.json()) as {
        ok: boolean;
        error?: string;
        master_templates?: MasterTemplateItem[];
      };
      if (data.ok && Array.isArray(data.master_templates)) {
        setAllFieldTemplates(
          data.master_templates.map((master) => ({
            id: master.id,
            name: master.name,
            created_at: master.created_at,
            field_catalog: master.field_catalog,
            assigned_customer_count: master.assigned_customer_count,
          })),
        );
      }
    } catch (e) {
      handleApiError(e, "mapping.fieldTemplate.errLoad");
    }
  }

  return { loadFieldTemplates, loadAllFieldTemplates };
}
