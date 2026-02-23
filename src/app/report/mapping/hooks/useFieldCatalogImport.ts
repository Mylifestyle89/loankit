import * as XLSX from "xlsx";
import type { ChangeEvent, Dispatch, SetStateAction } from "react";
import type { FieldCatalogItem } from "@/lib/report/config-schema";
import { buildInternalFieldKey } from "../helpers";

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
  }) => Promise<"create_once" | "create_all" | "stop">;
  onCreateTemplateFromImport?: (args: { templateName: string; fieldCatalog: FieldCatalogItem[] }) => Promise<void>;
};

type ImportRow = {
  label_vi: string;
  group: string;
  rawType: string;
  rowNumber: number;
};

type ImportMode = "append" | "overwrite";
type ImportRequestOptions = {
  mode?: ImportMode;
  templateName?: string | null;
};

function normalizeImportedType(raw: string): FieldCatalogItem["type"] | null {
  const v = raw.trim().toLowerCase();
  if (!v) return null;
  if (["string", "chuỗi", "chuoi", "text", "chuoi ky tu"].includes(v)) return "text";
  if (["number", "số", "so", "numeric", "int", "float"].includes(v)) return "number";
  if (["percent", "phần trăm", "phan tram", "%", "ty le"].includes(v)) return "percent";
  if (["date", "ngày", "ngay", "ngay thang", "datetime"].includes(v)) return "date";
  if (["table", "bảng", "bang", "noi dung dai"].includes(v)) return "table";
  return null;
}

function normalizeGroupPath(raw: string): string {
  return raw
    .split("/")
    .map((part) => part.trim())
    .filter(Boolean)
    .join("/");
}

