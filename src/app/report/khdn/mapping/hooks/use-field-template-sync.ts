import { normalizeFieldCatalogForSchema } from "../helpers";
import type { FieldTemplateItem, MasterTemplateItem } from "../types";
import { useFieldTemplateStore } from "../stores/use-field-template-store";
import { useUiStore } from "../stores/use-ui-store";

/**
 * Load, refresh and sync field templates from the API.
 *
 * Phase 6g: MappingInstance removed (Q1-b).
 * Customer-scoped templates are now derived from customer.loans.distinct(masterTemplateId).
 * The loadFieldTemplates(customerId) call hits GET /api/customers/[id]/loans and
 * extracts distinct master templates from the returned loan list.
 */
export function useFieldTemplateSync({ t }: { t: (key: string) => string }) {
  function handleApiError(e: unknown, defaultKey: string) {
    useUiStore.getState().setStatus({ error: e instanceof Error ? e.message : t(defaultKey) });
  }

  async function loadFieldTemplates(customerId?: string) {
    const { setFieldTemplates, setLoadingFieldTemplates } = useFieldTemplateStore.getState();
    setLoadingFieldTemplates(true);
    try {
      if (customerId) {
        // Q1-b: derive customer templates from loans.distinct(masterTemplateId)
        const loansRes = await fetch(
          `/api/customers/${encodeURIComponent(customerId)}/loans`,
          { cache: "no-store" },
        );
        const loansData = (await loansRes.json()) as {
          ok: boolean;
          error?: string;
          loans?: Array<{
            id: string;
            masterTemplateId?: string | null;
            masterTemplateName?: string | null;
            masterTemplateFieldCatalog?: unknown[] | null;
            createdAt?: string;
          }>;
        };

        if (!loansData.ok) {
          throw new Error(loansData.error ?? t("mapping.fieldTemplate.errLoad"));
        }

        // Distinct master templates from loans (Q1-b)
        const seen = new Set<string>();
        const templates: FieldTemplateItem[] = [];
        for (const loan of loansData.loans ?? []) {
          if (!loan.masterTemplateId || seen.has(loan.masterTemplateId)) continue;
          seen.add(loan.masterTemplateId);
          templates.push({
            id: loan.masterTemplateId,
            name: loan.masterTemplateName ?? "Template mẫu",
            created_at: loan.createdAt ?? "",
            field_catalog: normalizeFieldCatalogForSchema(
              (loan.masterTemplateFieldCatalog as import("@/lib/report/config-schema").FieldCatalogItem[] | undefined) ?? [],
            ),
            assigned_customer_count: 1,
          });
        }
        setFieldTemplates(templates);
      } else {
        // No customer selected — show all master templates
        const mastersRes = await fetch("/api/report/master-templates?with_usage=1", {
          cache: "no-store",
        });
        const mastersData = (await mastersRes.json()) as {
          ok: boolean;
          error?: string;
          master_templates?: MasterTemplateItem[];
        };

        if (!mastersData.ok) {
          throw new Error(mastersData.error ?? t("mapping.fieldTemplate.errLoad"));
        }

        const templates: FieldTemplateItem[] = (mastersData.master_templates ?? []).map(
          (master) => ({
            id: master.id,
            name: master.name,
            created_at: master.created_at,
            field_catalog: master.field_catalog,
            assigned_customer_count: master.assigned_customer_count,
          }),
        );
        setFieldTemplates(templates);
      }
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
