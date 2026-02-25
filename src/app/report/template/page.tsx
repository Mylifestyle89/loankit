"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

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

type FieldCatalogItem = {
  field_key: string;
  label_vi: string;
  group: string;
  type: string;
};

type FieldTemplateItem = {
  id: string;
  name: string;
  field_catalog: FieldCatalogItem[];
};

type FieldTemplatesApiResponse = {
  ok: boolean;
  error?: string;
  field_templates?: FieldTemplateItem[];
};

export default function TemplatePage() {
  const { t } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [templates, setTemplates] = useState<TemplateProfile[]>([]);
  const [activeTemplateId, setActiveTemplateId] = useState<string>("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [fieldTemplates, setFieldTemplates] = useState<FieldTemplateItem[]>([]);
  const [selectedFieldTemplateId, setSelectedFieldTemplateId] = useState<string>("");
  const [editorCopyFeedback, setEditorCopyFeedback] = useState<string | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<string>("");
  const [selectedFieldKey, setSelectedFieldKey] = useState<string>("");
  const [showEditor, setShowEditor] = useState(false);
  const [editorBuffer, setEditorBuffer] = useState<ArrayBuffer | null>(null);
  const [openingEditor, setOpeningEditor] = useState(false);
  const [editorSource, setEditorSource] = useState<"managed" | "local">("managed");
  const [localDocxName, setLocalDocxName] = useState("");
  const localDocxInputRef = useRef<HTMLInputElement | null>(null);

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

  const loadFieldTemplates = useCallback(async () => {
    const res = await fetch("/api/report/field-templates", { cache: "no-store" });
    const data = (await res.json()) as FieldTemplatesApiResponse;
    if (data.ok && Array.isArray(data.field_templates)) {
      setFieldTemplates(data.field_templates);
      setSelectedFieldTemplateId((prev) => prev || data.field_templates?.[0]?.id || "");
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadTemplates();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [loadTemplates]);

  useEffect(() => {
    if (templates.length > 0) void loadFieldTemplates();
  }, [templates.length, loadFieldTemplates]);

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
    setEditorSource("managed");
    setLocalDocxName("");
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

  function openLocalDocxFromFolder(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    setOpeningEditor(true);
    setError("");
    setMessage("");
    setEditorSource("local");
    setLocalDocxName(file.name);
    void (async () => {
      try {
        const buf = await file.arrayBuffer();
        setEditorBuffer(buf);
        setShowEditor(true);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Không thể mở file DOCX.");
      } finally {
        setOpeningEditor(false);
      }
    })();
  }


  async function saveEditorDocx(buffer: ArrayBuffer) {
    if (editorSource === "local") {
      const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = localDocxName || "edited-template.docx";
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
      setMessage("Đã tải file DOCX đã chỉnh sửa về máy.");
      return;
    }

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

  const selectedFieldTemplate = useMemo(
    () => fieldTemplates.find((item) => item.id === selectedFieldTemplateId) ?? null,
    [fieldTemplates, selectedFieldTemplateId],
  );
  const availableFieldCatalog = useMemo(
    () => selectedFieldTemplate?.field_catalog ?? [],
    [selectedFieldTemplate],
  );

  // Group fields by group name (filtered by selected field template)
  const fieldsByGroup = useMemo(
    () =>
      availableFieldCatalog.reduce((acc, field) => {
        const group = field.group || t("template.editor.ungrouped");
        if (!acc[group]) {
          acc[group] = [];
        }
        acc[group].push(field);
        return acc;
      }, {} as Record<string, FieldCatalogItem[]>),
    [availableFieldCatalog, t],
  );

  const groups = useMemo(() => Object.keys(fieldsByGroup).sort((a, b) => a.localeCompare(b, "vi")), [fieldsByGroup]);
  const fieldsInSelectedGroup = useMemo(
    () => (selectedGroup ? fieldsByGroup[selectedGroup] ?? [] : []),
    [fieldsByGroup, selectedGroup],
  );

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
  }, [fieldsInSelectedGroup]);

  // Reset group and field when selected field template changes
  useEffect(() => {
    if (!selectedFieldTemplateId) {
      setSelectedGroup("");
      setSelectedFieldKey("");
      return;
    }
    const nextGroups = Object.keys(fieldsByGroup).sort((a, b) => a.localeCompare(b, "vi"));
    if (nextGroups.length > 0) {
      setSelectedGroup(nextGroups[0]);
      const firstField = (fieldsByGroup[nextGroups[0]] ?? [])[0];
      setSelectedFieldKey(firstField?.field_key ?? "");
    } else {
      setSelectedGroup("");
      setSelectedFieldKey("");
    }
  }, [fieldsByGroup, selectedFieldTemplateId]);

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

      {/* Template editor: open DOCX + inject field toolbar */}
      {templates.length > 0 ? (
        <div className="rounded-xl border border-coral-tree-200 bg-white p-4">
          <h3 className="text-base font-semibold">{t("template.editor.title")}</h3>
          <p className="mt-1 text-sm text-coral-tree-600">{t("template.editor.desc")}</p>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <select
              value={activeTemplateId}
              onChange={(e) => setActiveTemplateId(e.target.value)}
              aria-label={t("template.editor.title")}
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
              disabled={!docxPath || availableFieldCatalog.length === 0 || openingEditor}
              className="rounded-md bg-coral-tree-600 px-4 py-2 text-sm text-white disabled:opacity-50 hover:bg-coral-tree-700"
            >
              {openingEditor ? t("template.editor.modal.loading") : t("template.editor.openEditor")}
            </button>
            <input
              ref={localDocxInputRef}
              type="file"
              accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              aria-label="Chọn file DOCX từ thư mục"
              className="hidden"
              onChange={openLocalDocxFromFolder}
            />
            <button
              type="button"
              onClick={() => localDocxInputRef.current?.click()}
              disabled={openingEditor}
              className="rounded-md border border-coral-tree-300 px-4 py-2 text-sm disabled:opacity-50 hover:bg-coral-tree-50"
            >
              {openingEditor ? "Đang mở..." : "Chọn mẫu từ folder để chỉnh sửa"}
            </button>
          </div>
          <div className="mt-4">
            <p className="mb-2 text-sm font-medium text-coral-tree-700">{t("template.editor.injectHint")}</p>
            <div className="flex flex-wrap items-end gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-xs text-coral-tree-600">{t("mapping.selectFieldTemplate")}</label>
                <select
                  value={selectedFieldTemplateId}
                  onChange={(e) => setSelectedFieldTemplateId(e.target.value)}
                  aria-label={t("mapping.selectFieldTemplate")}
                  className="min-w-64 rounded-md border border-coral-tree-300 bg-white px-3 py-2 text-sm"
                >
                  {fieldTemplates.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-coral-tree-600">{t("template.editor.selectGroup")}</label>
                <select
                  value={selectedGroup}
                  onChange={(e) => setSelectedGroup(e.target.value)}
                  aria-label={t("template.editor.selectGroup")}
                  className="min-w-48 rounded-md border border-coral-tree-300 bg-white px-3 py-2 text-sm"
                  disabled={!selectedFieldTemplateId || groups.length === 0}
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
                  aria-label={t("template.editor.selectField")}
                  className="min-w-64 rounded-md border border-coral-tree-300 bg-white px-3 py-2 text-sm"
                  disabled={!selectedFieldTemplateId || fieldsInSelectedGroup.length === 0}
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
            {availableFieldCatalog.length === 0 ? (
              <p className="mt-2 text-xs text-coral-tree-500">{t("template.editor.noFields")}</p>
            ) : null}
          </div>
        </div>
      ) : null}

      {/* DOCX Editor Modal */}
      {showEditor && editorBuffer && availableFieldCatalog.length > 0 ? (
        <DocxTemplateEditorModal
          docxPath={editorSource === "local" ? localDocxName || "local-template.docx" : docxPath}
          documentBuffer={editorBuffer}
          fieldCatalog={availableFieldCatalog}
          onClose={() => {
            setShowEditor(false);
            setEditorBuffer(null);
          }}
          onSaveDocx={saveEditorDocx}
          enableAutoBackup={editorSource === "managed"}
          autoBackupIntervalMs={60_000}
        />
      ) : null}
    </section>
  );
}
