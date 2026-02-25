import { useCallback } from "react";
import type { Dispatch, SetStateAction } from "react";
import type { FieldCatalogItem } from "@/lib/report/config-schema";
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

function normalizeText(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

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
  mappingText: string;
  aliasText: string;
  fieldCatalog: FieldCatalogItem[];
  values: Record<string, unknown>;
  manualValues: Record<string, string | number | boolean | null>;
  formulas: Record<string, string>;
  selectedCustomerId: string;
  selectedFieldTemplateId: string;
  selectedMappingInstanceId?: string;
  setLoading: Dispatch<SetStateAction<boolean>>;
  setSaving: Dispatch<SetStateAction<boolean>>;
  setError: Dispatch<SetStateAction<string>>;
  setMessage: Dispatch<SetStateAction<string>>;
  setValidation: Dispatch<SetStateAction<ValidationResponse["validation"] | undefined>>;
  setActiveVersionId: Dispatch<SetStateAction<string>>;
  setVersions: Dispatch<SetStateAction<MappingApiResponse["versions"]>>;
  setMappingText: Dispatch<SetStateAction<string>>;
  setAliasText: Dispatch<SetStateAction<string>>;
  setFieldCatalog: Dispatch<SetStateAction<FieldCatalogItem[]>>;
  setAutoValues: Dispatch<SetStateAction<Record<string, unknown>>>;
  setValues: Dispatch<SetStateAction<Record<string, unknown>>>;
  setManualValues: Dispatch<SetStateAction<Record<string, string | number | boolean | null>>>;
  setFormulas: Dispatch<SetStateAction<Record<string, string>>>;
};

