import { useCallback } from "react";
import { getDuplicateAliasGroups } from "@/lib/report/alias-utils";
import { evaluateFieldFormula } from "@/lib/report/field-calc";
import type {
  AutoProcessAssetsResponse,
  AutoProcessJobResponse,
  AutoProcessUploadResponse,
  MappingApiResponse,
  MappingSuggestResponse,
  ValidationResponse,
  ValuesResponse,
} from "../types";
import { normalizeFieldCatalogForSchema } from "../helpers";
import { useMappingDataStore } from "../stores/use-mapping-data-store";
import { useCustomerStore } from "../stores/use-customer-store";
import { useFieldTemplateStore } from "../stores/use-field-template-store";
import { useUiStore } from "../stores/use-ui-store";

type SmartAutoBatchInput = {
  excelPath: string;
  templatePath: string;
  jobType?: string;
  rootKeyOverride?: string;
  onProgress?: (job: NonNullable<AutoProcessJobResponse["job"]>) => void;
};

type UploadKind = "data" | "template";

type UseMappingApiParams = {
  t: (key: string) => string;
  selectedMappingInstanceId?: string;
};

export function useMappingApi({ t, selectedMappingInstanceId }: UseMappingApiParams) {
  /** Thin alias — avoids repeating `useUiStore.getState().setStatus(...)` everywhere. */
  const updateStatus = (updates: Parameters<ReturnType<typeof useUiStore.getState>["setStatus"]>[0]) =>
    useUiStore.getState().setStatus(updates);

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
    const res = await fetch("/api/report/values", { cache: "no-store" });
    const data = (await res.json()) as ValuesResponse;
    if (!data.ok) {
      updateStatus({ error: data.error ?? t("mapping.err.loadData") });
      return;
    }
    md.setFieldCatalog(normalizeFieldCatalogForSchema(data.field_catalog ?? []));
    md.setAutoValues(data.auto_values ?? {});
    md.setValues(data.values ?? {});
    md.setManualValues(data.manual_values ?? {});
    md.setFormulas(data.field_formulas ?? {});
  }, [t]);

  const loadData = useCallback(async () => {
    const md = useMappingDataStore.getState();
    updateStatus({ loading: true, error: "" });
    const query = selectedMappingInstanceId
      ? `?mapping_instance_id=${encodeURIComponent(selectedMappingInstanceId)}`
      : "";
    const res = await fetch(`/api/report/mapping${query}`, { cache: "no-store" });
    const data = (await res.json()) as MappingApiResponse;
    if (!data.ok) {
      updateStatus({ error: data.error ?? t("mapping.err.loadData"), loading: false });
      return;
    }
    md.setActiveVersionId(data.active_version_id ?? "");
    md.setVersions(data.versions ?? []);
    md.setMappingText(JSON.stringify(data.mapping ?? {}, null, 2));
    md.setAliasText(JSON.stringify(data.alias_map ?? {}, null, 2));
    await loadFieldValues();
    updateStatus({ loading: false });
  }, [selectedMappingInstanceId, t, loadFieldValues]);

  const saveDraft = useCallback(async () => {
    updateStatus({ saving: true, error: "", message: "" });
    try {
      const md = useMappingDataStore.getState();
      const { selectedCustomerId } = useCustomerStore.getState();
      const { selectedFieldTemplateId } = useFieldTemplateStore.getState();

      // 1. Validate aliases before any network calls
      const aliasMap = JSON.parse(md.aliasText) as Record<string, unknown>;
      const duplicates = getDuplicateAliasGroups(aliasMap);
      if (Object.keys(duplicates).length > 0) {
        const lines = Object.entries(duplicates).map(
          ([norm, keys]) => `"${norm}": ${(keys as string[]).map((k) => `"${k}"`).join(", ")}`,
        );
        if (
          !window.confirm(
            "Cảnh báo: phát hiện alias trùng tên (sau chuẩn hóa).\n\n" +
              lines.join("\n") +
              "\n\nBạn vẫn muốn lưu dữ liệu?",
          )
        ) {
          updateStatus({ saving: false });
          return;
        }
      }

      const normalizedCatalog = normalizeFieldCatalogForSchema(md.fieldCatalog);

      // 2. Primary saves in parallel: mapping config + master template (if applicable)
      const [mappingRes] = await Promise.all([
        fetch("/api/report/mapping", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            created_by: "web-user",
            notes: "Saved from mapping editor",
            mapping: JSON.parse(md.mappingText),
            alias_map: aliasMap,
            field_catalog: normalizedCatalog,
            mapping_instance_id: selectedMappingInstanceId || undefined,
          }),
        }),
        selectedCustomerId && selectedFieldTemplateId
          ? fetch("/api/report/master-templates", {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ master_id: selectedFieldTemplateId, field_catalog: normalizedCatalog }),
            })
          : Promise.resolve(null),
      ]);

      const mappingData = (await mappingRes.json()) as MappingApiResponse;
      if (!mappingData.ok) throw new Error(mappingData.error ?? t("mapping.err.saveDraft"));

      // 3. Save field values (depends on mapping save succeeding)
      // Include repeater arrays from values — they are stored in values[groupPath] as arrays
      const repeaterData: Record<string, unknown> = {};
      for (const [key, val] of Object.entries(md.values)) {
        if (Array.isArray(val)) repeaterData[key] = val;
      }
      await fetch("/api/report/values", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          manual_values: { ...md.manualValues, ...repeaterData },
          field_formulas: md.formulas,
        }),
      });

      // 4. Compute effective values with formulas for customer sync
      const payloadValues = { ...md.values };
      const fieldTypeMap = new Map(md.fieldCatalog.map((f) => [f.field_key, f.type]));
      for (const [fieldKey, formula] of Object.entries(md.formulas)) {
        const v = evaluateFieldFormula(formula, payloadValues, fieldTypeMap.get(fieldKey) ?? "text");
        if (v !== null) payloadValues[fieldKey] = v;
      }

      // 5. Background tasks in parallel: customer sync + auto-validation
      let msg = t("mapping.msg.savedDraft");
      await Promise.all([
        fetch("/api/customers/from-draft", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ values: payloadValues }),
        })
          .then(async (res) => {
            const data = (await res.json()) as { ok?: boolean; created?: boolean; error?: string };
            if (data.ok) {
              msg += `. ${data.created ? t("mapping.msg.customerCreated") : t("mapping.msg.customerUpdated")}`;
            } else if (res.status === 400) {
              msg += `. ${t("mapping.msg.customerSkippedNoName")}`;
            } else {
              msg += `. ${t("mapping.msg.customerSaveFailed")}: ${data.error ?? ""}`;
            }
          })
          .catch(() => {
            msg += `. ${t("mapping.msg.customerSaveFailed")}.`;
          }),
        fetch("/api/report/validate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ run_build: true, mapping_instance_id: selectedMappingInstanceId || undefined }),
        })
          .then(async (res) => {
            const data = (await res.json()) as ValidationResponse;
            if (data.ok) {
              useMappingDataStore.getState().setValidation(data.validation);
              msg += ` - Đã tự động cập nhật & kiểm tra dữ liệu.`;
            }
          })
          .catch(() => {
            msg += `. Tự động kiểm tra dữ liệu thất bại.`;
          }),
      ]);

      updateStatus({ message: msg });
      await loadData();
    } catch (e) {
      updateStatus({ error: e instanceof Error ? e.message : t("mapping.err.invalidJson") });
    } finally {
      updateStatus({ saving: false });
    }
  }, [selectedMappingInstanceId, t, loadData]);

  const getAutoProcessAssets = useCallback(async () => {
    const res = await fetch("/api/report/auto-process/assets", { cache: "no-store" });
    const data = (await res.json()) as AutoProcessAssetsResponse;
    if (!data.ok) throw new Error(data.error ?? "Không thể tải danh sách file.");
    return { excelFiles: data.excel_files ?? [], templateFiles: data.template_files ?? [] };
  }, []);

  const uploadAutoProcessFile = useCallback(async (file: File, kind: UploadKind): Promise<string> => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("kind", kind);
    const res = await fetch("/api/report/auto-process/upload", { method: "POST", body: formData });
    const data = (await res.json()) as AutoProcessUploadResponse;
    if (!data.ok || !data.path) throw new Error(data.error ?? "Upload file thất bại.");
    return data.path;
  }, []);

  const runSmartAutoBatch = useCallback(async (input: SmartAutoBatchInput) => {
    updateStatus({ error: "", message: "" });
    const startRes = await fetch("/api/report/auto-process/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ excel_path: input.excelPath, template_path: input.templatePath, job_type: input.jobType }),
    });
    const startData = (await startRes.json()) as AutoProcessJobResponse;
    if (!startData.ok || !startData.job) throw new Error(startData.error ?? "Không thể khởi tạo Auto-Process.");
    input.onProgress?.(startData.job);

    const runRes = await fetch("/api/report/auto-process/run", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ job_id: startData.job.job_id, root_key: input.rootKeyOverride }),
    });
    const runData = (await runRes.json()) as AutoProcessJobResponse;
    if (!runData.ok || !runData.job) throw new Error(runData.error ?? "Không thể chạy Auto-Batch.");

    let latest = runData.job;
    input.onProgress?.(latest);
    while (latest.phase === "running" || latest.phase === "analyzing") {
      await new Promise((resolve) => setTimeout(resolve, 800));
      const pollRes = await fetch(`/api/report/auto-process/jobs/${encodeURIComponent(latest.job_id)}`, {
        cache: "no-store",
      });
      const pollData = (await pollRes.json()) as AutoProcessJobResponse;
      if (!pollData.ok || !pollData.job) throw new Error(pollData.error ?? "Không thể theo dõi tiến trình batch.");
      latest = pollData.job;
      input.onProgress?.(latest);
    }
    if (latest.phase !== "completed") throw new Error(latest.error ?? "Batch chưa hoàn tất.");
    return latest;
  }, []);

  const openAutoProcessOutputFolder = useCallback(async (jobId: string) => {
    const res = await fetch("/api/report/auto-process/open-output", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ job_id: jobId }),
    });
    const data = (await res.json()) as { ok: boolean; error?: string };
    if (!data.ok) throw new Error(data.error ?? "Không thể mở thư mục kết quả.");
  }, []);

  return {
    loadData,
    saveDraft,
    suggestMappingFromHeaders,
    getAutoProcessAssets,
    uploadAutoProcessFile,
    runSmartAutoBatch,
    openAutoProcessOutputFolder,
  };
}
