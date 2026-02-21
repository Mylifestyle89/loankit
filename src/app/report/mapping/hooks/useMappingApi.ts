import { useCallback } from "react";
import type { Dispatch, SetStateAction } from "react";
import type { FieldCatalogItem } from "@/lib/report/config-schema";
import type { MappingApiResponse, ValidationResponse, ValuesResponse } from "../types";

type UseMappingApiParams = {
  t: (key: string) => string;
  mappingText: string;
  aliasText: string;
  fieldCatalog: FieldCatalogItem[];
  values: Record<string, unknown>;
  selectedCustomerId: string;
  selectedFieldTemplateId: string;
  setLoading: Dispatch<SetStateAction<boolean>>;
  setSaving: Dispatch<SetStateAction<boolean>>;
  setPublishing: Dispatch<SetStateAction<boolean>>;
  setValidating: Dispatch<SetStateAction<boolean>>;
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
};

export function useMappingApi({
  t,
  mappingText,
  aliasText,
  fieldCatalog,
  values,
  selectedCustomerId,
  selectedFieldTemplateId,
  setLoading,
  setSaving,
  setPublishing,
  setValidating,
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
}: UseMappingApiParams) {
  const loadFieldValues = useCallback(async () => {
    const res = await fetch("/api/report/values", { cache: "no-store" });
    const data = (await res.json()) as ValuesResponse;
    if (!data.ok) {
      setError(data.error ?? t("mapping.err.loadData"));
      return;
    }
    setFieldCatalog(data.field_catalog ?? []);
    setAutoValues(data.auto_values ?? {});
    setValues(data.values ?? {});
    setManualValues(data.manual_values ?? {});
  }, [setAutoValues, setError, setFieldCatalog, setManualValues, setValues, t]);

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
      const alias_map = JSON.parse(aliasText);
      const res = await fetch("/api/report/mapping", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          created_by: "web-user",
          notes: "Saved from mapping editor",
          mapping,
          alias_map,
          field_catalog: fieldCatalog,
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
            field_catalog: fieldCatalog,
          }),
        });
      }

      let msg = `${t("mapping.msg.savedDraft")} ${data.active_version_id}`;
      const customerRes = await fetch("/api/customers/from-draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ values }),
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
    loadData,
    mappingText,
    selectedCustomerId,
    selectedFieldTemplateId,
    setError,
    setMessage,
    setSaving,
    t,
    values,
  ]);

  const publishActive = useCallback(
    async (activeVersionId: string) => {
      if (!activeVersionId) {
        return;
      }
      setPublishing(true);
      setError("");
      setMessage("");
      const res = await fetch("/api/report/mapping", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "publish", version_id: activeVersionId }),
      });
      const data = (await res.json()) as MappingApiResponse;
      if (!data.ok) {
        setError(data.error ?? t("mapping.err.publish"));
        setPublishing(false);
        return;
      }
      setMessage(`${t("mapping.msg.published")} ${activeVersionId}`);
      await loadData();
      setPublishing(false);
    },
    [loadData, setError, setMessage, setPublishing, t],
  );

  const runValidate = useCallback(async () => {
    setValidating(true);
    setError("");
    const res = await fetch("/api/report/validate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ run_build: true }),
    });
    const data = (await res.json()) as ValidationResponse;
    if (!data.ok) {
      setError(data.error ?? t("mapping.err.validate"));
    } else {
      setValidation(data.validation);
      setMessage(t("mapping.msg.validated"));
    }
    await loadFieldValues();
    setValidating(false);
  }, [loadFieldValues, setError, setMessage, setValidation, setValidating, t]);

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
    publishActive,
    runValidate,
    exportAndOpenDocx,
  };
}