export function useMappingApi({
  t,
  mappingText,
  aliasText,
  fieldCatalog,
  values,
  manualValues,
  formulas,
  selectedCustomerId,
  selectedFieldTemplateId,
  selectedMappingInstanceId,
  setLoading,
  setSaving,
  setError,
  setMessage,
  setValidation,
  setActiveVersionId,
  setVersions,
  setMappingText,
  setAliasText,
  setFieldCatalog,
  setAutoValues,
  setValues,
  setManualValues,
  setFormulas,
}: UseMappingApiParams) {
  const suggestMappingFromHeaders = useCallback(
    async (excelHeaders: string[]) => {
      setError("");
      setMessage("");
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
          setError(t("mapping.aiSuggest.err.noPlaceholders"));
          return;
        }

        const normalizedHeaders = [...new Set(excelHeaders.map((h) => h.trim()).filter(Boolean))];
        if (normalizedHeaders.length === 0) {
          setError(t("mapping.aiSuggest.err.noHeaders"));
          return;
        }

        const res = await fetch("/api/report/mapping/suggest", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            excelHeaders: normalizedHeaders,
            wordPlaceholders: placeholders,
          }),
        });
        const data = (await res.json()) as MappingSuggestResponse;
        if (!data.ok || !data.suggestion) {
          throw new Error(data.error ?? t("mapping.aiSuggest.err.failed"));
        }

        const suggestion = data.suggestion;
        let matched = 0;
        const nextMappings = (mappingObj.mappings ?? []).map((item) => {
          const key = typeof item.template_field === "string" ? item.template_field.trim() : "";
          const header = key ? suggestion[key] : undefined;
          if (!header) return item;
          matched += 1;
          return {
            ...item,
            sources: [
              {
                source: "excel_ai",
                path: header,
                note: "AI suggestion",
              },
            ],
          };
        });

        setMappingText(
          JSON.stringify(
            {
              ...mappingObj,
              mappings: nextMappings,
            },
            null,
            2,
          ),
        );
        setMessage(t("mapping.aiSuggest.ok").replace("{count}", String(matched)));
      } catch (e) {
        setError(e instanceof Error ? e.message : t("mapping.aiSuggest.err.failed"));
      }
    },
    [mappingText, setError, setMappingText, setMessage, t],
  );

  const loadFieldValues = useCallback(async () => {
    const res = await fetch("/api/report/values", { cache: "no-store" });
    const data = (await res.json()) as ValuesResponse;
    if (!data.ok) {
      setError(data.error ?? t("mapping.err.loadData"));
      return;
    }
    setFieldCatalog(normalizeFieldCatalogForSchema(data.field_catalog ?? []));
    setAutoValues(data.auto_values ?? {});
    setValues(data.values ?? {});
    setManualValues(data.manual_values ?? {});
    setFormulas(data.field_formulas ?? {});
  }, [setAutoValues, setError, setFieldCatalog, setFormulas, setManualValues, setValues, t]);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");
    const query = selectedMappingInstanceId
      ? `?mapping_instance_id=${encodeURIComponent(selectedMappingInstanceId)}`
      : "";
    const res = await fetch(`/api/report/mapping${query}`, { cache: "no-store" });
    const data = (await res.json()) as MappingApiResponse;
    if (!data.ok) {
      setError(data.error ?? t("mapping.err.loadData"));
      setLoading(false);
      return;
    }
    setActiveVersionId(data.active_version_id ?? "");
    setVersions(data.versions ?? []);
    setMappingText(JSON.stringify(data.mapping ?? {}, null, 2));
    setAliasText(JSON.stringify(data.alias_map ?? {}, null, 2));
    await loadFieldValues();
    setLoading(false);
  }, [
    loadFieldValues,
    selectedMappingInstanceId,
    setActiveVersionId,
    setAliasText,
    setError,
    setLoading,
    setMappingText,
    setVersions,
    t,
  ]);

  const saveDraft = useCallback(async () => {
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const mapping = JSON.parse(mappingText);
      const alias_map = JSON.parse(aliasText) as Record<string, unknown>;
      const duplicates = getDuplicateAliasGroups(alias_map);
      const duplicateEntries = Object.entries(duplicates);
      if (duplicateEntries.length > 0) {
        const lines = duplicateEntries.map(
          ([norm, keys]) => `"${norm}": ${keys.map((k) => `"${k}"`).join(", ")}`,
        );
        const shouldContinue = window.confirm(
          "Cảnh báo: phát hiện alias trùng tên (sau chuẩn hóa).\n\n" +
            lines.join("\n") +
            "\n\nBạn vẫn muốn lưu dữ liệu?",
        );
        if (!shouldContinue) {
          setError("Đã hủy lưu dữ liệu do alias trùng tên.");
          setSaving(false);
          return;
        }
      }
      const normalizedCatalog = normalizeFieldCatalogForSchema(fieldCatalog);
      const res = await fetch("/api/report/mapping", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          created_by: "web-user",
          notes: "Saved from mapping editor",
          mapping,
          alias_map,
          field_catalog: normalizedCatalog,
          mapping_instance_id: selectedMappingInstanceId || undefined,
        }),
      });
      const data = (await res.json()) as MappingApiResponse;
      if (!data.ok) {
        throw new Error(data.error ?? t("mapping.err.saveDraft"));
      }

      if (selectedCustomerId && selectedFieldTemplateId) {
        await fetch("/api/report/master-templates", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            master_id: selectedFieldTemplateId,
            field_catalog: normalizedCatalog,
          }),
        });
      }

      await fetch("/api/report/values", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ manual_values: manualValues, field_formulas: formulas }),
      });

      const payloadValues = { ...values };
      const fieldTypeMap = new Map(fieldCatalog.map((f) => [f.field_key, f.type]));
      for (const [fieldKey, formula] of Object.entries(formulas)) {
        const fieldType = fieldTypeMap.get(fieldKey) ?? "text";
        const v = evaluateFieldFormula(formula, payloadValues, fieldType);
        if (v !== null) payloadValues[fieldKey] = v;
      }

      let msg = `${t("mapping.msg.savedDraft")}`;
      const customerRes = await fetch("/api/customers/from-draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ values: payloadValues }),
      });
      const customerData = (await customerRes.json()) as {
        ok?: boolean;
        error?: string;
        created?: boolean;
        message?: string;
      };
      if (customerData.ok) {
        msg += `. ${customerData.created ? t("mapping.msg.customerCreated") : t("mapping.msg.customerUpdated")}`;
      } else if (customerRes.status === 400) {
        msg += `. ${t("mapping.msg.customerSkippedNoName")}`;
      } else if (!customerData.ok) {
        msg += `. ${t("mapping.msg.customerSaveFailed")}: ${customerData.error ?? ""}`;
      }
      
      try {
        const validateRes = await fetch("/api/report/validate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            run_build: true,
            mapping_instance_id: selectedMappingInstanceId || undefined,
          }),
        });
        const validateData = (await validateRes.json()) as ValidationResponse;
        if (validateData.ok) {
          setValidation(validateData.validation);
          msg += ` - Đã tự động cập nhật & kiểm tra dữ liệu.`;
        }
      } catch {
        msg += `. Tự động kiểm tra dữ liệu thất bại.`;
      }

      setMessage(msg);
      await loadData();
    } catch (e) {
      setError(e instanceof Error ? e.message : t("mapping.err.invalidJson"));
    } finally {
      setSaving(false);
    }
  }, [
    aliasText,
    fieldCatalog,
    formulas,
    loadData,
    manualValues,
    mappingText,
    selectedCustomerId,
    selectedFieldTemplateId,
    selectedMappingInstanceId,
    setError,
    setMessage,
    setSaving,
    setValidation,
    t,
    values,
  ]);

  const getAutoProcessAssets = useCallback(async () => {
    const res = await fetch("/api/report/auto-process/assets", { cache: "no-store" });
    const data = (await res.json()) as AutoProcessAssetsResponse;
    if (!data.ok) {
      throw new Error(data.error ?? "Không thể tải danh sách file.");
    }
    return {
      excelFiles: data.excel_files ?? [],
      templateFiles: data.template_files ?? [],
    };
  }, []);

  const uploadAutoProcessFile = useCallback(async (file: File, kind: UploadKind): Promise<string> => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("kind", kind);
    const res = await fetch("/api/report/auto-process/upload", {
      method: "POST",
      body: formData,
    });
    const data = (await res.json()) as AutoProcessUploadResponse;
    if (!data.ok || !data.path) {
      throw new Error(data.error ?? "Upload file thất bại.");
    }
    return data.path;
  }, []);

  const runSmartAutoBatch = useCallback(
    async (input: SmartAutoBatchInput) => {
      setError("");
      setMessage("");
      const startRes = await fetch("/api/report/auto-process/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          excel_path: input.excelPath,
          template_path: input.templatePath,
          job_type: input.jobType,
        }),
      });
      const startData = (await startRes.json()) as AutoProcessJobResponse;
      if (!startData.ok || !startData.job) {
        throw new Error(startData.error ?? "Không thể khởi tạo Auto-Process.");
      }
      input.onProgress?.(startData.job);

      const runRes = await fetch("/api/report/auto-process/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          job_id: startData.job.job_id,
          root_key: input.rootKeyOverride,
        }),
      });
      const runData = (await runRes.json()) as AutoProcessJobResponse;
      if (!runData.ok || !runData.job) {
        throw new Error(runData.error ?? "Không thể chạy Auto-Batch.");
      }

      let latest = runData.job;
      input.onProgress?.(latest);
      while (latest.phase === "running" || latest.phase === "analyzing") {
        await new Promise((resolve) => setTimeout(resolve, 800));
        const pollRes = await fetch(`/api/report/auto-process/jobs/${encodeURIComponent(latest.job_id)}`, {
          cache: "no-store",
        });
        const pollData = (await pollRes.json()) as AutoProcessJobResponse;
        if (!pollData.ok || !pollData.job) {
          throw new Error(pollData.error ?? "Không thể theo dõi tiến trình batch.");
        }
        latest = pollData.job;
        input.onProgress?.(latest);
      }

      if (latest.phase !== "completed") {
        throw new Error(latest.error ?? "Batch chưa hoàn tất.");
      }
      return latest;
    },
    [setError, setMessage],
  );

  const openAutoProcessOutputFolder = useCallback(async (jobId: string) => {
    const res = await fetch("/api/report/auto-process/open-output", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ job_id: jobId }),
    });
    const data = (await res.json()) as { ok: boolean; error?: string };
    if (!data.ok) {
      throw new Error(data.error ?? "Không thể mở thư mục kết quả.");
    }
  }, []);

  return {
    loadData,
    loadFieldValues,
    saveDraft,
    suggestMappingFromHeaders,
    getAutoProcessAssets,
    uploadAutoProcessFile,
    runSmartAutoBatch,
    openAutoProcessOutputFolder,
  };
}
