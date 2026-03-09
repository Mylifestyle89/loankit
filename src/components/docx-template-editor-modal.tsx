"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { X, Save, Copy, FolderOpen } from "lucide-react";
import type { DocxEditorRef as EigenpalDocxEditorRef } from "@eigenpal/docx-js-editor";

import { useLanguage } from "@/components/language-provider";
import { DocxEditorErrorBoundary } from "@/components/docx-editor-error-boundary";

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
  enableAutoBackup?: boolean;
  autoBackupIntervalMs?: number;
  onFallbackToOnlyOffice?: () => void;
};

// Loaded only in browser (DOM required)
const EigenpalDocxEditor = dynamic(
  async () => {
    const mod = await import("@eigenpal/docx-js-editor");
    return mod.DocxEditor;
  },
  { ssr: false },
);

export function DocxTemplateEditorModal({
  docxPath,
  documentBuffer,
  fieldCatalog,
  onClose,
  onSaveDocx,
  enableAutoBackup = false,
  autoBackupIntervalMs = 60_000,
  onFallbackToOnlyOffice,
}: Props) {
  const { t } = useLanguage();
  const editorRef = useRef<EigenpalDocxEditorRef | null>(null);
  const editorElementRef = useRef<HTMLElement | null>(null);
  const backingUpRef = useRef(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [lastBackupAt, setLastBackupAt] = useState<string>("");

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
  const fieldsInSelectedGroup = useMemo(
    () => (selectedGroup ? fieldsByGroup[selectedGroup] ?? [] : []),
    [fieldsByGroup, selectedGroup],
  );

  // Get Vietnamese label for selected field
  const selectedFieldLabel = useMemo(() => {
    if (!selectedFieldKey) return "";
    const field = fieldCatalog.find((f) => f.field_key === selectedFieldKey);
    return field?.label_vi || selectedFieldKey;
  }, [selectedFieldKey, fieldCatalog]);

  useEffect(() => {
    if (groups.length === 0) {
      setSelectedGroup("");
      return;
    }
    if (!selectedGroup || !groups.includes(selectedGroup)) {
      setSelectedGroup(groups[0]);
    }
  }, [groups, selectedGroup]);

  useEffect(() => {
    if (fieldsInSelectedGroup.length === 0) {
      setSelectedFieldKey("");
      return;
    }
    setSelectedFieldKey((prev) =>
      fieldsInSelectedGroup.some((field) => field.field_key === prev) ? prev : fieldsInSelectedGroup[0].field_key,
    );
  }, [fieldsInSelectedGroup]);

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
      } catch {
        // Try next insertion strategy
      }
    }

    // Approach 2: Try execCommand (works in most browsers)
    if (!inserted) {
      try {
        const success = document.execCommand('insertText', false, placeholder);
        if (success) {
          inserted = true;
        }
      } catch {
        // Try next insertion strategy
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
        } catch {
          // Fallback to clipboard flow below
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

  const runAutoBackup = useCallback(async (): Promise<void> => {
    if (!enableAutoBackup || backingUpRef.current) return;
    backingUpRef.current = true;
    try {
      const buffer = await editorRef.current?.save();
      if (!buffer || buffer.byteLength < 100) return;
      const res = await fetch(`/api/report/template/save-docx?path=${encodeURIComponent(docxPath)}&mode=backup`, {
        method: "PUT",
        headers: { "Content-Type": "application/octet-stream" },
        body: buffer,
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!data.ok) {
        throw new Error(data.error ?? "Auto backup failed.");
      }
      setLastBackupAt(
        new Date().toLocaleString("vi-VN", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: false,
        }),
      );
    } catch (e) {
      // Non-blocking warning. User can still continue editing.
      setError(e instanceof Error ? e.message : "Auto backup failed.");
    } finally {
      backingUpRef.current = false;
    }
  }, [docxPath, enableAutoBackup]);

  async function openBackupFolder() {
    setError("");
    try {
      const res = await fetch("/api/report/template/open-backup-folder", {
        method: "POST",
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) {
        throw new Error(data.error ?? "Không thể mở thư mục backup.");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không thể mở thư mục backup.");
    }
  }

  useEffect(() => {
    if (!enableAutoBackup) return;
    const timer = window.setInterval(() => {
      void runAutoBackup();
    }, Math.max(15_000, autoBackupIntervalMs));
    return () => window.clearInterval(timer);
  }, [enableAutoBackup, autoBackupIntervalMs, runAutoBackup]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3 backdrop-blur-sm">
      <div className="flex h-full max-h-[95vh] w-full max-w-7xl flex-col overflow-hidden rounded-2xl bg-white shadow-[0_24px_80px_rgba(0,0,0,0.18)] dark:bg-[#141414] dark:shadow-[0_24px_80px_rgba(0,0,0,0.6)]">

        {/* ── Header ── */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/70 px-4 py-3 dark:border-white/[0.08]">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              {t("template.editor.modal.title")}
            </p>
            <p className="truncate text-xs text-slate-500 dark:text-slate-400">{docxPath}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => void openBackupFolder()}
              className="flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-700 transition-colors hover:bg-slate-50 dark:border-white/[0.10] dark:text-slate-300 dark:hover:bg-white/[0.06]"
              title="Mở thư mục backup"
            >
              <FolderOpen className="h-4 w-4" />
              Mở backup
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-700 transition-colors hover:bg-slate-50 dark:border-white/[0.10] dark:text-slate-300 dark:hover:bg-white/[0.06]"
            >
              <X className="h-4 w-4" />
              {t("template.editor.modal.close")}
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-sm text-white shadow-sm transition-colors hover:bg-emerald-700 disabled:opacity-50 dark:bg-emerald-600 dark:hover:bg-emerald-700"
            >
              <Save className="h-4 w-4" />
              {saving ? t("template.editor.modal.saving") : t("template.editor.modal.save")}
            </button>
          </div>
        </div>

        {/* ── Placeholder Toolbar ── */}
        <div className="border-b border-slate-200/70 bg-slate-50/80 px-4 py-3 dark:border-white/[0.07] dark:bg-[#1a1a1a]/80">
          {enableAutoBackup ? (
            <p className="mb-2 text-xs text-slate-500 dark:text-slate-400">
              Auto backup mỗi {Math.round(autoBackupIntervalMs / 1000)} giây
              {lastBackupAt ? ` • Lần gần nhất: ${lastBackupAt}` : ""}
            </p>
          ) : null}
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-slate-600 dark:text-slate-400">
                {t("template.editor.selectGroup")}
              </label>
              <select
                value={selectedGroup}
                onChange={(e) => setSelectedGroup(e.target.value)}
                className="min-w-48 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-white/[0.10] dark:bg-[#141414]/80 dark:text-slate-100"
              >
                {groups.map((group) => (
                  <option key={group} value={group}>
                    {group} ({fieldsByGroup[group]?.length ?? 0})
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-slate-600 dark:text-slate-400">
                {t("template.editor.selectField")}
              </label>
              <select
                value={selectedFieldKey}
                onChange={(e) => setSelectedFieldKey(e.target.value)}
                className="min-w-72 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:opacity-50 dark:border-white/[0.10] dark:bg-[#141414]/80 dark:text-slate-100"
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
              className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-indigo-700 disabled:opacity-50 dark:bg-indigo-600 dark:hover:bg-indigo-700"
              title={selectedFieldKey ? `Chèn [${selectedFieldLabel}] vào vị trí con trỏ` : ""}
            >
              <Copy className="h-4 w-4" />
              {t("template.editor.injectButton")}
            </button>

            <p className="text-xs text-slate-500 dark:text-slate-500">
              {t("template.editor.desc")}
            </p>
          </div>
          {error ? (
            <p className="mt-2 text-sm text-red-600 dark:text-rose-400">{error}</p>
          ) : null}
        </div>

        {/* ── Editor canvas ── */}
        <div className="docx-editor-wrap flex-1 overflow-auto bg-slate-100 dark:bg-[#0a0a0a]">
          <DocxEditorErrorBoundary onClose={onClose} onFallbackToOnlyOffice={onFallbackToOnlyOffice}>
            <EigenpalDocxEditor ref={editorRef} documentBuffer={documentBuffer} />
          </DocxEditorErrorBoundary>
        </div>

      </div>
    </div>
  );
}

