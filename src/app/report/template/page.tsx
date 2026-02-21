"use client";

import { useCallback, useEffect, useState } from "react";

import { DocxTemplateEditorModal } from "@/components/docx-template-editor-modal";
import { useLanguage } from "@/components/language-provider";

type TemplateProfile = {
  id: string;
  template_name: string;
  docx_path: string;
  placeholder_inventory_path: string;
  active: boolean;
};

type TemplateApiResponse = {
  ok: boolean;
  error?: string;
  templates?: TemplateProfile[];
  active_template_id?: string;
};

type InventoryResponse = {
  ok: boolean;
  error?: string;
  inventory_path?: string;
  inventory?: {
    placeholders?: string[];
    parts_scanned?: string[];
  };
  suggestions?: Array<{ placeholder: string; current_alias: unknown; suggestions: string[] }>;
};

type FieldCatalogItem = {
  field_key: string;
  label_vi: string;
  group: string;
  type: string;
};

type ValuesApiResponse = {
  ok: boolean;
  error?: string;
  field_catalog?: FieldCatalogItem[];
};

export default function TemplatePage() {
  const { t } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string>("");
  const [templates, setTemplates] = useState<TemplateProfile[]>([]);
  const [activeTemplateId, setActiveTemplateId] = useState<string>("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [inventory, setInventory] = useState<InventoryResponse | null>(null);
  const [fieldCatalog, setFieldCatalog] = useState<FieldCatalogItem[]>([]);
  const [editorCopyFeedback, setEditorCopyFeedback] = useState<string | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<string>("");
  const [selectedFieldKey, setSelectedFieldKey] = useState<string>("");
  const [showEditor, setShowEditor] = useState(false);
  const [editorBuffer, setEditorBuffer] = useState<ArrayBuffer | null>(null);
  const [openingEditor, setOpeningEditor] = useState(false);

  const loadTemplates = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/report/template", { cache: "no-store" });
    const data = (await res.json()) as TemplateApiResponse;
    if (!data.ok) {
      setError(data.error ?? t("template.err.load"));
      setLoading(false);
      return;
    }
    setTemplates(data.templates ?? []);
    const activeId = data.active_template_id ?? data.templates?.[0]?.id ?? "";
    setActiveTemplateId((prev) => prev || activeId);
    setLoading(false);
  }, [t]);

  const loadFieldCatalog = useCallback(async () => {
    const res = await fetch("/api/report/values", { cache: "no-store" });
    const data = (await res.json()) as ValuesApiResponse;
    if (data.ok && Array.isArray(data.field_catalog)) {
      setFieldCatalog(data.field_catalog);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadTemplates();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [loadTemplates]);

  useEffect(() => {
    if (templates.length > 0) void loadFieldCatalog();
  }, [templates.length, loadFieldCatalog]);

  async function setActive(templateId: string) {
    setBusyId(templateId);
    setMessage("");
    setError("");
    const res = await fetch("/api/report/template", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ template_id: templateId }),
    });
    const data = (await res.json()) as TemplateApiResponse;
    if (!data.ok) {
      setError(data.error ?? t("template.err.setActive"));
    } else {
      setTemplates(data.templates ?? []);
      setMessage(`${t("template.msg.setActive")} ${templateId}`);
    }
    setBusyId("");
  }

  async function buildInventory(templateId: string) {
    setBusyId(templateId);
    setMessage("");
    setError("");
    const res = await fetch("/api/report/template/inventory", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ template_id: templateId }),
    });
    const data = (await res.json()) as InventoryResponse;
    if (!data.ok) {
      setError(data.error ?? t("template.err.buildInventory"));
    } else {
      setInventory(data);
      setMessage(`${t("template.msg.inventoryBuilt")} ${data.inventory_path}`);
      await loadTemplates();
    }
    setBusyId("");
  }

  const selectedTemplate = templates.find((t) => t.id === activeTemplateId);
  const docxPath = selectedTemplate?.docx_path ?? "";

  function openDocx() {
    if (!docxPath) return;
    const url = `/api/report/file?path=${encodeURIComponent(docxPath)}&download=1&ts=${Date.now()}`;
    window.open(url, "_blank", "noopener,noreferrer");
  }

  function openEditor() {
    if (!docxPath) return;
    setOpeningEditor(true);
    setError("");
    setMessage("");
    void (async () => {
      try {
        const res = await fetch(`/api/report/file?path=${encodeURIComponent(docxPath)}&download=1&ts=${Date.now()}`);
        if (!res.ok) {
          throw new Error("Failed to load DOCX.");
        }
        const buf = await res.arrayBuffer();
        setEditorBuffer(buf);
        setShowEditor(true);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to open editor.");
      } finally {
        setOpeningEditor(false);
      }
    })();
  }

  async function saveEditorDocx(buffer: ArrayBuffer) {
    const res = await fetch(`/api/report/template/save-docx?path=${encodeURIComponent(docxPath)}`, {
      method: "PUT",
      headers: { "Content-Type": "application/octet-stream" },
      body: buffer,
    });
    const data = (await res.json()) as { ok: boolean; error?: string };
    if (!data.ok) {
      throw new Error(data.error ?? "Failed to save DOCX.");
    }
    setMessage(t("template.editor.modal.saved"));
    // Optional: refresh templates/inventory metadata
    await loadTemplates();
  }

  function injectField(fieldKey?: string) {
    const key = fieldKey ?? selectedFieldKey;
    if (!key) return;
    const placeholder = `[${key}]`;
    void navigator.clipboard.writeText(placeholder).then(() => {
      setEditorCopyFeedback(placeholder);
      window.setTimeout(() => setEditorCopyFeedback(null), 2000);
    });
  }

  // Group fields by group name
  const fieldsByGroup = fieldCatalog.reduce((acc, field) => {
    const group = field.group || t("template.editor.ungrouped");
    if (!acc[group]) {
      acc[group] = [];
    }
    acc[group].push(field);
    return acc;
  }, {} as Record<string, FieldCatalogItem[]>);

  const groups = Object.keys(fieldsByGroup).sort((a, b) => a.localeCompare(b, "vi"));
  const fieldsInSelectedGroup = selectedGroup ? fieldsByGroup[selectedGroup] ?? [] : [];

  // Auto-select first group and first field when groups are loaded
  useEffect(() => {
    if (groups.length > 0 && !selectedGroup) {
      setSelectedGroup(groups[0]);
    }
  }, [groups, selectedGroup]);

  useEffect(() => {
    if (fieldsInSelectedGroup.length > 0 && !selectedFieldKey) {
      setSelectedFieldKey(fieldsInSelectedGroup[0].field_key);
    }
  }, [fieldsInSelectedGroup, selectedFieldKey]);

  // Reset field selection when group changes
  useEffect(() => {
    if (fieldsInSelectedGroup.length > 0) {
      setSelectedFieldKey(fieldsInSelectedGroup[0].field_key);
    } else {
      setSelectedFieldKey("");
    }
  }, [selectedGroup]);

  if (loading) {
    return <p className="text-sm text-coral-tree-600">{t("template.loading")}</p>;
  }

  return (
    <section className="space-y-4">
      <div className="rounded-xl border border-coral-tree-200 bg-white p-4">
        <h2 className="text-lg font-semibold">{t("nav.template")}</h2>
        <p className="mt-1 text-sm text-coral-tree-600">{t("template.desc")}</p>
        {message ? <p className="mt-2 text-sm text-emerald-700">{message}</p> : null}
        {error ? <p className="mt-2 text-sm text-red-700">{error}</p> : null}
      </div>

      <div className="space-y-2">
        {templates.map((template) => (
          <div key={template.id} className="rounded-xl border border-coral-tree-200 bg-white p-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="font-medium">{template.template_name}</h3>
                <p className="text-sm text-coral-tree-600">{template.docx_path}</p>
                <p className="text-xs text-coral-tree-500">
                  {t("template.inventory")}: {template.placeholder_inventory_path || t("template.notBuilt")}
                </p>
                {template.active ? (
                  <p className="mt-1 inline-block rounded bg-emerald-100 px-2 py-0.5 text-xs text-emerald-700">{t("template.active")}</p>
                ) : null}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setActive(template.id)}
                  disabled={busyId === template.id}
                  className="rounded-md border border-coral-tree-300 px-3 py-1.5 text-sm disabled:opacity-60"
                >
                  {t("template.setActive")}
                </button>
                <button
                  onClick={() => buildInventory(template.id)}
                  disabled={busyId === template.id}
                  className="rounded-md bg-coral-tree-700 px-3 py-1.5 text-sm text-white disabled:opacity-60"
                >
                  {t("template.buildInventory")}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Template editor: open DOCX + inject field toolbar */}
      {templates.length > 0 ? (
        <div className="rounded-xl border border-coral-tree-200 bg-white p-4">
          <h3 className="text-base font-semibold">{t("template.editor.title")}</h3>
          <p className="mt-1 text-sm text-coral-tree-600">{t("template.editor.desc")}</p>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <select
              value={activeTemplateId}
              onChange={(e) => setActiveTemplateId(e.target.value)}
              className="rounded-md border border-coral-tree-300 bg-white px-3 py-2 text-sm"
            >
              {templates.map((tpl) => (
                <option key={tpl.id} value={tpl.id}>
                  {tpl.template_name} {tpl.active ? `(${t("template.active")})` : ""}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={openDocx}
              disabled={!docxPath}
              className="rounded-md border border-coral-tree-300 px-4 py-2 text-sm disabled:opacity-50"
            >
              {t("template.editor.openDocx")}
            </button>
            <button
              type="button"
              onClick={openEditor}
              disabled={!docxPath || fieldCatalog.length === 0 || openingEditor}
              className="rounded-md bg-coral-tree-600 px-4 py-2 text-sm text-white disabled:opacity-50 hover:bg-coral-tree-700"
            >
              {openingEditor ? t("template.editor.modal.loading") : t("template.editor.openEditor")}
            </button>
          </div>
          <div className="mt-4">
            <p className="mb-2 text-sm font-medium text-coral-tree-700">{t("template.editor.injectHint")}</p>
            {fieldCatalog.length === 0 ? (
              <p className="text-xs text-coral-tree-500">{t("template.editor.noFields")}</p>
            ) : (
              <div className="flex flex-wrap items-end gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-coral-tree-600">{t("template.editor.selectGroup")}</label>
                  <select
                    value={selectedGroup}
                    onChange={(e) => setSelectedGroup(e.target.value)}
                    className="min-w-48 rounded-md border border-coral-tree-300 bg-white px-3 py-2 text-sm"
                  >
                    {groups.map((group) => (
                      <option key={group} value={group}>
                        {group} ({fieldsByGroup[group]?.length ?? 0})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-coral-tree-600">{t("template.editor.selectField")}</label>
                  <select
                    value={selectedFieldKey}
                    onChange={(e) => setSelectedFieldKey(e.target.value)}
                    className="min-w-64 rounded-md border border-coral-tree-300 bg-white px-3 py-2 text-sm"
                    disabled={fieldsInSelectedGroup.length === 0}
                  >
                    {fieldsInSelectedGroup.map((field) => (
                      <option key={field.field_key} value={field.field_key}>
                        {field.label_vi || field.field_key}
                      </option>
                    ))}
                  </select>
                </div>
                <button
                  type="button"
                  onClick={() => injectField()}
                  disabled={!selectedFieldKey}
                  className="rounded-md bg-coral-tree-600 px-4 py-2 text-sm text-white disabled:opacity-50 hover:bg-coral-tree-700"
                >
                  {t("template.editor.injectButton")}
                </button>
                {editorCopyFeedback ? (
                  <span className="text-sm text-emerald-600">{t("template.editor.copied")}: {editorCopyFeedback}</span>
                ) : null}
              </div>
            )}
          </div>
        </div>
      ) : null}

      {inventory ? (
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-xl border border-coral-tree-200 bg-white p-4">
            <h3 className="text-sm font-semibold">{t("template.placeholders")}</h3>
            <p className="mt-1 text-xs text-coral-tree-500">{t("template.total")}: {inventory.inventory?.placeholders?.length ?? 0}</p>
            <div className="mt-2 h-96 overflow-auto rounded border border-coral-tree-200 p-2 text-xs">
              <ul className="space-y-1">
                {(inventory.inventory?.placeholders ?? []).map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          </div>
          <div className="rounded-xl border border-coral-tree-200 bg-white p-4">
            <h3 className="text-sm font-semibold">{t("template.aliasSuggestions")}</h3>
            <div className="mt-2 h-96 overflow-auto rounded border border-coral-tree-200 p-2 text-xs">
              <ul className="space-y-2">
                {(inventory.suggestions ?? []).map((item) => (
                  <li key={item.placeholder} className="rounded border border-coral-tree-200 p-2">
                    <p className="font-medium">{item.placeholder}</p>
                    <p className="text-coral-tree-500">{t("template.current")}: {String(item.current_alias ?? t("template.none"))}</p>
                    <p className="text-coral-tree-600">{t("template.suggest")}: {item.suggestions.join(", ") || t("template.none")}</p>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          </div>
        ) : null}

      {/* DOCX Editor Modal */}
      {showEditor && docxPath && editorBuffer && fieldCatalog.length > 0 ? (
        <DocxTemplateEditorModal
          docxPath={docxPath}
          documentBuffer={editorBuffer}
          fieldCatalog={fieldCatalog}
          onClose={() => {
            setShowEditor(false);
            setEditorBuffer(null);
          }}
          onSaveDocx={saveEditorDocx}
        />
      ) : null}
    </section>
  );
}
