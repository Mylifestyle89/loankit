"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef, useState } from "react";

import { useLanguage } from "@/components/language-provider";

type FieldCatalogItem = {
  field_key: string;
  label_vi: string;
  group: string;
};

type Props = {
  docxPath: string;
  documentBuffer: ArrayBuffer;
  fieldCatalog: FieldCatalogItem[];
  onClose: () => void;
  onSaveDocx: (buffer: ArrayBuffer) => Promise<void>;
};

// Loaded only in browser (DOM required)
const EigenpalDocxEditor = dynamic(
  async () => {
    const mod = await import("@eigenpal/docx-js-editor");
    return mod.DocxEditor;
  },
  { ssr: false },
);

type DocxEditorRef = {
  save: () => Promise<ArrayBuffer | undefined>;
  focus: () => void;
};

export function DocxTemplateEditorModal({ docxPath, documentBuffer, fieldCatalog, onClose, onSaveDocx }: Props) {
  const { t } = useLanguage();
  const editorRef = useRef<DocxEditorRef | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const fieldsByGroup = useMemo(() => {
    return fieldCatalog.reduce(
      (acc, field) => {
        const group = field.group || t("template.editor.ungrouped");
        (acc[group] ||= []).push(field);
        return acc;
      },
      {} as Record<string, FieldCatalogItem[]>,
    );
  }, [fieldCatalog, t]);

  const groups = useMemo(() => Object.keys(fieldsByGroup).sort((a, b) => a.localeCompare(b, "vi")), [fieldsByGroup]);

  const [selectedGroup, setSelectedGroup] = useState("");
  const [selectedFieldKey, setSelectedFieldKey] = useState("");
  const fieldsInSelectedGroup = selectedGroup ? fieldsByGroup[selectedGroup] ?? [] : [];

  useEffect(() => {
    if (!selectedGroup && groups.length > 0) {
      setSelectedGroup(groups[0]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groups.length]);

  useEffect(() => {
    if (fieldsInSelectedGroup.length > 0) {
      setSelectedFieldKey(fieldsInSelectedGroup[0].field_key);
    } else {
      setSelectedFieldKey("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedGroup]);

  async function copyPlaceholder() {
    if (!selectedFieldKey) return;
    const placeholder = `[${selectedFieldKey}]`;
    await navigator.clipboard.writeText(placeholder);
    editorRef.current?.focus();
  }

  async function handleSave() {
    setSaving(true);
    setError("");
    try {
      const buffer = await editorRef.current?.save();
      if (!buffer) {
        throw new Error("Failed to save DOCX buffer.");
      }
      await onSaveDocx(buffer);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save.");
      setSaving(false);
      return;
    }
    setSaving(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3">
      <div className="flex h-full max-h-[95vh] w-full max-w-7xl flex-col overflow-hidden rounded-xl bg-white shadow-xl">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-200 px-4 py-3">
          <div className="min-w-0">
            <p className="text-sm font-semibold">{t("template.editor.modal.title")}</p>
            <p className="text-xs text-zinc-500 truncate">{docxPath}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm hover:bg-zinc-50"
            >
              {t("template.editor.modal.close")}
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="rounded-md bg-emerald-600 px-3 py-1.5 text-sm text-white disabled:opacity-50 hover:bg-emerald-700"
            >
              {saving ? t("template.editor.modal.saving") : t("template.editor.modal.save")}
            </button>
          </div>
        </div>

        <div className="border-b border-zinc-200 bg-zinc-50 px-4 py-3">
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs text-zinc-600">{t("template.editor.selectGroup")}</label>
              <select
                value={selectedGroup}
                onChange={(e) => setSelectedGroup(e.target.value)}
                className="min-w-48 rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm"
              >
                {groups.map((group) => (
                  <option key={group} value={group}>
                    {group} ({fieldsByGroup[group]?.length ?? 0})
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-zinc-600">{t("template.editor.selectField")}</label>
              <select
                value={selectedFieldKey}
                onChange={(e) => setSelectedFieldKey(e.target.value)}
                className="min-w-72 rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm"
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
              onClick={() => void copyPlaceholder()}
              disabled={!selectedFieldKey}
              className="rounded-md bg-indigo-600 px-4 py-2 text-sm text-white disabled:opacity-50 hover:bg-indigo-700"
              title={selectedFieldKey ? `[${selectedFieldKey}]` : ""}
            >
              {t("template.editor.injectButton")}
            </button>

            <p className="text-xs text-zinc-500">
              {t("template.editor.desc")}
            </p>
          </div>
          {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}
        </div>

        <div className="flex-1 overflow-auto bg-white">
          <EigenpalDocxEditor ref={editorRef as any} documentBuffer={documentBuffer} />
        </div>
      </div>
    </div>
  );
}

