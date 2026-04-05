"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";
import { Upload, ChevronDown, ChevronUp } from "lucide-react";
import * as XLSX from "xlsx";
import { useCustomerStore } from "../../stores/use-customer-store";
import { useFieldTemplateStore } from "../../stores/use-field-template-store";
import { useUiStore } from "../../stores/use-ui-store";
import { useMappingDataStore } from "../../stores/use-mapping-data-store";
import { useLanguage } from "@/components/language-provider";
import { SidebarExportBlock } from "./sidebar-export-block";

type SidebarDataIoSectionProps = {
  handleImportFieldFile: (
    e: React.ChangeEvent<HTMLInputElement>,
    options?: { mode?: "append" | "overwrite"; templateName?: string | null },
  ) => void;
  onCloseSidebar: () => void;
};

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
}

export function SidebarDataIoSection({ handleImportFieldFile, onCloseSidebar }: SidebarDataIoSectionProps) {
  const { t } = useLanguage();
  const { customers, selectedCustomerId } = useCustomerStore();
  const { fieldTemplates, allFieldTemplates, selectedFieldTemplateId, editingFieldTemplateId } = useFieldTemplateStore();
  const importingCatalog = useUiStore((s) => s.modals.importingCatalog);
  const fieldCatalog = useMappingDataStore((s) => s.fieldCatalog);

  const [sectionOpen, setSectionOpen] = useState(false);
  const [exportingCatalog, setExportingCatalog] = useState(false);
  const [exportTemplateId, setExportTemplateId] = useState("");
  const [exportScope, setExportScope] = useState<"customer" | "common" | "all">("customer");
  const [importMode, setImportMode] = useState<"append" | "overwrite">("append");
  const [importNameDialogOpen, setImportNameDialogOpen] = useState(false);
  const [importNameInput, setImportNameInput] = useState("");
  const importInputRef = useRef<HTMLInputElement | null>(null);
  const pendingFileRef = useRef<React.ChangeEvent<HTMLInputElement> | null>(null);
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);

  useEffect(() => { setPortalTarget(document.body); }, []);

  const commonTemplates = useMemo(() => allFieldTemplates, [allFieldTemplates]);

  const exportTemplateOptions = useMemo(() => {
    if (exportScope === "customer") return selectedCustomerId ? fieldTemplates : [];
    if (exportScope === "common") return commonTemplates;
    return allFieldTemplates;
  }, [exportScope, selectedCustomerId, fieldTemplates, commonTemplates, allFieldTemplates]);

  useEffect(() => {
    if (exportScope === "customer") { setExportTemplateId(selectedCustomerId ? selectedFieldTemplateId || fieldTemplates[0]?.id || "" : ""); return; }
    if (exportScope === "common") { setExportTemplateId(commonTemplates[0]?.id || ""); return; }
    setExportTemplateId(editingFieldTemplateId || allFieldTemplates[0]?.id || "");
  }, [exportScope, selectedCustomerId, selectedFieldTemplateId, fieldTemplates, commonTemplates, editingFieldTemplateId, allFieldTemplates]);

  const selectedExportTemplate = exportTemplateOptions.find((t) => t.id === exportTemplateId) ?? null;
  const exportSourceCatalog = editingFieldTemplateId && exportTemplateId === editingFieldTemplateId
    ? fieldCatalog : (selectedExportTemplate?.field_catalog ?? []);
  const exportRows = exportSourceCatalog.map((f) => ({ "Tên field": f.label_vi ?? "", "Nhóm": f.group ?? "", "Loại": f.type ?? "text" }));
  const safeTemplateName = (selectedExportTemplate?.name?.trim() || "field-template")
    .replace(/[\\/:*?"<>|]+/g, "-").replace(/\s+/g, "_").slice(0, 60);
  const selectedTemplateName = selectedExportTemplate?.name?.trim() || "field-template";

  function exportCatalogCsv() {
    if (!exportRows.length) return;
    setExportingCatalog(true);
    try {
      const headers = ["Tên field", "Nhóm", "Loại"];
      const rows = exportRows.map((r) => headers.map((k) => `"${String(r[k as keyof typeof r] ?? "").replace(/"/g, '""')}"`).join(","));
      downloadBlob(new Blob(["\uFEFF" + [headers.join(","), ...rows].join("\r\n")], { type: "text/csv;charset=utf-8;" }), `${safeTemplateName}-fields.csv`);
    } finally { setExportingCatalog(false); }
  }

  function exportCatalogXlsx() {
    if (!exportRows.length) return;
    setExportingCatalog(true);
    try {
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(exportRows), "Fields");
      downloadBlob(new Blob([XLSX.write(wb, { type: "array", bookType: "xlsx" })], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }), `${safeTemplateName}-fields.xlsx`);
    } finally { setExportingCatalog(false); }
  }

  function innerHandleImport(e: React.ChangeEvent<HTMLInputElement>) {
    if (importMode === "append") {
      pendingFileRef.current = e;
      setImportNameInput(selectedTemplateName !== "field-template" ? `${selectedTemplateName} - bản import` : "Template import mới");
      setImportNameDialogOpen(true);
    } else {
      handleImportFieldFile(e, { mode: "overwrite", templateName: null });
      onCloseSidebar();
    }
  }

  function handleConfirmImportName() {
    const name = importNameInput.trim();
    if (!name || !pendingFileRef.current) {
      if (pendingFileRef.current) pendingFileRef.current.target.value = "";
      pendingFileRef.current = null;
      setImportNameDialogOpen(false);
      return;
    }
    handleImportFieldFile(pendingFileRef.current, { mode: "append", templateName: name });
    pendingFileRef.current = null;
    setImportNameInput("");
    setImportNameDialogOpen(false);
    onCloseSidebar();
  }

  return (
    <>
      <div className="space-y-3">
        <button
          type="button"
          onClick={() => setSectionOpen((v) => !v)}
          className="flex w-full items-center justify-between rounded-lg px-1 py-1 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 transition-colors hover:bg-slate-100/60 dark:hover:bg-white/[0.06]"
        >
          <span>2. Thao tác hệ thống</span>
          {sectionOpen ? <ChevronUp className="h-4 w-4 text-slate-400 dark:text-slate-500" /> : <ChevronDown className="h-4 w-4 text-slate-400 dark:text-slate-500" />}
        </button>

        {sectionOpen ? (
          <>
            {/* Import block */}
            <div className="space-y-2 rounded-lg border border-slate-200/60 dark:border-white/[0.07] bg-white/70 dark:bg-[#141414]/90 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300">Import</p>
              <input ref={importInputRef} type="file" accept=".csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" aria-label="Import field từ file" className="hidden" onChange={innerHandleImport} />
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-600 dark:text-slate-300">{t("mapping.import.modeLabel")}</label>
                <select value={importMode} onChange={(e) => setImportMode(e.target.value as "append" | "overwrite")} aria-label={t("mapping.import.modeLabel")} className="w-full rounded-lg border border-slate-200/80 dark:border-white/[0.09] bg-white dark:bg-white/[0.05] dark:text-slate-100 px-3 py-2 text-sm font-medium focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-400/30 dark:focus:ring-amber-400/20">
                  <option value="append">{t("mapping.import.mode.append")}</option>
                  <option value="overwrite">{t("mapping.import.mode.overwrite")}</option>
                </select>
              </div>
              <button type="button" onClick={() => importInputRef.current?.click()} disabled={importingCatalog} className="flex w-full items-center justify-center gap-2 rounded-lg border border-slate-200/80 dark:border-white/[0.09] bg-white dark:bg-[#141414]/90 px-4 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-200 transition-all duration-200 hover:bg-slate-100/50 dark:hover:bg-white/[0.06] disabled:opacity-75">
                <Upload className="h-4 w-4 text-slate-600 dark:text-slate-300" />
                {importingCatalog ? t("mapping.import.loading") : t("mapping.import.button")}
              </button>
            </div>

            {/* Export block — extracted component */}
            <SidebarExportBlock
              t={t}
              customers={customers}
              selectedCustomerId={selectedCustomerId}
              exportScope={exportScope}
              setExportScope={setExportScope}
              exportTemplateId={exportTemplateId}
              setExportTemplateId={setExportTemplateId}
              exportTemplateOptions={exportTemplateOptions}
              exportFieldCount={exportRows.length}
              exportingCatalog={exportingCatalog}
              onExportCsv={exportCatalogCsv}
              onExportXlsx={exportCatalogXlsx}
            />
          </>
        ) : null}
      </div>

      {/* Import name dialog portal */}
      {importNameDialogOpen && portalTarget && createPortal(
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} className="fixed inset-0 z-[110] bg-black/20 backdrop-blur-sm" onClick={() => setImportNameDialogOpen(false)} aria-hidden="true" />
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ duration: 0.2 }} className="fixed inset-0 z-[111] flex items-center justify-center p-4">
            <div className="w-full max-w-md rounded-xl border border-slate-200 dark:border-white/[0.07] bg-white dark:bg-[#141414]/90 shadow-2xl">
              <div className="border-b border-slate-200 dark:border-white/[0.07] px-6 py-4">
                <h3 className="text-base font-semibold text-slate-800 dark:text-slate-200">Nhập tên template</h3>
              </div>
              <div className="px-6 py-4">
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-2">Tên field template mới</label>
                <input type="text" value={importNameInput} onChange={(e) => setImportNameInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") handleConfirmImportName(); if (e.key === "Escape") setImportNameDialogOpen(false); }} placeholder="Nhập tên..." autoFocus className="w-full rounded-lg border border-slate-200 dark:border-white/[0.09] bg-slate-50 dark:bg-white/[0.04] px-3 py-2.5 text-sm text-slate-900 dark:text-slate-100 focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-400/30 dark:focus:ring-amber-400/20" />
              </div>
              <div className="border-t border-slate-200 dark:border-white/[0.07] px-6 py-3 flex items-center justify-end gap-2">
                <button type="button" onClick={() => setImportNameDialogOpen(false)} className="rounded-lg border border-slate-200 dark:border-white/[0.09] bg-white dark:bg-[#141414]/90 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 transition-colors hover:bg-slate-100 dark:hover:bg-white/[0.06]">Hủy</button>
                <button type="button" onClick={handleConfirmImportName} disabled={!importNameInput.trim()} className="rounded-lg bg-gradient-to-r from-amber-600 to-orange-500 px-4 py-2 text-sm font-medium text-white transition-all hover:brightness-110 shadow-sm shadow-amber-500/25 disabled:opacity-60">Xác nhận</button>
              </div>
            </div>
          </motion.div>
        </>,
        portalTarget,
      )}
    </>
  );
}
