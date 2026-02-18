"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef, useState } from "react";
import { X, Save, Copy } from "lucide-react";

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
  getEditorElement?: () => HTMLElement | null;
};

export function DocxTemplateEditorModal({ docxPath, documentBuffer, fieldCatalog, onClose, onSaveDocx }: Props) {
  const { t } = useLanguage();
  const editorRef = useRef<DocxEditorRef | null>(null);
  const editorElementRef = useRef<HTMLElement | null>(null);
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
  
  // Get Vietnamese label for selected field
  const selectedFieldLabel = useMemo(() => {
    if (!selectedFieldKey) return "";
    const field = fieldCatalog.find((f) => f.field_key === selectedFieldKey);
    return field?.label_vi || selectedFieldKey;
  }, [selectedFieldKey, fieldCatalog]);

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

  // Find editor element after mount
  useEffect(() => {
    const findEditorElement = () => {
      const editorElement = document.querySelector('[contenteditable="true"]') as HTMLElement;
      if (editorElement) {
        editorElementRef.current = editorElement;
      }
    };
    
    // Try immediately and also after delays to catch async mounting
    findEditorElement();
    const timeout1 = setTimeout(findEditorElement, 300);
    const timeout2 = setTimeout(findEditorElement, 1000);
    
    return () => {
      clearTimeout(timeout1);
      clearTimeout(timeout2);
    };
  }, []);

  async function insertPlaceholder() {
    if (!selectedFieldKey || !selectedFieldLabel) return;
    
    const placeholder = `[${selectedFieldLabel}]`;
    
    // Focus editor first
    editorRef.current?.focus();
    
    // Wait a bit for focus to take effect
    await new Promise((resolve) => setTimeout(resolve, 100));
    
    // Try multiple approaches to insert text
    let inserted = false;
    
    // Approach 1: Use Selection API if there's an active selection
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      try {
        const range = selection.getRangeAt(0);
        range.deleteContents();
        const textNode = document.createTextNode(placeholder);
        range.insertNode(textNode);
        // Move cursor after inserted text
        range.setStartAfter(textNode);
        range.collapse(true);
        selection.removeAllRanges();
        selection.addRange(range);
        inserted = true;
      } catch (e) {
        console.warn("Failed to insert via Selection API:", e);
      }
    }
    
    // Approach 2: Try execCommand (works in most browsers)
    if (!inserted) {
      try {
        const success = document.execCommand('insertText', false, placeholder);
        if (success) {
          inserted = true;
        }
      } catch (e) {
        console.warn("execCommand failed:", e);
      }
    }
    
    // Approach 3: Find contenteditable element and insert
    if (!inserted) {
      const editorElement = editorElementRef.current || 
        (document.querySelector('[contenteditable="true"]') as HTMLElement);
      
      if (editorElement) {
        editorElement.focus();
        try {
          const success = document.execCommand('insertText', false, placeholder);
          if (success) {
            inserted = true;
          }
        } catch (e) {
          console.warn("Failed to insert via execCommand on element:", e);
        }
      }
    }
    
    // Fallback: copy to clipboard if all else fails
    if (!inserted) {
      await navigator.clipboard.writeText(placeholder);
      setError("Không thể chèn trực tiếp. Đã copy vào clipboard. Vui lòng paste (Ctrl+V).");
      setTimeout(() => setError(""), 3000);
    }
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
              className="flex items-center gap-1.5 rounded-md border border-zinc-300 px-3 py-1.5 text-sm hover:bg-zinc-50"
            >
              <X className="h-4 w-4" />
              {t("template.editor.modal.close")}
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-1.5 rounded-md bg-emerald-600 px-3 py-1.5 text-sm text-white disabled:opacity-50 hover:bg-emerald-700"
            >
              <Save className="h-4 w-4" />
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
              onClick={() => void insertPlaceholder()}
              disabled={!selectedFieldKey}
              className="flex items-center gap-2 rounded-md bg-indigo-600 px-4 py-2 text-sm text-white disabled:opacity-50 hover:bg-indigo-700"
              title={selectedFieldKey ? `Chèn [${selectedFieldLabel}] vào vị trí con trỏ` : ""}
            >
              <Copy className="h-4 w-4" />
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

