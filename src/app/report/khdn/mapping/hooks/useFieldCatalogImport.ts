import * as XLSX from "xlsx";
import type { ChangeEvent } from "react";
import type { FieldCatalogItem } from "@/lib/report/config-schema";
import { buildInternalFieldKey } from "../helpers";
import {
  parseCsvImportRows,
  parseXlsxImportRows,
  processImportRows,
  type ImportMode,
  type MissingGroupDecision,
} from "@/core/use-cases/mapping-engine";
import { validateFileSize } from "@/lib/report/upload-limits";
import { useMappingDataStore } from "../stores/use-mapping-data-store";
import { useUiStore } from "../stores/use-ui-store";

type UseFieldCatalogImportParams = {
  t: (key: string) => string;
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

type ParseResult =
  | ReturnType<typeof parseCsvImportRows>
  | ReturnType<typeof parseXlsxImportRows>;

export function useFieldCatalogImport({
  t,
  onMissingGroupPrompt,
  onCreateTemplateFromImport,
}: UseFieldCatalogImportParams) {
  /** Core: runs processImportRows after raw parsing. Shared by CSV and XLSX paths. */
  async function executeImport(parsedRows: ParseResult, mode: ImportMode, templateName?: string | null) {
    const { fieldCatalog, setFieldCatalog } = useMappingDataStore.getState();
    const { setStatus } = useUiStore.getState();

    if (!parsedRows.ok) {
      setStatus({ error: parsedRows.error.message });
      return;
    }

    const result = await processImportRows({
      currentCatalog: fieldCatalog,
      rows: parsedRows.data,
      mode,
      resolveMissingGroup: async (payload) => {
        if (onMissingGroupPrompt) return onMissingGroupPrompt(payload);
        const title = payload.level === "parent" ? "group cha" : "subgroup";
        return window.confirm(
          `Dòng ${payload.rowNumber}: ${title} "${payload.missingPath}" chưa tồn tại.\n` +
            "Bạn có muốn tạo mới để tiếp tục import không?",
        )
          ? "create_once"
          : "stop";
      },
      buildFieldKey: (args) => buildInternalFieldKey(args),
    });

    if (!result.ok) {
      setStatus({ error: result.error.message });
      return;
    }

    if (mode === "append") {
      const nextName = (templateName ?? "").trim();
      if (!nextName) return setStatus({ error: t("mapping.import.err.templateNameRequired") });
      if (!onCreateTemplateFromImport) return setStatus({ error: t("mapping.import.err.generic") });
      await onCreateTemplateFromImport({ templateName: nextName, fieldCatalog: result.data.nextCatalog });
      setStatus({
        message: t("mapping.import.okCreateTemplate")
          .replace("{name}", nextName)
          .replace("{count}", String(result.data.importedCount)),
      });
      return;
    }

    setFieldCatalog(result.data.nextCatalog);
    setStatus({
      message: t("mapping.import.okOverwrite")
        .replace("{newCount}", String(result.data.importedCount))
        .replace("{overwriteCount}", String(result.data.overwrittenCount)),
    });
  }

  /** Dispatches by file type; applies client-side size guard, wraps loading state and error boundary. */
  async function handleImportFieldFile(e: ChangeEvent<HTMLInputElement>, options?: ImportRequestOptions) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Client-side size guard — mirrors the server-side limit from upload-limits.ts
    try {
      validateFileSize(file, "generic_data");
    } catch (err) {
      useUiStore.getState().setStatus({ error: err instanceof Error ? err.message : t("mapping.import.err.generic") });
      return;
    }

    const { setStatus, setModals } = useUiStore.getState();
    const mode = options?.mode ?? "append";
    const templateName = options?.templateName ?? "";
    const name = file.name.toLowerCase();

    setModals({ importingCatalog: true });
    setStatus({ error: "" });
    e.target.value = "";

    try {
      if (name.endsWith(".csv")) {
        const text = await file.text();
        await executeImport(parseCsvImportRows(text), mode, templateName);
      } else if (name.endsWith(".xlsx") || name.endsWith(".xls")) {
        const buffer = await file.arrayBuffer();
        const workbook = XLSX.read(buffer, { type: "array" });
        const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(
          workbook.Sheets[workbook.SheetNames[0]],
          { defval: "" },
        );
        await executeImport(parseXlsxImportRows(rows), mode, templateName);
      } else {
        setStatus({ error: t("mapping.import.err.unsupported") });
      }
    } catch (error) {
      setStatus({ error: error instanceof Error ? error.message : t("mapping.import.err.generic") });
    } finally {
      useUiStore.getState().setModals({ importingCatalog: false });
    }
  }

  return { handleImportFieldFile };
}
