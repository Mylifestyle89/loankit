"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { useLanguage } from "@/components/language-provider";
import type { FieldCatalogItem } from "@/lib/report/config-schema";
import { translateFieldLabelVi } from "@/lib/report/field-labels";

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

type BusinessFieldPreset = {
  label_vi: string;
  group: string;
  type: "string" | "number" | "percent" | "date" | "table";
};

const BUSINESS_FIELD_PRESETS: BusinessFieldPreset[] = [
  { label_vi: "Tên người có liên quan", group: "Người có liên quan", type: "string" },
  { label_vi: "Số CCCD người có liên quan", group: "Người có liên quan", type: "string" },
  { label_vi: "Ngày cấp CCCD", group: "Người có liên quan", type: "date" },
  { label_vi: "Thu nhập bình quân tháng", group: "Thu nhập", type: "number" },
  { label_vi: "Tổng giá trị tài sản bảo đảm", group: "Tài sản bảo đảm", type: "number" },
  { label_vi: "Ghi chú thẩm định", group: "Thẩm định", type: "table" },
];

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
  const [savingValues, setSavingValues] = useState(false);
  const [exportingDocx, setExportingDocx] = useState(false);
  const [savingCatalog, setSavingCatalog] = useState(false);
  const [activeTab, setActiveTab] = useState<"visual" | "advanced">("visual");
  const [searchTerm, setSearchTerm] = useState("");
  const [showTechnicalKeys, setShowTechnicalKeys] = useState(false);
  const [lastExportedDocxPath, setLastExportedDocxPath] = useState<string>("");
  const [selectedGroup, setSelectedGroup] = useState<string>("__new__");
  const [newField, setNewField] = useState<{
    label_vi: string;
    group: string;
    type: "string" | "number" | "percent" | "date" | "table";
  }>({
    label_vi: "",
    group: "Nhóm mới",
    type: "string",
  });

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
    const groups = new Set(fieldCatalog.map((item) => item.group));
    return Array.from(groups).sort((a, b) => a.localeCompare(b, "vi"));
  }, [fieldCatalog]);

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

  async function saveManualValues() {
    setSavingValues(true);
    setError("");
    setMessage("");
    const res = await fetch("/api/report/values", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ manual_values: manualValues }),
    });
    const data = (await res.json()) as ValuesResponse;
    if (!data.ok) {
      setError(data.error ?? t("mapping.err.saveFieldValues"));
      setSavingValues(false);
      return;
    }
    setMessage(t("mapping.msg.savedFieldValues"));
    await loadFieldValues();
    setSavingValues(false);
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

  async function saveFieldCatalog() {
    setSavingCatalog(true);
    setError("");
    setMessage("");
    const res = await fetch("/api/report/catalog", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ field_catalog: fieldCatalog }),
    });
    const data = (await res.json()) as { ok: boolean; error?: string };
    if (!data.ok) {
      setError(data.error ?? t("mapping.err.saveFieldNames"));
      setSavingCatalog(false);
      return;
    }
    setMessage(t("mapping.msg.savedFieldNames"));
    setSavingCatalog(false);
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

  function resetAllManualValues() {
    setManualValues({});
    setValues(autoValues);
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

  function autoTranslateAllLabels() {
    setFieldCatalog((prev) =>
      prev.map((item) => ({
        ...item,
        label_vi: translateFieldLabelVi(item.field_key),
      })),
    );
    setMessage(t("mapping.msg.translateDone"));
  }

  function resolveGroupSelection(overrideGroup?: string): string {
    if (overrideGroup) {
      return overrideGroup.trim();
    }
    if (selectedGroup === "__new__") {
      return newField.group.trim();
    }
    return selectedGroup.trim();
  }

  function addNewField(override?: Partial<BusinessFieldPreset>) {
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
    if (existingGroups.includes(group)) {
      setSelectedGroup(group);
    } else {
      setSelectedGroup("__new__");
    }
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
            <input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="min-w-72 rounded-md border border-zinc-300 px-3 py-2 text-sm"
              placeholder={t("mapping.searchPlaceholder")}
            />
            <button
              type="button"
              onClick={autoTranslateAllLabels}
              className="rounded-md border border-zinc-300 px-4 py-2 text-sm"
            >
              {t("mapping.translateAllFields")}
            </button>
            <button
              onClick={saveFieldCatalog}
              disabled={savingCatalog}
              className="rounded-md border border-zinc-300 px-4 py-2 text-sm disabled:opacity-60"
            >
              {savingCatalog ? t("mapping.savingFieldNames") : t("mapping.saveFieldNames")}
            </button>
            <button
              onClick={saveManualValues}
              disabled={savingValues}
              className="rounded-md bg-zinc-900 px-4 py-2 text-sm text-white disabled:opacity-60"
            >
              {savingValues ? t("mapping.savingFieldValues") : t("mapping.saveFieldValues")}
            </button>
            <button
              onClick={exportAndOpenDocx}
              disabled={exportingDocx}
              className="rounded-md bg-indigo-600 px-4 py-2 text-sm text-white disabled:opacity-60"
            >
              {exportingDocx ? t("mapping.exportingDocx") : t("mapping.exportOpenDocx")}
            </button>
            {lastExportedDocxPath ? (
              <a
                href={`/api/report/file?path=${encodeURIComponent(lastExportedDocxPath)}&download=1&ts=${Date.now()}`}
                className="rounded-md border border-zinc-300 px-4 py-2 text-sm hover:bg-zinc-50"
              >
                {t("mapping.downloadDocx")}
              </a>
            ) : null}
            <button onClick={resetAllManualValues} className="rounded-md border border-zinc-300 px-4 py-2 text-sm">
              {t("mapping.resetUnsaved")}
            </button>
            <label className="inline-flex items-center gap-2 rounded-md border border-zinc-300 px-3 py-2 text-sm">
              <input
                type="checkbox"
                checked={showTechnicalKeys}
                onChange={(e) => setShowTechnicalKeys(e.target.checked)}
              />
              {t("mapping.showTechnicalKeys")}
            </label>
          </div>

          <div className="rounded-xl border border-zinc-200 bg-white p-3">
            <p className="mb-2 text-sm font-semibold">{t("mapping.newFieldTitle")}</p>
            <div className="grid gap-2 md:grid-cols-[minmax(220px,1.8fr)_minmax(200px,1.2fr)_140px]">
              <input
                value={newField.label_vi}
                onChange={(e) => setNewField((prev) => ({ ...prev, label_vi: e.target.value }))}
                placeholder={t("mapping.newFieldLabelPlaceholder")}
                className="rounded-md border border-zinc-300 px-2 py-1.5 text-sm"
              />
              <div className="space-y-2">
                <select
                  value={selectedGroup}
                  onChange={(e) => setSelectedGroup(e.target.value)}
                  className="w-full rounded-md border border-zinc-300 px-2 py-1.5 text-sm"
                >
                  <option value="__new__">{t("mapping.newGroupOption")}</option>
                  {existingGroups.map((group) => (
                    <option key={group} value={group}>
                      {group}
                    </option>
                  ))}
                </select>
                {selectedGroup === "__new__" ? (
                  <input
                    value={newField.group}
                    onChange={(e) => setNewField((prev) => ({ ...prev, group: e.target.value }))}
                    placeholder={t("mapping.newGroupPlaceholder")}
                    className="w-full rounded-md border border-zinc-300 px-2 py-1.5 text-sm"
                  />
                ) : null}
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
              className="mt-2 rounded-md bg-zinc-900 px-4 py-2 text-sm text-white"
            >
              {t("mapping.addField")}
            </button>
            <div className="mt-3 border-t border-zinc-200 pt-3">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-600">{t("mapping.presetsTitle")}</p>
              <div className="flex flex-wrap gap-2">
                {BUSINESS_FIELD_PRESETS.map((preset) => (
                  <button
                    key={`${preset.group}-${preset.label_vi}`}
                    type="button"
                    onClick={() => applyPreset(preset)}
                    className="rounded-md border border-zinc-300 px-3 py-1.5 text-xs hover:bg-zinc-50"
                  >
                    {preset.label_vi} ({t(typeLabelKey(preset.type))})
                  </button>
                ))}
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                {BUSINESS_FIELD_PRESETS.map((preset) => (
                  <button
                    key={`add-${preset.group}-${preset.label_vi}`}
                    type="button"
                    onClick={() => addNewField(preset)}
                    className="rounded-md bg-zinc-900 px-3 py-1.5 text-xs text-white"
                  >
                    {t("mapping.quickAddPrefix")} {preset.label_vi}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="max-h-[70vh] overflow-auto rounded-xl border border-zinc-200 bg-white">
            <div className="sticky top-0 z-10 grid grid-cols-[minmax(260px,1fr)_minmax(360px,2fr)_160px] border-b border-zinc-200 bg-zinc-100 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-zinc-600">
              <div>{t("mapping.column.field")}</div>
              <div>{t("mapping.column.value")}</div>
              <div>{t("mapping.column.typeSource")}</div>
            </div>
            {groupedFields.map(([group, fields]) => (
              <div key={group}>
                <div className="sticky top-9 z-[5] bg-emerald-50 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-emerald-700">{group}</div>
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
                            className="text-xs text-zinc-600 underline underline-offset-2"
                            type="button"
                          >
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

      <div className="flex flex-wrap gap-3">
        <button
          onClick={saveDraft}
          disabled={saving}
          className="rounded-md bg-zinc-900 px-4 py-2 text-sm text-white disabled:opacity-60"
        >
          {saving ? t("mapping.saving") : t("mapping.saveDraft")}
        </button>
        <button
          onClick={publishActive}
          disabled={publishing || !activeVersionId}
          className="rounded-md border border-zinc-300 px-4 py-2 text-sm disabled:opacity-60"
        >
          {publishing ? t("mapping.publishing") : t("mapping.publish")}
        </button>
        <button
          onClick={runValidate}
          disabled={validating}
          className="rounded-md border border-zinc-300 px-4 py-2 text-sm disabled:opacity-60"
        >
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