function collectKnownGroupPaths(catalog: FieldCatalogItem[]): Set<string> {
  const known = new Set<string>();
  for (const field of catalog) {
    const normalized = normalizeGroupPath(field.group ?? "");
    if (!normalized) continue;
    const parts = normalized.split("/");
    for (let i = 1; i <= parts.length; i += 1) {
      known.add(parts.slice(0, i).join("/"));
    }
  }
  return known;
}

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
  function parseCsvRows(fileText: string): ImportRow[] {
    const lines = fileText
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l.length > 0);
    if (lines.length < 2) {
      throw new Error(t("mapping.import.err.noData"));
    }
    const headerLine = lines[0];
    const commaParts = headerLine.split(",").length;
    const semicolonParts = headerLine.split(";").length;
    const delimiter = semicolonParts > 1 && semicolonParts >= commaParts ? ";" : ",";
    const header = headerLine.split(delimiter).map((h) => h.trim().toLowerCase());
    const idxName = header.findIndex((h) => h === "tên field" || h === "ten field" || h === "label" || h === "label_vi");
    const idxGroup = header.findIndex((h) => h === "nhóm" || h === "nhom" || h === "group");
    const idxType = header.findIndex((h) => h === "loại" || h === "loai" || h === "type");
    if (idxName === -1 || idxGroup === -1 || idxType === -1) {
      throw new Error(t("mapping.import.err.header"));
    }
    const rows: ImportRow[] = [];
    for (let i = 1; i < lines.length; i += 1) {
      const cols = lines[i].split(delimiter).map((c) => c.trim());
      rows.push({
        label_vi: cols[idxName] ?? "",
        group: cols[idxGroup] ?? "",
        rawType: cols[idxType] ?? "",
        rowNumber: i + 1,
      });
    }
    return rows;
  }

  function parseXlsxRows(rowsRaw: Record<string, unknown>[]): ImportRow[] {
    return rowsRaw.map((row, idx) => ({
      label_vi:
        (row["Tên field"] as string) ||
        (row["ten field"] as string) ||
        (row["Label"] as string) ||
        (row["label_vi"] as string) ||
        "",
      group: (row["Nhóm"] as string) || (row["nhom"] as string) || (row["group"] as string) || "",
      rawType: (row["Loại"] as string) || (row["loai"] as string) || (row["type"] as string) || "",
      rowNumber: idx + 2,
    }));
  }

  async function ensureGroupExistsWithPrompt(
    row: ImportRow,
    normalizedGroupPath: string,
    knownGroupPaths: Set<string>,
    skipFurtherPromptsRef: { value: boolean },
  ): Promise<boolean> {
    const segments = normalizedGroupPath.split("/").filter(Boolean);
    if (segments.length === 0) return false;

    for (let depth = 1; depth <= segments.length; depth += 1) {
      const pathAtDepth = segments.slice(0, depth).join("/");
      if (knownGroupPaths.has(pathAtDepth)) continue;
      const isParent = depth === 1;
      const title = isParent ? "group cha" : "subgroup";
      let decision: "create_once" | "create_all" | "stop" = "create_once";
      if (!skipFurtherPromptsRef.value) {
        if (onMissingGroupPrompt) {
          decision = await onMissingGroupPrompt({
            rowNumber: row.rowNumber,
            missingPath: pathAtDepth,
            level: isParent ? "parent" : "subgroup",
          });
        } else {
          const confirmCreate = window.confirm(
            `Dòng ${row.rowNumber}: ${title} "${pathAtDepth}" chưa tồn tại.\n` +
              `Bạn có muốn tạo mới để tiếp tục import không?`,
          );
          decision = confirmCreate ? "create_once" : "stop";
        }
      }
      if (decision === "stop") {
        setError(`Đã dừng import tại dòng ${row.rowNumber} vì chưa tạo ${title} "${pathAtDepth}".`);
        return false;
      }
      if (decision === "create_all") {
        skipFurtherPromptsRef.value = true;
      }
      knownGroupPaths.add(pathAtDepth);
    }
    return true;
  }

  async function importRowsInOrder(rows: ImportRow[], mode: ImportMode, templateName?: string | null) {
    const nextCatalog = [...fieldCatalog];
    const existingKeys = nextCatalog.map((f) => f.field_key);
    const imported: FieldCatalogItem[] = [];
    const overwritten: string[] = [];
    const knownGroupPaths = collectKnownGroupPaths(nextCatalog);
    const skipFurtherPromptsRef = { value: false };
    const existingFieldIdentity = new Map<string, number>();
    nextCatalog.forEach((f, index) => {
      existingFieldIdentity.set(
        `${normalizeGroupPath(f.group ?? "").toLowerCase()}|${(f.label_vi ?? "").toLowerCase()}`,
        index,
      );
    });

    for (const row of rows) {
      const label_vi = String(row.label_vi ?? "").trim();
      const group = normalizeGroupPath(String(row.group ?? ""));
      const rawType = String(row.rawType ?? "").trim();
      if (!label_vi || !group || !rawType) continue;

      const type = normalizeImportedType(rawType);
      if (!type) continue;

      if (!(await ensureGroupExistsWithPrompt(row, group, knownGroupPaths, skipFurtherPromptsRef))) {
        return;
      }

      const identityKey = `${group.toLowerCase()}|${label_vi.toLowerCase()}`;
      const existingIndex = existingFieldIdentity.get(identityKey);
      if (existingIndex != null) {
        if (mode === "overwrite") {
          const prev = nextCatalog[existingIndex];
          nextCatalog[existingIndex] = {
            ...prev,
            label_vi,
            group,
            type,
          };
          overwritten.push(label_vi);
        }
        continue;
      }

      const field_key = buildInternalFieldKey({
        group,
        labelVi: label_vi,
        existingKeys,
      });
      existingKeys.push(field_key);

      const newItem: FieldCatalogItem = {
        field_key,
        label_vi,
        group,
        type,
        required: false,
        normalizer: "",
        examples: [],
      };
      imported.push(newItem);
      nextCatalog.push(newItem);
      existingFieldIdentity.set(identityKey, nextCatalog.length - 1);
    }

    if (imported.length === 0 && overwritten.length === 0) {
      setError(t("mapping.import.err.noRows"));
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
        fieldCatalog: nextCatalog,
      });
      setMessage(
        t("mapping.import.okCreateTemplate")
          .replace("{name}", nextName)
          .replace("{count}", String(imported.length)),
      );
      return;
    }

    // Keep spreadsheet order for new rows; overwrite updates are in place.
    setFieldCatalog(nextCatalog);
    if (mode === "overwrite") {
      setMessage(
        t("mapping.import.okOverwrite")
          .replace("{newCount}", String(imported.length))
          .replace("{overwriteCount}", String(overwritten.length)),
      );
      return;
    }
    setMessage(t("mapping.import.ok").replace("{count}", String(imported.length)));
  }

  async function importFromCsv(file: File, mode: ImportMode, templateName?: string | null) {
    setImportingCatalog(true);
    setError("");
    try {
      const text = await file.text();
      const rows = parseCsvRows(text);
      await importRowsInOrder(rows, mode, templateName);
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
      if (rows.length === 0) {
        setError(t("mapping.import.err.noData"));
        return;
      }
      await importRowsInOrder(parseXlsxRows(rows), mode, templateName);
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
