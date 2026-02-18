"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as XLSX from "xlsx";
import { Plus, Pencil, X, RotateCcw, Upload, Download, Save, Send, CheckCircle, FileText, Users } from "lucide-react";

import { useLanguage } from "@/components/language-provider";
import type { FieldCatalogItem } from "@/lib/report/config-schema";

type MappingApiResponse = {
  ok: boolean;
  error?: string;
  active_version_id?: string;
  versions?: Array<{ id: string; status: "draft" | "published"; created_at: string; notes?: string }>;
  mapping?: unknown;
  alias_map?: unknown;
};

type ValidationResponse = {
  ok: boolean;
  error?: string;
  validation?: {
    is_valid?: boolean;
    errors_count?: number;
    warnings_count?: number;
    errors?: unknown[];
    warnings?: unknown[];
  };
};

type ValuesResponse = {
  ok: boolean;
  error?: string;
  field_catalog?: FieldCatalogItem[];
  auto_values?: Record<string, unknown>;
  values?: Record<string, unknown>;
  manual_values?: Record<string, string | number | boolean | null>;
};

function removeVietnameseTones(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D");
}

function slugifyBusinessText(text: string): string {
  return removeVietnameseTones(text)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .replace(/__+/g, "_");
}

function toInternalType(type: "string" | "number" | "percent" | "date" | "table"): FieldCatalogItem["type"] {
  if (type === "string") {
    return "text";
  }
  return type;
}

function toBusinessType(type: FieldCatalogItem["type"]): "string" | "number" | "percent" | "date" | "table" {
  if (type === "text") {
    return "string";
  }
  return type;
}

function typeLabelKey(type: "string" | "number" | "percent" | "date" | "table"): string {
  return `mapping.typeLabel.${type}`;
}

function buildInternalFieldKey(params: {
  group: string;
  labelVi: string;
  existingKeys: string[];
}): string {
  const groupSlug = slugifyBusinessText(params.group) || "nhom";
  const fieldSlug = slugifyBusinessText(params.labelVi) || "truong";
  const base = `custom.${groupSlug}.${fieldSlug}`;
  if (!params.existingKeys.includes(base)) {
    return base;
  }
  let i = 2;
  while (params.existingKeys.includes(`${base}_${i}`)) {
    i += 1;
  }
  return `${base}_${i}`;
}

function normalizeInputByType(input: string, type: FieldCatalogItem["type"]): string | number {
  if (type !== "number" && type !== "percent") {
    return input;
  }
  const cleaned = input.replaceAll("%", "").replaceAll(".", "").replaceAll(",", ".").trim();
  if (cleaned === "") {
    return "";
  }
  const parsed = Number(cleaned);
  return Number.isNaN(parsed) ? input : parsed;
}

function parseNumericLikeValue(raw: unknown): number | null {
  if (raw === null || raw === undefined) {
    return null;
  }
  if (typeof raw === "number" && Number.isFinite(raw)) {
    return raw;
  }
  if (typeof raw !== "string") {
    return null;
  }
  const cleaned = raw.replaceAll(".", "").replaceAll(",", ".").trim();
  if (cleaned === "") {
    return null;
  }
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : null;
}

function formatNumberVnDisplay(raw: unknown): string {
  const parsed = parseNumericLikeValue(raw);
  if (parsed === null) {
    return raw === null || raw === undefined ? "" : String(raw);
  }
  const isInteger = Number.isInteger(parsed);
  return parsed.toLocaleString("vi-VN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: isInteger ? 0 : 6,
  });
}

function formatPercentVnDisplay(raw: unknown): string {
  const parsed = parseNumericLikeValue(raw);
  if (parsed === null) {
    return raw === null || raw === undefined ? "" : String(raw);
  }
  const fixed = Number(parsed.toFixed(2));
  return `${fixed.toLocaleString("vi-VN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}%`;
}

