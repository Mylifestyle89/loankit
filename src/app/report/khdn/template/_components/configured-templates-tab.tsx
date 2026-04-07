"use client";

import { useCallback, useEffect, useState } from "react";
import { useLanguage } from "@/components/language-provider";
import { FieldInjectionToolbar } from "./field-injection-toolbar";
import { FieldCoveragePanel } from "./field-coverage-panel";

type FieldCatalogItem = { field_key: string; label_vi: string; group: string; type: string };
type FieldTemplateItem = { id: string; name: string; field_catalog: FieldCatalogItem[] };

type FieldInjectionProps = {
  fieldTemplates: FieldTemplateItem[];
  selectedFieldTemplateId: string;
  setSelectedFieldTemplateId: (id: string) => void;
  groups: string[];
  selectedGroup: string;
  setSelectedGroup: (g: string) => void;
  fieldsByGroup: Record<string, FieldCatalogItem[]>;
  fieldsInSelectedGroup: FieldCatalogItem[];
  selectedFieldKey: string;
  setSelectedFieldKey: (k: string) => void;
  injectField: () => void;
  copyFeedback: string | null;
  fieldCatalog: FieldCatalogItem[];
};

type ConfiguredTemplatesTabProps = {
  templates: { id: string; template_name: string; docx_path: string; active: boolean }[];
  activeTemplateId: string;
  onActiveTemplateChange: (id: string) => void;
  profileDocxPath: string;
  openingEditor: boolean;
  removing: boolean;
  onOpenDocx: () => void;
  onOpenEditor: () => void;
  onOpenLocal: () => void;
  onRemoveTemplate: () => void;
  fi: FieldInjectionProps;
};

export function ConfiguredTemplatesTab({
  templates, activeTemplateId, onActiveTemplateChange, profileDocxPath,
  openingEditor, removing, onOpenDocx, onOpenEditor, onOpenLocal, onRemoveTemplate, fi,
}: ConfiguredTemplatesTabProps) {
  const { t } = useLanguage();

  // Fetch placeholders for the active template (for coverage panel)
  const [placeholders, setPlaceholders] = useState<string[]>([]);
  const fetchPlaceholders = useCallback(async (templateId: string) => {
    if (!templateId) { setPlaceholders([]); return; }
    try {
      const res = await fetch(`/api/report/template/placeholders?template_id=${encodeURIComponent(templateId)}`);
      const data = await res.json();
      if (data.ok) setPlaceholders(data.placeholders ?? []);
    } catch { /* best-effort */ }
  }, []);

  useEffect(() => {
    void fetchPlaceholders(activeTemplateId);
  }, [activeTemplateId, fetchPlaceholders]);

  if (templates.length === 0) return null;

  return (
    <div className="space-y-4">
    {/* Coverage panel — shows which placeholders have data */}
    {placeholders.length > 0 && <FieldCoveragePanel placeholders={placeholders} />}

    <div className="rounded-2xl border border-zinc-200 dark:border-white/[0.07] bg-white dark:bg-[#161616] p-4 shadow-sm">
      <h3 className="text-base font-bold tracking-tight">{t("template.editor.title")}</h3>
      <p className="mt-1 text-sm text-zinc-500 dark:text-slate-400">{t("template.editor.desc")}</p>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        {/* Template selector */}
        <select value={activeTemplateId} onChange={(e) => onActiveTemplateChange(e.target.value)} aria-label={t("template.editor.title")}
          className="rounded-lg border border-zinc-200 dark:border-white/[0.09] bg-white dark:bg-[#1a1a1a] dark:text-slate-100 px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40">
          {templates.map((tpl) => <option key={tpl.id} value={tpl.id}>{tpl.template_name} {tpl.active ? `(${t("template.active")})` : ""}</option>)}
        </select>
        {/* Action buttons */}
        <button type="button" onClick={onOpenDocx} disabled={!profileDocxPath}
          className="rounded-lg border border-zinc-200 dark:border-white/[0.09] bg-white dark:bg-[#1a1a1a] px-4 py-2 text-sm shadow-sm hover:border-brand-200 dark:hover:border-brand-500/20 disabled:opacity-50">
          {t("template.editor.openDocx")}
        </button>
        <button type="button" onClick={onOpenEditor} disabled={!profileDocxPath || openingEditor}
          className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white shadow-sm shadow-brand-500/25 hover:brightness-110 disabled:opacity-50">
          {openingEditor ? t("template.editor.modal.loading") : t("template.editor.openEditor")}
        </button>
        <button type="button" onClick={onOpenLocal} disabled={openingEditor}
          className="rounded-lg border border-zinc-200 dark:border-white/[0.09] bg-white dark:bg-[#1a1a1a] px-4 py-2 text-sm shadow-sm hover:border-brand-200 dark:hover:border-brand-500/20 disabled:opacity-50">
          {openingEditor ? "Đang mở..." : "Chọn file từ máy"}
        </button>
        <button type="button" onClick={onRemoveTemplate} disabled={removing || !activeTemplateId}
          className="rounded-lg border border-red-200 dark:border-red-500/20 bg-white dark:bg-[#1a1a1a] px-4 py-2 text-sm text-red-600 dark:text-red-400 shadow-sm hover:bg-red-50 dark:hover:bg-red-950/20 disabled:opacity-50">
          {removing ? "Đang xóa..." : "Loại bỏ mẫu"}
        </button>
      </div>
      <FieldInjectionToolbar
        fieldTemplates={fi.fieldTemplates} selectedFieldTemplateId={fi.selectedFieldTemplateId} onFieldTemplateChange={fi.setSelectedFieldTemplateId}
        groups={fi.groups} selectedGroup={fi.selectedGroup} onGroupChange={fi.setSelectedGroup} fieldsByGroup={fi.fieldsByGroup}
        fieldsInSelectedGroup={fi.fieldsInSelectedGroup} selectedFieldKey={fi.selectedFieldKey} onFieldKeyChange={fi.setSelectedFieldKey}
        onInject={fi.injectField} copyFeedback={fi.copyFeedback} fieldCatalogEmpty={fi.fieldCatalog.length === 0}
      />
    </div>
    </div>
  );
}
