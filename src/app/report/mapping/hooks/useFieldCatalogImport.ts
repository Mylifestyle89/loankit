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

export function useFieldCatalogImport({
  t,
  fieldCatalog,
  setFieldCatalog,
  setImportingCatalog,
  setError,
  setMessage,
}: UseFieldCatalogImportParams) {
  async function importFromCsv(file: File) {
    setImportingCatalog(true);
    setError("");
    try {
      const text = await file.text();
      const lines = text
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter((l) => l.length > 0);
      if (lines.length < 2) {
        setError(t("mapping.import.err.noData"));
        return;
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
        setError(t("mapping.import.err.header"));
        return;
      }

      const existingKeys = fieldCatalog.map((f) => f.field_key);
      const imported: FieldCatalogItem[] = [];

      for (let i = 1; i < lines.length; i += 1) {
        const cols = lines[i].split(delimiter).map((c) => c.trim());
        const label_vi = cols[idxName] ?? "";
        const group = cols[idxGroup] ?? "";
        const rawType = cols[idxType] ?? "";
        if (!label_vi || !group || !rawType) continue;

        const type = normalizeImportedType(rawType);
        if (!type) continue;

        if (fieldCatalog.some((f) => f.group === group && f.label_vi === label_vi)) {
          continue;
        }

        const field_key = buildInternalFieldKey({
          group,
          labelVi: label_vi,
          existingKeys,
        });
        existingKeys.push(field_key);

        imported.push({
          field_key,
          label_vi,
          group,
          type,
          required: false,
          normalizer: "",
          examples: [],
        });
      }

      if (imported.length === 0) {
        setError(t("mapping.import.err.noRows"));
        return;
      }

      setFieldCatalog((prev) => [...prev, ...imported]);
      setMessage(t("mapping.import.ok").replace("{count}", String(imported.length)));
    } catch (e) {
      setError(e instanceof Error ? e.message : t("mapping.import.err.generic"));
    } finally {
      setImportingCatalog(false);
    }
  }

  async function importFromXlsx(file: File) {
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

      const existingKeys = fieldCatalog.map((f) => f.field_key);
      const imported: FieldCatalogItem[] = [];

      for (const row of rows) {
        const label_vi =
          (row["Tên field"] as string) ||
          (row["ten field"] as string) ||
          (row["Label"] as string) ||
          (row["label_vi"] as string) ||
          "";
        const group = (row["Nhóm"] as string) || (row["nhom"] as string) || (row["group"] as string) || "";
        const rawType = (row["Loại"] as string) || (row["loai"] as string) || (row["type"] as string) || "";
        if (!label_vi || !group || !rawType) continue;

        const type = normalizeImportedType(String(rawType));
        if (!type) continue;

        if (fieldCatalog.some((f) => f.group === group && f.label_vi === label_vi)) {
          continue;
        }

        const field_key = buildInternalFieldKey({
          group,
          labelVi: label_vi,
          existingKeys,
        });
        existingKeys.push(field_key);

        imported.push({
          field_key,
          label_vi,
          group,
          type,
          required: false,
          normalizer: "",
          examples: [],
        });
      }

      if (imported.length === 0) {
        setError(t("mapping.import.err.noRows"));
        return;
      }

      setFieldCatalog((prev) => [...prev, ...imported]);
      setMessage(t("mapping.import.ok").replace("{count}", String(imported.length)));
    } catch (e) {
      setError(e instanceof Error ? e.message : t("mapping.import.err.generic"));
    } finally {
      setImportingCatalog(false);
    }
  }

  function handleImportFieldFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    const name = file.name.toLowerCase();
    if (name.endsWith(".csv")) {
      void importFromCsv(file);
    } else if (name.endsWith(".xlsx") || name.endsWith(".xls")) {
      void importFromXlsx(file);
    } else {
      setError(t("mapping.import.err.unsupported"));
    }
  }

  return {
    handleImportFieldFile,
  };
}