function toDateInputValue(raw: unknown): string {
  if (raw === null || raw === undefined) {
    return "";
  }
  const text = String(raw).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    return text;
  }
  const parts = text.split("/");
  if (parts.length === 3) {
    const [dd, mm, yyyy] = parts;
    if (yyyy && mm && dd) {
      return `${yyyy.padStart(4, "0")}-${mm.padStart(2, "0")}-${dd.padStart(2, "0")}`;
    }
  }
  return "";
}

export default function MappingPage() {
  const { t } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [validating, setValidating] = useState(false);
  const [message, setMessage] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [activeVersionId, setActiveVersionId] = useState<string>("");
  const [versions, setVersions] = useState<MappingApiResponse["versions"]>([]);
  const [mappingText, setMappingText] = useState("");
  const [aliasText, setAliasText] = useState("");
  const [validation, setValidation] = useState<ValidationResponse["validation"]>();
  const [fieldCatalog, setFieldCatalog] = useState<FieldCatalogItem[]>([]);
  const [autoValues, setAutoValues] = useState<Record<string, unknown>>({});
  const [values, setValues] = useState<Record<string, unknown>>({});
  const [manualValues, setManualValues] = useState<Record<string, string | number | boolean | null>>({});
  const [exportingDocx, setExportingDocx] = useState(false);
  const [activeTab, setActiveTab] = useState<"visual" | "advanced">("visual");
  const [searchTerm, setSearchTerm] = useState("");
  const [showTechnicalKeys, setShowTechnicalKeys] = useState(false);
  const [lastExportedDocxPath, setLastExportedDocxPath] = useState<string>("");
  const [selectedGroup, setSelectedGroup] = useState<string>("");
  const [newField, setNewField] = useState<{
    label_vi: string;
    group: string;
    type: "string" | "number" | "percent" | "date" | "table";
  }>({
    label_vi: "",
    group: "Nhóm mới",
    type: "string",
  });
  const importInputRef = useRef<HTMLInputElement | null>(null);
  const [importingCatalog, setImportingCatalog] = useState(false);
  const [editingGroup, setEditingGroup] = useState<string | null>(null);
  const [editingGroupValue, setEditingGroupValue] = useState("");
  const [editingGroupError, setEditingGroupError] = useState("");
  const [customGroups, setCustomGroups] = useState<string[]>([]);
  const [customers, setCustomers] = useState<Array<{ id: string; customer_name: string; customer_code: string }>>([]);
  const [loadingCustomers, setLoadingCustomers] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>("");

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
  }, [t]);

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
  }, [loadFieldValues, t]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  useEffect(() => {
    void loadCustomers();
  }, []);

  async function loadCustomers() {
    setLoadingCustomers(true);
    try {
      const res = await fetch("/api/customers", { cache: "no-store" });
      const data = (await res.json()) as {
        ok: boolean;
        error?: string;
        customers?: Array<{ id: string; customer_name: string; customer_code: string }>;
      };
      if (data.ok && data.customers) {
        setCustomers(data.customers);
      }
    } catch (e) {
      console.error("Failed to load customers:", e);
    } finally {
      setLoadingCustomers(false);
    }
  }

  async function loadCustomerData(customerId: string) {
    if (!customerId) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/customers/to-draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customer_id: customerId }),
      });
      const data = (await res.json()) as {
        ok: boolean;
        error?: string;
        values?: Record<string, unknown>;
      };
      if (!data.ok || !data.values) {
        throw new Error(data.error ?? "Failed to load customer data.");
      }
      // Update values and manualValues
      setValues(data.values);
      setManualValues(data.values as Record<string, string | number | boolean | null>);
      setMessage(t("mapping.msg.customerLoaded"));
    } catch (e) {
      setError(e instanceof Error ? e.message : t("mapping.err.loadCustomer"));
    } finally {
      setLoading(false);
    }
  }

  const activeVersion = useMemo(
    () => versions?.find((item) => item.id === activeVersionId),
    [activeVersionId, versions],
  );

  const groupedFields = useMemo(() => {
    const normalizedQuery = searchTerm.trim().toLowerCase();
    const groups = new Map<string, FieldCatalogItem[]>();
    for (const item of fieldCatalog) {
      if (normalizedQuery) {
        const inLabel = item.label_vi.toLowerCase().includes(normalizedQuery);
        const inKey = item.field_key.toLowerCase().includes(normalizedQuery);
        const inGroup = item.group.toLowerCase().includes(normalizedQuery);
        if (!inLabel && !inKey && !inGroup) {
          continue;
        }
      }
      const list = groups.get(item.group) ?? [];
      list.push(item);
      groups.set(item.group, list);
    }
    return Array.from(groups.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [fieldCatalog, searchTerm]);

  const existingGroups = useMemo(() => {
    const groups = new Set([...fieldCatalog.map((item) => item.group), ...customGroups]);
    return Array.from(groups).sort((a, b) => a.localeCompare(b, "vi"));
  }, [fieldCatalog, customGroups]);

  async function saveDraft() {
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
        }),
      });
      const data = (await res.json()) as MappingApiResponse;
      if (!data.ok) {
        throw new Error(data.error ?? t("mapping.err.saveDraft"));
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
  }

  async function publishActive() {
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
  }

  async function runValidate() {
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
  }

  async function exportAndOpenDocx() {
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
  }

  function onManualChange(field: FieldCatalogItem, rawValue: string) {
    const normalized = normalizeInputByType(rawValue, field.type);
    setManualValues((prev) => ({ ...prev, [field.field_key]: normalized }));
    setValues((prev) => ({ ...prev, [field.field_key]: normalized }));
  }

  function resetField(fieldKey: string) {
    setManualValues((prev) => {
      const clone = { ...prev };
      delete clone[fieldKey];
      return clone;
    });
    setValues((prev) => ({ ...prev, [fieldKey]: autoValues[fieldKey] ?? "" }));
  }

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
      const header = lines[0].split(",").map((h) => h.trim().toLowerCase());
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
        const cols = lines[i].split(",").map((c) => c.trim());
        const label_vi = cols[idxName] ?? "";
        const group = cols[idxGroup] ?? "";
        const rawType = cols[idxType] ?? "";
        if (!label_vi || !group || !rawType) continue;

        const type = normalizeImportedType(rawType);
        if (!type) continue;

        if (fieldCatalog.some((f) => f.group === group && f.label_vi === label_vi)) {
          // skip duplicates by label+group
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
      setMessage(t("mapping.import.ok", { count: imported.length }));
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
      setMessage(t("mapping.import.ok", { count: imported.length }));
    } catch (e) {
      setError(e instanceof Error ? e.message : t("mapping.import.err.generic"));
    } finally {
      setImportingCatalog(false);
    }
  }

  function handleImportFieldFile(e: React.ChangeEvent<HTMLInputElement>) {
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

  function openEditGroupModal(group: string) {
    setEditingGroup(group);
    setEditingGroupValue(group);
    setEditingGroupError("");
  }

  function closeEditGroupModal() {
    setEditingGroup(null);
    setEditingGroupValue("");
    setEditingGroupError("");
  }

  function applyEditGroup() {
    const target = editingGroup ?? "";
    const next = editingGroupValue.trim();
    if (!next) {
      setEditingGroupError(t("mapping.editGroup.errEmpty"));
      return;
    }

    if (!target) {
      // create new group
      setCustomGroups((prev) => (prev.includes(next) ? prev : [...prev, next]));
      setSelectedGroup(next);
      setNewField((prev) => ({ ...prev, group: next }));
      closeEditGroupModal();
      return;
    }

    // rename existing group in catalog
    setFieldCatalog((prev) =>
      prev.map((item) => (item.group === target ? { ...item, group: next } : item)),
    );
    setCustomGroups((prev) => prev.map((g) => (g === target ? next : g)));
    if (selectedGroup === target) {
      setSelectedGroup(next);
    }
    if (newField.group === target) {
      setNewField((prev) => ({ ...prev, group: next }));
    }
    closeEditGroupModal();
  }

  function onFieldLabelChange(fieldKey: string, labelVi: string) {
    setFieldCatalog((prev) =>
      prev.map((item) => (item.field_key === fieldKey ? { ...item, label_vi: labelVi } : item)),
    );
  }

  function onFieldTypeChange(fieldKey: string, type: FieldCatalogItem["type"]) {
    setFieldCatalog((prev) =>
      prev.map((item) => (item.field_key === fieldKey ? { ...item, type } : item)),
    );
  }

  function resolveGroupSelection(overrideGroup?: string): string {
    if (overrideGroup) {
      return overrideGroup.trim();
    }
    if (selectedGroup.trim()) {
      return selectedGroup.trim();
    }
    return newField.group.trim();
  }

  function addNewField(
    override?: Partial<{
      label_vi: string;
      group: string;
      type: "string" | "number" | "percent" | "date" | "table";
    }>,
  ) {
    const group = resolveGroupSelection(override?.group);
    const label = (override?.label_vi ?? newField.label_vi).trim();
    const type = override?.type ?? newField.type;
    if (!label || !group) {
      setError(t("mapping.msg.needFieldGroup"));
      return;
    }
    const fieldKey = buildInternalFieldKey({
      group,
      labelVi: label,
      existingKeys: fieldCatalog.map((item) => item.field_key),
    });
    if (fieldCatalog.some((item) => item.field_key === fieldKey)) {
      setError(t("mapping.msg.duplicatedField"));
      return;
    }
    setError("");
    const item: FieldCatalogItem = {
      field_key: fieldKey,
      label_vi: label,
      group,
      type: toInternalType(type),
      required: false,
      examples: [],
    };
    setFieldCatalog((prev) => [...prev, item]);
    setValues((prev) => ({ ...prev, [fieldKey]: "" }));
    setManualValues((prev) => ({ ...prev, [fieldKey]: "" }));
    setNewField({
      label_vi: "",
      group,
      type: "string",
    });
    setSelectedGroup(group);
    setMessage(t("mapping.msg.addedField"));
  }

  function applyPreset(preset: BusinessFieldPreset) {
    const matchedGroup = existingGroups.find((group) => group.toLowerCase() === preset.group.toLowerCase());
    setSelectedGroup(matchedGroup ?? "__new__");
    setNewField({
      label_vi: preset.label_vi,
      group: preset.group,
      type: preset.type,
    });
  }

  function renderValueInput(field: FieldCatalogItem, textValue: string, rawValue: unknown) {
    if (field.type === "date") {
      return (
        <input
          type="date"
          value={toDateInputValue(textValue)}
          onChange={(e) => onManualChange(field, e.target.value)}
          className="w-full rounded-md border border-zinc-300 px-2 py-1.5"
        />
      );
    }
    if (field.type === "number") {
      return (
        <input
          value={formatNumberVnDisplay(rawValue)}
          onChange={(e) => onManualChange(field, e.target.value)}
          inputMode="decimal"
          className="w-full rounded-md border border-zinc-300 px-2 py-1.5"
          placeholder={t("mapping.typeHintNumber")}
        />
      );
    }
    if (field.type === "percent") {
      return (
        <input
          value={formatPercentVnDisplay(rawValue)}
          onChange={(e) => onManualChange(field, e.target.value)}
          inputMode="decimal"
          className="w-full rounded-md border border-zinc-300 px-2 py-1.5"
          placeholder={t("mapping.typeHintPercent")}
        />
      );
    }
    if (field.type === "table") {
      return (
        <div className="space-y-1">
          <textarea
            value={textValue}
            onChange={(e) => onManualChange(field, e.target.value)}
            className="min-h-32 w-full rounded-md border border-zinc-300 px-2 py-1.5 font-mono text-sm whitespace-pre"
            placeholder={t("mapping.typeHintTable")}
            spellCheck={false}
          />
          <p className="text-xs text-zinc-500">{t("mapping.tablePasteHint")}</p>
        </div>
      );
    }
    return (
      <input
        value={textValue}
        onChange={(e) => onManualChange(field, e.target.value)}
        className="w-full rounded-md border border-zinc-300 px-2 py-1.5"
        placeholder={t("mapping.column.value")}
      />
    );
  }

  if (loading) {
    return <p className="text-sm text-zinc-600">{t("mapping.loading")}</p>;
  }

  return (
    <section className="space-y-4">
      <div className="rounded-xl border border-zinc-200 bg-white p-4">
        <h2 className="text-lg font-semibold">{t("mapping.title")}</h2>
        <p className="mt-1 text-sm text-zinc-600">
          {t("mapping.activeVersion")}: <span className="font-medium">{activeVersionId || t("mapping.na")}</span> (
          {activeVersion?.status ?? t("mapping.unknown")})
        </p>
        {message ? <p className="mt-2 text-sm text-emerald-700">{message}</p> : null}
        {error ? <p className="mt-2 text-sm text-red-700">{error}</p> : null}
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setActiveTab("visual")}
          className={`rounded-md px-3 py-1.5 text-sm ${activeTab === "visual" ? "bg-zinc-900 text-white" : "border border-zinc-300"}`}
        >
          {t("mapping.tab.visual")}
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("advanced")}
          className={`rounded-md px-3 py-1.5 text-sm ${activeTab === "advanced" ? "bg-zinc-900 text-white" : "border border-zinc-300"}`}
        >
          {t("mapping.tab.advanced")}
        </button>
      </div>

      {activeTab === "visual" ? (
        <section className="space-y-3">
          <div className="flex flex-wrap gap-3">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-zinc-500" />
              <select
                value={selectedCustomerId}
                onChange={(e) => {
                  const customerId = e.target.value;
                  setSelectedCustomerId(customerId);
                  if (customerId) {
                    void loadCustomerData(customerId);
                  }
                }}
                disabled={loadingCustomers || loading}
                className="min-w-64 rounded-md border border-zinc-300 px-3 py-2 text-sm disabled:opacity-50"
              >
                <option value="">{t("mapping.selectCustomer")}</option>
                {customers.map((customer) => (
                  <option key={customer.id} value={customer.id}>
                    {customer.customer_name} ({customer.customer_code})
                  </option>
                ))}
              </select>
            </div>
            <input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="min-w-72 rounded-md border border-zinc-300 px-3 py-2 text-sm"
              placeholder={t("mapping.searchPlaceholder")}
            />
            <button
              onClick={exportAndOpenDocx}
              disabled={exportingDocx}
              className="flex items-center gap-2 rounded-md bg-indigo-600 px-4 py-2 text-sm text-white disabled:opacity-60"
            >
              <FileText className="h-4 w-4" />
              {exportingDocx ? t("mapping.exportingDocx") : t("mapping.exportOpenDocx")}
            </button>
            {lastExportedDocxPath ? (
              <a
                href={`/api/report/file?path=${encodeURIComponent(lastExportedDocxPath)}&download=1&ts=${Date.now()}`}
                className="flex items-center gap-2 rounded-md border border-zinc-300 px-4 py-2 text-sm hover:bg-zinc-50"
              >
                <Download className="h-4 w-4" />
                {t("mapping.downloadDocx")}
              </a>
            ) : null}
            <label className="inline-flex items-center gap-2 rounded-md border border-zinc-300 px-3 py-2 text-sm">
              <input
                type="checkbox"
                checked={showTechnicalKeys}
                onChange={(e) => setShowTechnicalKeys(e.target.checked)}
              />
              {t("mapping.showTechnicalKeys")}
            </label>
            <button
              type="button"
              onClick={() => importInputRef.current?.click()}
              disabled={importingCatalog}
              className="flex items-center gap-2 rounded-md border border-zinc-300 px-4 py-2 text-sm disabled:opacity-60"
            >
              <Upload className="h-4 w-4" />
              {importingCatalog ? t("mapping.import.loading") : t("mapping.import.button")}
            </button>
            <input
              ref={importInputRef}
              type="file"
              accept=".csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              className="hidden"
              onChange={handleImportFieldFile}
            />
          </div>

          <div className="rounded-xl border border-zinc-200 bg-white p-3">
            <p className="mb-2 text-sm font-semibold">{t("mapping.newFieldTitle")}</p>
            <div className="grid gap-2 md:grid-cols-[minmax(220px,1.6fr)_minmax(220px,1.6fr)_140px]">
              <input
                value={newField.label_vi}
                onChange={(e) => setNewField((prev) => ({ ...prev, label_vi: e.target.value }))}
                placeholder={t("mapping.newFieldLabelPlaceholder")}
                className="rounded-md border border-zinc-300 px-2 py-1.5 text-sm"
              />
              <div className="flex gap-1">
                <select
                  value={selectedGroup}
                  onChange={(e) => {
                    const group = e.target.value;
                    if (group === "__create_new__") {
                      // Open modal to create new group
                      setEditingGroup("");
                      setEditingGroupValue("");
                      setEditingGroupError("");
                      setSelectedGroup(""); // Reset to avoid stuck state
                    } else {
                      setSelectedGroup(group);
                      if (group) {
                        setNewField((prev) => ({ ...prev, group }));
                      }
                    }
                  }}
                  className="flex-1 rounded-md border border-zinc-300 px-2 py-1.5 text-sm"
                >
                  <option value="" disabled>
                    {t("mapping.selectGroup")}
                  </option>
                  {existingGroups.map((group) => (
                    <option key={group} value={group}>
                      {group}
                    </option>
                  ))}
                  <option value="__create_new__" className="text-emerald-600 font-medium">
                    {t("mapping.newGroupOption")}
                  </option>
                </select>
                <button
                  type="button"
                  onClick={() => {
                    if (selectedGroup) {
                      // Edit existing group
                      openEditGroupModal(selectedGroup);
                    } else {
                      // Create new group
                      setEditingGroup("");
                      setEditingGroupValue("");
                      setEditingGroupError("");
                    }
                  }}
                  className="flex-shrink-0 flex items-center justify-center rounded-md border border-zinc-300 bg-white px-2.5 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
                  title={selectedGroup ? t("mapping.editGroup") : t("mapping.newGroupOption")}
                >
                  {selectedGroup ? <Pencil className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
                </button>
              </div>
              <select
                value={newField.type}
                onChange={(e) =>
                  setNewField((prev) => ({ ...prev, type: e.target.value as "string" | "number" | "percent" | "date" | "table" }))
                }
                className="rounded-md border border-zinc-300 px-2 py-1.5 text-sm"
              >
                <option value="string">{t(typeLabelKey("string"))}</option>
                <option value="number">{t(typeLabelKey("number"))}</option>
                <option value="percent">{t(typeLabelKey("percent"))}</option>
                <option value="date">{t(typeLabelKey("date"))}</option>
                <option value="table">{t(typeLabelKey("table"))}</option>
              </select>
            </div>
            <p className="mt-1 text-xs text-zinc-500">
              {t("mapping.typeHintPrefix")} <span className="font-medium">{t("mapping.typeHintString")}</span>,{" "}
              <span className="font-medium">{t("mapping.typeHintNumber")}</span>,{" "}
              <span className="font-medium">{t("mapping.typeHintPercent")}</span>,{" "}
              <span className="font-medium">{t("mapping.typeHintDate")}</span>,{" "}
              <span className="font-medium">{t("mapping.typeHintTable")}</span>.
            </p>
            <p className="mt-2 text-xs text-zinc-500">
              {t("mapping.autoTechnicalKey")}{" "}
              <span className="font-mono">
                {buildInternalFieldKey({
                  group: resolveGroupSelection() || "Nhóm mới",
                  labelVi: newField.label_vi || "Tên field",
                  existingKeys: fieldCatalog.map((item) => item.field_key),
                })}
              </span>
            </p>
            <button
              type="button"
              onClick={() => addNewField()}
              className="mt-2 flex items-center gap-2 rounded-md bg-zinc-900 px-4 py-2 text-sm text-white"
            >
              <Plus className="h-4 w-4" />
              {t("mapping.addField")}
            </button>
          </div>
          <div className="max-h-[70vh] overflow-auto rounded-xl border border-zinc-200 bg-white">
            <div className="sticky top-0 z-10 grid grid-cols-[minmax(260px,1fr)_minmax(360px,2fr)_160px] border-b border-zinc-200 bg-zinc-100 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-zinc-600">
              <div>{t("mapping.column.field")}</div>
              <div>{t("mapping.column.value")}</div>
              <div>{t("mapping.column.typeSource")}</div>
            </div>
            {groupedFields.map(([group, fields]) => (
              <div key={group}>
                <div className="sticky top-9 z-[5] flex items-center justify-between bg-emerald-50 px-4 py-2 text-xs uppercase tracking-wide text-emerald-700">
                  <span className="font-semibold">{group}</span>
                  <button
                    type="button"
                    onClick={() => openEditGroupModal(group)}
                    className="flex items-center gap-1 rounded border border-emerald-300 bg-white px-2 py-0.5 text-[11px] font-normal text-emerald-700 hover:bg-emerald-50"
                  >
                    <Pencil className="h-3 w-3" />
                    {t("mapping.editGroup")}
                  </button>
                </div>
                {fields.map((field) => {
                  const value = values[field.field_key];
                  const textValue = value === null || value === undefined ? "" : String(value);
                  const hasManual = Object.prototype.hasOwnProperty.call(manualValues, field.field_key);
                  return (
                    <div
                      key={field.field_key}
                      className={`grid grid-cols-[minmax(260px,1fr)_minmax(360px,2fr)_160px] items-start gap-3 border-t border-zinc-200 px-4 py-2 text-sm ${hasManual ? "bg-amber-50" : ""}`}
                    >
                      <div>
                        <input
                          value={field.label_vi}
                          onChange={(e) => onFieldLabelChange(field.field_key, e.target.value)}
                          className="w-full rounded border border-zinc-300 px-2 py-1 font-medium"
                        />
                        {showTechnicalKeys ? <p className="text-xs text-zinc-500">{field.field_key}</p> : null}
                      </div>
                      <div className="space-y-2">
                        {renderValueInput(field, textValue, value)}
                        {hasManual ? (
                          <button
                            onClick={() => resetField(field.field_key)}
                            className="flex items-center gap-1 text-xs text-zinc-600 underline underline-offset-2"
                            type="button"
                          >
                            <RotateCcw className="h-3 w-3" />
                            {t("mapping.resetField")}
                          </button>
                        ) : null}
                      </div>
                      <div className="text-xs text-zinc-600">
                        <select
                          value={toBusinessType(field.type)}
                          onChange={(e) =>
                            onFieldTypeChange(
                              field.field_key,
                              toInternalType(e.target.value as "string" | "number" | "percent" | "date" | "table"),
                            )
                          }
                          className="rounded border border-zinc-300 px-1 py-0.5 text-xs"
                        >
                          <option value="string">{t(typeLabelKey("string"))}</option>
                          <option value="number">{t(typeLabelKey("number"))}</option>
                          <option value="percent">{t(typeLabelKey("percent"))}</option>
                          <option value="date">{t(typeLabelKey("date"))}</option>
                          <option value="table">{t(typeLabelKey("table"))}</option>
                        </select>
                        <p>{hasManual ? t("mapping.sourceManual") : t("mapping.sourceAuto")}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </section>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          <label className="rounded-xl border border-zinc-200 bg-white p-4">
            <div className="mb-2 text-sm font-medium">{t("mapping.file.mapping")} (`mapping_master.json`)</div>
            <textarea
              value={mappingText}
              onChange={(e) => setMappingText(e.target.value)}
              className="h-96 w-full rounded-md border border-zinc-300 p-2 font-mono text-xs"
            />
          </label>
          <label className="rounded-xl border border-zinc-200 bg-white p-4">
            <div className="mb-2 text-sm font-medium">{t("mapping.file.alias")} (`placeholder_alias_2268.json`)</div>
            <textarea
              value={aliasText}
              onChange={(e) => setAliasText(e.target.value)}
              className="h-96 w-full rounded-md border border-zinc-300 p-2 font-mono text-xs"
            />
          </label>
        </div>
      )}

      {editingGroup !== null ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm space-y-3 rounded-lg bg-white p-4 shadow-xl">
            <h3 className="text-sm font-semibold">{t("mapping.editGroup.modalTitle")}</h3>
            {editingGroup ? (
              <p className="text-xs text-zinc-600">
                {t("mapping.editGroup.current")}: <span className="font-medium">{editingGroup}</span>
              </p>
            ) : null}
            <div className="space-y-1">
              <label className="text-xs text-zinc-600" htmlFor="edit-group-input">
                {t("mapping.editGroup.label")}
              </label>
              <input
                id="edit-group-input"
                value={editingGroupValue}
                onChange={(e) => setEditingGroupValue(e.target.value)}
                className="w-full rounded-md border border-zinc-300 px-2 py-1.5 text-sm"
                autoFocus
              />
              {editingGroupError ? <p className="text-xs text-red-600">{editingGroupError}</p> : null}
            </div>
            <div className="mt-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={closeEditGroupModal}
                className="flex items-center gap-1.5 rounded-md border border-zinc-300 px-3 py-1.5 text-xs hover:bg-zinc-50"
              >
                <X className="h-3.5 w-3.5" />
                {t("mapping.editGroup.cancel")}
              </button>
              <button
                type="button"
                onClick={applyEditGroup}
                className="flex items-center gap-1.5 rounded-md bg-zinc-900 px-3 py-1.5 text-xs text-white"
              >
                <Save className="h-3.5 w-3.5" />
                {t("mapping.editGroup.save")}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <div className="flex flex-wrap gap-3">
        <button
          onClick={saveDraft}
          disabled={saving}
          className="flex items-center gap-2 rounded-md bg-zinc-900 px-4 py-2 text-sm text-white disabled:opacity-60"
        >
          <Save className="h-4 w-4" />
          {saving ? t("mapping.saving") : t("mapping.saveDraft")}
        </button>
        <button
          onClick={publishActive}
          disabled={publishing || !activeVersionId}
          className="flex items-center gap-2 rounded-md border border-zinc-300 px-4 py-2 text-sm disabled:opacity-60"
        >
          <Send className="h-4 w-4" />
          {publishing ? t("mapping.publishing") : t("mapping.publish")}
        </button>
        <button
          onClick={runValidate}
          disabled={validating}
          className="flex items-center gap-2 rounded-md border border-zinc-300 px-4 py-2 text-sm disabled:opacity-60"
        >
          <CheckCircle className="h-4 w-4" />
          {validating ? t("mapping.validating") : t("mapping.buildValidate")}
        </button>
      </div>

      <div className="rounded-xl border border-zinc-200 bg-white p-4">
        <h3 className="text-sm font-semibold">{t("mapping.validationResult")}</h3>
        {validation ? (
          <pre className="mt-2 overflow-auto rounded-md bg-zinc-950 p-3 text-xs text-zinc-50">
            {JSON.stringify(validation, null, 2)}
          </pre>
        ) : (
          <p className="mt-1 text-sm text-zinc-600">{t("mapping.noValidation")}</p>
        )}
      </div>

      <div className="rounded-xl border border-zinc-200 bg-white p-4">
        <h3 className="text-sm font-semibold">{t("mapping.versionHistory")}</h3>
        <ul className="mt-2 space-y-1 text-sm">
          {(versions ?? []).map((version) => (
            <li key={version.id} className="flex items-center justify-between rounded border border-zinc-200 px-3 py-2">
              <span>
                {version.id} - {version.status}
              </span>
              <span className="text-xs text-zinc-500">{new Date(version.created_at).toLocaleString()}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
