import * as XLSX from "xlsx";
import type { ChangeEvent, Dispatch, SetStateAction } from "react";
import type { FieldCatalogItem } from "@/lib/report/config-schema";
import { buildInternalFieldKey } from "../helpers";
import {
  parseCsvImportRows,
  parseXlsxImportRows,
  processImportRows,
  type ImportMode,
  type MissingGroupDecision,
} from "@/core/use-cases/mapping-engine";

type UseFieldCatalogImportParams = {
  t: (key: string) => string;
  fieldCatalog: FieldCatalogItem[];
  setFieldCatalog: Dispatch<SetStateAction<FieldCatalogItem[]>>;
  setImportingCatalog: Dispatch<SetStateAction<boolean>>;
  setError: Dispatch<SetStateAction<string>>;
  setMessage: Dispatch<SetStateAction<string>>;
  onMissingGroupPrompt?: (args: {
    rowNumber: number;
    missingPath: string;
    level: "parent" | "subgroup";
  }) => Promise<MissingGroupDecision>;
  onCreateTemplateFromImport?: (args: { templateName: string; fieldCatalog: FieldCatalogItem[] }) => Promise<void>;
};

type ImportRequestOptions = {
  mode?: ImportMode;
  templateName?: string | null;
};

export function useFieldCatalogImport({
  t,
  fieldCatalog,
  setFieldCatalog,
  setImportingCatalog,
  setError,
  setMessage,
  onMissingGroupPrompt,
  onCreateTemplateFromImport,
}: UseFieldCatalogImportParams) {
  async function importFromCsv(file: File, mode: ImportMode, templateName?: string | null) {
    setImportingCatalog(true);
    setError("");
    try {
      const text = await file.text();
      const parsed = parseCsvImportRows(text);
      if (!parsed.ok) {
        setError(parsed.error.message);
        return;
      }
      const result = await processImportRows({
        currentCatalog: fieldCatalog,
        rows: parsed.data,
        mode,
        resolveMissingGroup: async (payload) => {
          if (onMissingGroupPrompt) return onMissingGroupPrompt(payload);
          const title = payload.level === "parent" ? "group cha" : "subgroup";
          const confirmCreate = window.confirm(
            `Dòng ${payload.rowNumber}: ${title} "${payload.missingPath}" chưa tồn tại.\n` +
              "Bạn có muốn tạo mới để tiếp tục import không?",
          );
          return confirmCreate ? "create_once" : "stop";
        },
        buildFieldKey: ({ group, labelVi, existingKeys }) =>
          buildInternalFieldKey({
            group,
            labelVi,
            existingKeys,
          }),
      });
      if (!result.ok) {
        setError(result.error.message);
        return;
      }
      if (mode === "append") {
        const nextName = (templateName ?? "").trim();
        if (!nextName) {
          setError(t("mapping.import.err.templateNameRequired"));
          return;
        }
        if (!onCreateTemplateFromImport) {
          setError(t("mapping.import.err.generic"));
          return;
        }
        await onCreateTemplateFromImport({
          templateName: nextName,
          fieldCatalog: result.data.nextCatalog,
        });
        setMessage(
          t("mapping.import.okCreateTemplate")
            .replace("{name}", nextName)
            .replace("{count}", String(result.data.importedCount)),
        );
        return;
      }
      setFieldCatalog(result.data.nextCatalog);
      setMessage(
        t("mapping.import.okOverwrite")
          .replace("{newCount}", String(result.data.importedCount))
          .replace("{overwriteCount}", String(result.data.overwrittenCount)),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : t("mapping.import.err.generic"));
    } finally {
      setImportingCatalog(false);
    }
  }

  async function importFromXlsx(file: File, mode: ImportMode, templateName?: string | null) {
    setImportingCatalog(true);
    setError("");
    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array" });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });
      const parsed = parseXlsxImportRows(rows);
      if (!parsed.ok) {
        setError(parsed.error.message);
        return;
      }
      const result = await processImportRows({
        currentCatalog: fieldCatalog,
        rows: parsed.data,
        mode,
        resolveMissingGroup: async (payload) => {
          if (onMissingGroupPrompt) return onMissingGroupPrompt(payload);
          const title = payload.level === "parent" ? "group cha" : "subgroup";
          const confirmCreate = window.confirm(
            `Dòng ${payload.rowNumber}: ${title} "${payload.missingPath}" chưa tồn tại.\n` +
              "Bạn có muốn tạo mới để tiếp tục import không?",
          );
          return confirmCreate ? "create_once" : "stop";
        },
        buildFieldKey: ({ group, labelVi, existingKeys }) =>
          buildInternalFieldKey({
            group,
            labelVi,
            existingKeys,
          }),
      });
      if (!result.ok) {
        setError(result.error.message);
        return;
      }
      if (mode === "append") {
        const nextName = (templateName ?? "").trim();
        if (!nextName) {
          setError(t("mapping.import.err.templateNameRequired"));
          return;
        }
        if (!onCreateTemplateFromImport) {
          setError(t("mapping.import.err.generic"));
          return;
        }
        await onCreateTemplateFromImport({
          templateName: nextName,
          fieldCatalog: result.data.nextCatalog,
        });
        setMessage(
          t("mapping.import.okCreateTemplate")
            .replace("{name}", nextName)
            .replace("{count}", String(result.data.importedCount)),
        );
        return;
      }
      setFieldCatalog(result.data.nextCatalog);
      setMessage(
        t("mapping.import.okOverwrite")
          .replace("{newCount}", String(result.data.importedCount))
          .replace("{overwriteCount}", String(result.data.overwrittenCount)),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : t("mapping.import.err.generic"));
    } finally {
      setImportingCatalog(false);
    }
  }

  function handleImportFieldFile(e: ChangeEvent<HTMLInputElement>, options?: ImportRequestOptions) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    const mode = options?.mode ?? "append";
    const templateName = options?.templateName ?? "";
    const name = file.name.toLowerCase();
    if (name.endsWith(".csv")) {
      void importFromCsv(file, mode, templateName);
    } else if (name.endsWith(".xlsx") || name.endsWith(".xls")) {
      void importFromXlsx(file, mode, templateName);
    } else {
      setError(t("mapping.import.err.unsupported"));
    }
  }

  return {
    handleImportFieldFile,
  };
}
