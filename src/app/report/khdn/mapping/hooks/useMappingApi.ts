import { useCallback } from "react";
import type { MappingApiResponse, MappingSuggestResponse, ValuesResponse } from "../types";
import { useMappingDataStore } from "../stores/use-mapping-data-store";
import { useCustomerStore } from "../stores/use-customer-store";
import { useUiStore } from "../stores/use-ui-store";
import { useMappingApiMutations } from "./use-mapping-api-mutations";

type UseMappingApiParams = {
  t: (key: string) => string;
  selectedMappingInstanceId?: string;
};

/**
 * Main mapping API hook — composes query functions + mutation sub-hook.
 * Re-exports all functions under the original API surface for backward compat.
 */
export function useMappingApi({ t, selectedMappingInstanceId }: UseMappingApiParams) {
  const updateStatus = (
    updates: Parameters<ReturnType<typeof useUiStore.getState>["setStatus"]>[0],
  ) => useUiStore.getState().setStatus(updates);

  const suggestMappingFromHeaders = useCallback(
    async (excelHeaders: string[]) => {
      const { mappingText, setMappingText } = useMappingDataStore.getState();
      updateStatus({ error: "", message: "" });
      try {
        const mappingObj = JSON.parse(mappingText) as {
          mappings?: Array<{
            template_field?: string;
            sources?: Array<{ source: string; path: string; note?: string }>;
          }>;
        };
        const placeholders = (mappingObj.mappings ?? [])
          .map((item) => (typeof item.template_field === "string" ? item.template_field.trim() : ""))
          .filter(Boolean);

        if (placeholders.length === 0) {
          updateStatus({ error: t("mapping.aiSuggest.err.noPlaceholders") });
          return;
        }
        const normalizedHeaders = [...new Set(excelHeaders.map((h) => h.trim()).filter(Boolean))];
        if (normalizedHeaders.length === 0) {
          updateStatus({ error: t("mapping.aiSuggest.err.noHeaders") });
          return;
        }

        const res = await fetch("/api/report/mapping/suggest", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ excelHeaders: normalizedHeaders, wordPlaceholders: placeholders }),
        });
        const data = (await res.json()) as MappingSuggestResponse;
        if (!data.ok || !data.suggestion) throw new Error(data.error ?? t("mapping.aiSuggest.err.failed"));

        const suggestion = data.suggestion;
        let matched = 0;
        const nextMappings = (mappingObj.mappings ?? []).map((item) => {
          const key = typeof item.template_field === "string" ? item.template_field.trim() : "";
          const header = key ? suggestion[key] : undefined;
          if (!header) return item;
          matched += 1;
          return { ...item, sources: [{ source: "excel_ai", path: header, note: "AI suggestion" }] };
        });
        setMappingText(JSON.stringify({ ...mappingObj, mappings: nextMappings }, null, 2));
        updateStatus({ message: t("mapping.aiSuggest.ok").replace("{count}", String(matched)) });
      } catch (e) {
        updateStatus({ error: e instanceof Error ? e.message : t("mapping.aiSuggest.err.failed") });
      }
    },
    [t],
  );

  const loadFieldValues = useCallback(async () => {
    const md = useMappingDataStore.getState();
    const query = selectedMappingInstanceId
      ? `?mapping_instance_id=${encodeURIComponent(selectedMappingInstanceId)}`
      : "";
    const res = await fetch(`/api/report/values${query}`, { cache: "no-store" });
    const data = (await res.json()) as ValuesResponse;
    if (!data.ok) {
      updateStatus({ error: data.error ?? t("mapping.err.loadData") });
      return;
    }
    md.setAutoValues(data.auto_values ?? {});
    md.setValues(data.values ?? {});
    md.setManualValues(data.manual_values ?? {});
    md.setFormulas(data.field_formulas ?? {});
  }, [selectedMappingInstanceId, t]);

  const loadData = useCallback(async () => {
    const md = useMappingDataStore.getState();
    updateStatus({ loading: true, error: "" });
    try {
      const query = selectedMappingInstanceId
        ? `?mapping_instance_id=${encodeURIComponent(selectedMappingInstanceId)}`
        : "";
      const res = await fetch(`/api/report/mapping${query}`, { cache: "no-store" });
      const data = (await res.json()) as MappingApiResponse;
      if (!data.ok) {
        updateStatus({ error: data.error ?? t("mapping.err.loadData") });
        return;
      }
      md.setActiveVersionId(data.active_version_id ?? "");
      md.setVersions(data.versions ?? []);
      md.setMappingText(JSON.stringify(data.mapping ?? {}, null, 2));
      md.setAliasText(JSON.stringify(data.alias_map ?? {}, null, 2));
      await loadFieldValues();
    } catch (e) {
      updateStatus({ error: e instanceof Error ? e.message : t("mapping.err.loadData") });
    } finally {
      updateStatus({ loading: false });
    }
  }, [selectedMappingInstanceId, t, loadFieldValues]);

  const loadCustomers = useCallback(async () => {
    const { setCustomers, setLoadingCustomers } = useCustomerStore.getState();
    setLoadingCustomers(true);
    try {
      const res = await fetch("/api/customers", { cache: "no-store" });
      const data = (await res.json()) as {
        ok: boolean;
        error?: string;
        customers?: Array<{ id: string; customer_name: string; customer_code: string }>;
      };
      if (data.ok && data.customers) setCustomers(data.customers);
    } catch (e) {
      updateStatus({ error: e instanceof Error ? e.message : t("mapping.err.loadData") });
    } finally {
      setLoadingCustomers(false);
    }
  }, [t]);

  const mutations = useMappingApiMutations({ t, selectedMappingInstanceId, loadData });

  return {
    loadData,
    loadCustomers,
    suggestMappingFromHeaders,
    saveDraft: mutations.saveDraft,
    getAutoProcessAssets: mutations.getAutoProcessAssets,
    uploadAutoProcessFile: mutations.uploadAutoProcessFile,
    runSmartAutoBatch: mutations.runSmartAutoBatch,
    openAutoProcessOutputFolder: mutations.openAutoProcessOutputFolder,
  };
}
