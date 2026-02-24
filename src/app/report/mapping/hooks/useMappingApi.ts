import { useCallback } from "react";
import type { Dispatch, SetStateAction } from "react";
import type { FieldCatalogItem } from "@/lib/report/config-schema";
import { getDuplicateAliasGroups } from "@/lib/report/alias-utils";
import { evaluateFieldFormula } from "@/lib/report/field-calc";
import type { MappingApiResponse, ValidationResponse, ValuesResponse } from "../types";
import { normalizeFieldCatalogForSchema } from "../helpers";

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
  setLoading: Dispatch<SetStateAction<boolean>>;
  setSaving: Dispatch<SetStateAction<boolean>>;
  setExportingDocx: Dispatch<SetStateAction<boolean>>;
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
  setLastExportedDocxPath: Dispatch<SetStateAction<string>>;
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
  setLoading,
  setSaving,
  setExportingDocx,
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
  setLastExportedDocxPath,
  setFormulas,
}: UseMappingApiParams) {
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
    const res = await fetch("/api/report/mapping", { cache: "no-store" });
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
  }, [loadFieldValues, setActiveVersionId, setAliasText, setError, setLoading, setMappingText, setVersions, t]);

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
        }),
      });
      const data = (await res.json()) as MappingApiResponse;
      if (!data.ok) {
        throw new Error(data.error ?? t("mapping.err.saveDraft"));
      }

      if (selectedCustomerId && selectedFieldTemplateId) {
        await fetch("/api/report/field-templates", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            template_id: selectedFieldTemplateId,
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
          body: JSON.stringify({ run_build: true }),
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
    setError,
    setMessage,
    setSaving,
    setValidation,
    t,
    values,
  ]);

  const exportAndOpenDocx = useCallback(async () => {
    setExportingDocx(true);
    setError("");
    setMessage("");
    const timestamp = Date.now();
    const outputPath = `report_assets/report_preview_editor_${timestamp}.docx`;
    const reportPath = `report_assets/template_export_report_editor_${timestamp}.json`;
    const res = await fetch("/api/report/export", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        output_path: outputPath,
        report_path: reportPath,
      }),
    });
    const data = (await res.json()) as { ok: boolean; error?: string; output_path?: string };
    if (!data.ok) {
      setError(data.error ?? t("mapping.err.exportDocx"));
      setExportingDocx(false);
      return;
    }
    const filePath = data.output_path ?? outputPath;
    setLastExportedDocxPath(filePath);
    setMessage(t("mapping.msg.exportDocxDone"));
    const openUrl = `/api/report/file?path=${encodeURIComponent(filePath)}&download=0&ts=${Date.now()}`;
    window.open(openUrl, "_blank", "noopener,noreferrer");
    setExportingDocx(false);
  }, [setError, setExportingDocx, setLastExportedDocxPath, setMessage, t]);

  return {
    loadData,
    loadFieldValues,
    saveDraft,
    exportAndOpenDocx,
  };
}
