import { normalizeFieldCatalogForSchema } from "../helpers";
import type { FieldTemplateItem, MasterTemplateItem } from "../types";
import { useFieldTemplateStore } from "../stores/use-field-template-store";
import { useMappingDataStore } from "../stores/use-mapping-data-store";
import { useUiStore } from "../stores/use-ui-store";

type CustomerLoan = {
  id: string;
  status?: string;
  masterTemplateId?: string | null;
  masterTemplateName?: string | null;
  masterTemplateFieldCatalog?: unknown[] | null;
  createdAt?: string;
};

/**
 * Customer-scoped templates derive from `customer.loans.distinct(masterTemplateId)`.
 * The same `/api/customers/[id]/loans` fetch also drives newest-active-loan selection
 * + the multi-active warning so we don't double-fetch on customer change.
 */
export function useFieldTemplateSync({ t }: { t: (key: string) => string }) {
  function handleApiError(e: unknown, defaultKey: string) {
    useUiStore.getState().setStatus({ error: e instanceof Error ? e.message : t(defaultKey) });
  }

  function resolveLoanSelection(loans: CustomerLoan[]): void {
    const md = useMappingDataStore.getState();
    const activeLoans = loans.filter((l) => l.status === "active");
    if (activeLoans.length === 0) {
      md.setSelectedLoanId("");
      md.setMultiActiveLoansWarning("");
      return;
    }
    const newestLoan = activeLoans[activeLoans.length - 1];
    md.setSelectedLoanId(newestLoan.id);
    md.setMultiActiveLoansWarning(
      activeLoans.length >= 2
        ? `Khách hàng có ${activeLoans.length} hồ sơ vay đang hoạt động. Đang lưu vào hồ sơ mới nhất.`
        : "",
    );
  }

  async function loadFieldTemplates(customerId?: string) {
    const { setFieldTemplates, setLoadingFieldTemplates } = useFieldTemplateStore.getState();
    setLoadingFieldTemplates(true);
    try {
      if (!customerId) {
        // Reset loan selection — no customer scope
        const md = useMappingDataStore.getState();
        md.setSelectedLoanId("");
        md.setMultiActiveLoansWarning("");
        const mastersRes = await fetch("/api/report/master-templates?with_usage=1", {
          cache: "no-store",
        });
        const mastersData = (await mastersRes.json()) as {
          ok: boolean;
          error?: string;
          master_templates?: MasterTemplateItem[];
        };
        if (!mastersData.ok) throw new Error(mastersData.error ?? t("mapping.fieldTemplate.errLoad"));
        const templates: FieldTemplateItem[] = (mastersData.master_templates ?? []).map((master) => ({
          id: master.id,
          name: master.name,
          created_at: master.created_at,
          field_catalog: master.field_catalog,
          assigned_customer_count: master.assigned_customer_count,
        }));
        setFieldTemplates(templates);
        return;
      }

      const loansRes = await fetch(
        `/api/customers/${encodeURIComponent(customerId)}/loans`,
        { cache: "no-store" },
      );
      const loansData = (await loansRes.json()) as {
        ok: boolean;
        error?: string;
        loans?: CustomerLoan[];
      };

      if (!loansData.ok) throw new Error(loansData.error ?? t("mapping.fieldTemplate.errLoad"));

      const loans = loansData.loans ?? [];
      resolveLoanSelection(loans);

      const seen = new Set<string>();
      const templates: FieldTemplateItem[] = [];
      for (const loan of loans) {
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
