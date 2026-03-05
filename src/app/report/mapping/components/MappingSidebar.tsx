import { Users, FileText, Upload, ChevronsDown, X, Download, PanelRightClose, PanelRightOpen, Search, Library, Settings, ChevronDown, ChevronUp } from "lucide-react";
import { useEffect, useMemo, useReducer, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import * as XLSX from "xlsx";
import type { FieldCatalogItem } from "@/lib/report/config-schema";
import type { FieldTemplateItem } from "../types";

export type MappingSidebarProps = {
  t: (key: string) => string;
  customers: { id: string; customer_name: string; customer_code: string }[];
  selectedCustomerId: string;
  setSelectedCustomerId: (id: string) => void;
  loadingCustomers: boolean;
  loading: boolean;
  fieldCatalog: FieldCatalogItem[];
  fieldTemplates: FieldTemplateItem[];
  allFieldTemplates: FieldTemplateItem[];
  selectedFieldTemplateId: string;
  editingFieldTemplateId: string;
  applySelectedFieldTemplate: (id: string) => void;
  loadingFieldTemplates: boolean;
  openCreateFieldTemplateModal: () => void;
  openAttachFieldTemplateModal: () => void;
  openEditFieldTemplatePicker: () => void;
  showTechnicalKeys: boolean;
  setShowTechnicalKeys: (v: boolean) => void;
  importingCatalog: boolean;
  handleImportFieldFile: (
    e: React.ChangeEvent<HTMLInputElement>,
    options?: { mode?: "append" | "overwrite"; templateName?: string | null },
  ) => void;
  openMergeGroupsModal: () => void;
  setEditingFieldTemplateId: (id: string) => void;
  setEditingFieldTemplateName: (name: string) => void;
  isMappingValid?: boolean;
};

type MergeState = {
  files: File[];
  outputName: string;
  withPageBreak: boolean;
  merging: boolean;
  notice: { type: "success" | "error"; text: string } | null;
};

type MergeAction =
  | { type: "SET_FILES"; files: File[] }
  | { type: "SET_OUTPUT_NAME"; name: string }
  | { type: "SET_PAGE_BREAK"; value: boolean }
  | { type: "START" }
  | { type: "SUCCESS"; fileCount: number }
  | { type: "ERROR"; message: string }
  | { type: "CLEAR_NOTICE" }
  | { type: "FINISH" };

const MERGE_INITIAL: MergeState = {
  files: [],
  outputName: "merged-template",
  withPageBreak: true,
  merging: false,
  notice: null,
};

function mergeReducer(state: MergeState, action: MergeAction): MergeState {
  switch (action.type) {
    case "SET_FILES":      return { ...state, files: action.files, notice: null };
    case "SET_OUTPUT_NAME": return { ...state, outputName: action.name };
    case "SET_PAGE_BREAK":  return { ...state, withPageBreak: action.value };
    case "START":           return { ...state, merging: true, notice: null };
    case "SUCCESS":         return { ...state, notice: { type: "success", text: `Đã nối thành công ${action.fileCount} file DOCX.` } };
    case "ERROR":           return { ...state, notice: { type: "error", text: action.message } };
    case "CLEAR_NOTICE":    return { ...state, notice: null };
    case "FINISH":          return { ...state, merging: false };
  }
}

export function MappingSidebar({
  t,
  customers,
  selectedCustomerId,
  setSelectedCustomerId,
  loadingCustomers,
  loading,
  fieldCatalog,
  fieldTemplates,
  allFieldTemplates,
  selectedFieldTemplateId,
  editingFieldTemplateId,
  applySelectedFieldTemplate,
  loadingFieldTemplates,
  openCreateFieldTemplateModal,
  openAttachFieldTemplateModal,
  openEditFieldTemplatePicker,
  showTechnicalKeys,
  setShowTechnicalKeys,
  importingCatalog,
  handleImportFieldFile,
  openMergeGroupsModal,
  setEditingFieldTemplateId,
  setEditingFieldTemplateName,
  isMappingValid = false,
}: MappingSidebarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [exportingCatalog, setExportingCatalog] = useState(false);
  const [exportTemplateId, setExportTemplateId] = useState("");
  const [exportScope, setExportScope] = useState<"customer" | "common" | "all">("customer");
  const [importMode, setImportMode] = useState<"append" | "overwrite">("append");
  const [templatePickerOpen, setTemplatePickerOpen] = useState(false);
  const [templateQuery, setTemplateQuery] = useState("");
  const [showFabHint, setShowFabHint] = useState(true);
  const [sectionOpen, setSectionOpen] = useState({
    context: true,
    utility: false,
    actions: false,
  });
  const [mergeState, dispatchMerge] = useReducer(mergeReducer, MERGE_INITIAL);
  const importInputRef = useRef<HTMLInputElement | null>(null);
  const mergeNoticeTimerRef = useRef<number | null>(null);
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);
  const [importNameDialogOpen, setImportNameDialogOpen] = useState(false);
  const [importNameInput, setImportNameInput] = useState("");
  const pendingFileEventRef = useRef<React.ChangeEvent<HTMLInputElement> | null>(null);

  useEffect(() => { setPortalTarget(document.body); }, []);

  useEffect(() => {
    return () => {
      if (mergeNoticeTimerRef.current !== null) {
        window.clearTimeout(mergeNoticeTimerRef.current);
      }
    };
  }, []);

  const innerHandleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (importMode === "append") {
      const defaultName =
        (selectedTemplateName && selectedTemplateName !== "field-template"
          ? `${selectedTemplateName} - bản import`
          : "Template import mới");
      pendingFileEventRef.current = e;
      setImportNameInput(defaultName);
      setImportNameDialogOpen(true);
    } else {
      handleImportFieldFile(e, { mode: importMode, templateName: null });
      setIsOpen(false);
    }
  };

  const handleConfirmImportName = () => {
    const inputName = importNameInput.trim();
    if (!inputName || !pendingFileEventRef.current) {
      setImportNameDialogOpen(false);
      if (pendingFileEventRef.current) {
        pendingFileEventRef.current.target.value = "";
      }
      pendingFileEventRef.current = null;
      return;
    }
    handleImportFieldFile(pendingFileEventRef.current, { mode: "append", templateName: inputName });
    setImportNameDialogOpen(false);
    setImportNameInput("");
    pendingFileEventRef.current = null;
    setIsOpen(false);
  };

  const commonTemplates = useMemo(
    () => allFieldTemplates,
    // ↑ Mostrar TODAS as templates - biblioteca é compartilhada para todos os clientes
    [allFieldTemplates],
  );

  const selectedTemplate = useMemo(
    () => allFieldTemplates.find((item) => item.id === selectedFieldTemplateId) ?? null,
    [allFieldTemplates, selectedFieldTemplateId],
  );

  const normalizedTemplateQuery = templateQuery.trim().toLowerCase();

  const filteredInstances = useMemo(
    () =>
      fieldTemplates.filter((tpl) =>
        normalizedTemplateQuery ? tpl.name.toLowerCase().includes(normalizedTemplateQuery) : true,
      ),
    [fieldTemplates, normalizedTemplateQuery],
  );

  const filteredMasters = useMemo(
    () =>
      commonTemplates.filter((tpl) =>
        normalizedTemplateQuery ? tpl.name.toLowerCase().includes(normalizedTemplateQuery) : true,
      ),
    [commonTemplates, normalizedTemplateQuery],
  );

  const formatRelativeTime = (iso?: string) => {
    if (!iso) return "vừa xong";
    const ms = Date.now() - new Date(iso).getTime();
    if (Number.isNaN(ms) || ms < 0) return "vừa xong";
    const minute = 60_000;
    const hour = 60 * minute;
    const day = 24 * hour;
    if (ms < hour) return `${Math.max(1, Math.floor(ms / minute))} phút trước`;
    if (ms < day) return `${Math.floor(ms / hour)} giờ trước`;
    return `${Math.floor(ms / day)} ngày trước`;
  };

  const exportTemplateOptions = useMemo(() => {
    if (exportScope === "customer") {
      return selectedCustomerId ? fieldTemplates : [];
    }
    if (exportScope === "common") {
      return commonTemplates;
    }
    return allFieldTemplates;
  }, [exportScope, selectedCustomerId, fieldTemplates, commonTemplates, allFieldTemplates]);

  useEffect(() => {
    if (exportScope === "customer") {
      const next = selectedCustomerId ? selectedFieldTemplateId || fieldTemplates[0]?.id || "" : "";
      setExportTemplateId(next);
      return;
    }
    if (exportScope === "common") {
      const next = commonTemplates[0]?.id || "";
      setExportTemplateId(next);
      return;
    }
    if (editingFieldTemplateId) {
      setExportTemplateId(editingFieldTemplateId);
      return;
    }
    if (allFieldTemplates.length > 0) {
      setExportTemplateId(allFieldTemplates[0].id);
    } else {
      setExportTemplateId("");
    }
  }, [
    exportScope,
    selectedCustomerId,
    selectedFieldTemplateId,
    fieldTemplates,
    commonTemplates,
    editingFieldTemplateId,
    allFieldTemplates,
  ]);

  const selectedExportTemplate = exportTemplateOptions.find((item) => item.id === exportTemplateId) ?? null;
  const exportSourceCatalog =
    editingFieldTemplateId && exportTemplateId === editingFieldTemplateId
      ? fieldCatalog
      : (selectedExportTemplate?.field_catalog ?? []);

  const exportRows = exportSourceCatalog.map((field) => ({
    "Tên field": field.label_vi ?? "",
    "Nhóm": field.group ?? "",
    "Loại": field.type ?? "text",
  }));
  const exportFieldCount = exportRows.length;

  const selectedTemplateName = selectedExportTemplate?.name?.trim() || "field-template";
  const safeTemplateName = selectedTemplateName
    .replace(/[\\/:*?"<>|]+/g, "-")
    .replace(/\s+/g, "_")
    .slice(0, 60);

  function downloadBlob(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  }

  function toCsvValue(value: unknown): string {
    const text = String(value ?? "");
    const escaped = text.replace(/"/g, '""');
    return `"${escaped}"`;
  }

  function exportCatalogCsv() {
    if (exportRows.length === 0) return;
    setExportingCatalog(true);
    try {
      const headers = ["Tên field", "Nhóm", "Loại"];
      const rows = exportRows.map((row) => headers.map((key) => toCsvValue(row[key as keyof typeof row])).join(","));
      const csv = [headers.join(","), ...rows].join("\r\n");
      const bom = "\uFEFF";
      const blob = new Blob([bom + csv], { type: "text/csv;charset=utf-8;" });
      downloadBlob(blob, `${safeTemplateName}-fields.csv`);
    } finally {
      setExportingCatalog(false);
    }
  }

  function exportCatalogXlsx() {
    if (exportRows.length === 0) return;
    setExportingCatalog(true);
    try {
      const sheet = XLSX.utils.json_to_sheet(exportRows);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, sheet, "Fields");
      const xlsxBuffer = XLSX.write(workbook, { type: "array", bookType: "xlsx" });
      const blob = new Blob([xlsxBuffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      downloadBlob(blob, `${safeTemplateName}-fields.xlsx`);
    } finally {
      setExportingCatalog(false);
    }
  }

  function onPickMergeFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []).filter((file) => file.name.toLowerCase().endsWith(".docx"));
    dispatchMerge({ type: "SET_FILES", files });
  }

  async function runMergeDocx() {
    if (mergeState.files.length < 2) {
      dispatchMerge({ type: "ERROR", message: "Vui lòng chọn ít nhất 2 file DOCX để nối." });
      return;
    }
    dispatchMerge({ type: "START" });
    try {
      const form = new FormData();
      mergeState.files.forEach((file) => form.append("files", file));
      form.set("pageBreak", mergeState.withPageBreak ? "true" : "false");
      form.set("outputName", mergeState.outputName.trim() || "merged-template");
      const res = await fetch("/api/report/template/merge-docx", {
        method: "POST",
        body: form,
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? "Nối DOCX thất bại.");
      }
      const blob = await res.blob();
      const outputName = (mergeState.outputName.trim() || "merged-template").replace(/[^a-zA-Z0-9._-]+/g, "_");
      downloadBlob(blob, `${outputName}.docx`);
      dispatchMerge({ type: "SUCCESS", fileCount: mergeState.files.length });
      if (mergeNoticeTimerRef.current !== null) window.clearTimeout(mergeNoticeTimerRef.current);
      mergeNoticeTimerRef.current = window.setTimeout(() => dispatchMerge({ type: "CLEAR_NOTICE" }), 5000);
    } catch (error) {
      dispatchMerge({ type: "ERROR", message: error instanceof Error ? error.message : "Nối DOCX thất bại." });
    } finally {
      dispatchMerge({ type: "FINISH" });
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        title="Điều phối dữ liệu"
        aria-label="Mở bảng điều phối dữ liệu"
        className="fixed bottom-6 right-6 z-[95] flex h-14 w-14 items-center justify-center rounded-xl border border-indigo-300/50 bg-gradient-to-br from-indigo-600 to-violet-600 text-white shadow-xl shadow-indigo-500/30 ring-1 ring-white/30 transition-all duration-200 hover:scale-105 hover:shadow-2xl hover:shadow-indigo-500/40 focus:outline-none focus:ring-2 focus:ring-indigo-300/60"
      >
        <Users className="h-6 w-6" />
      </button>
      {showFabHint ? (
        <div className="fixed bottom-[84px] right-6 z-[95] max-w-[240px] rounded-lg border border-slate-200 bg-white dark:border-white/[0.07] dark:bg-[#141414]/90 px-3 py-2 text-xs text-slate-700 dark:text-slate-200 shadow-xl">
          <button
            type="button"
            onClick={() => setShowFabHint(false)}
            className="absolute right-1 top-1 rounded p-1 text-slate-400 dark:text-slate-500 transition-colors hover:bg-slate-100 dark:hover:bg-white/[0.07] hover:text-slate-700 dark:hover:text-slate-200"
            aria-label="Đóng gợi ý điều phối dữ liệu"
          >
            <X className="h-3.5 w-3.5" />
          </button>
          <p className="pr-5 font-medium">Bấm vào đây để điều phối dữ liệu.</p>
        </div>
      ) : null}

      {/* Portal: overlay + panel render in document.body to escape
               ancestor backdrop-filter containing block */}
      {portalTarget && createPortal(
        <>
          <AnimatePresence>
            {isOpen ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="fixed inset-0 z-[100] bg-black/20 backdrop-blur-sm"
                onClick={() => setIsOpen(false)}
                aria-hidden="true"
              />
            ) : null}
          </AnimatePresence>

          <AnimatePresence>
            {isOpen ? (
              <motion.div
                initial={{ x: "100%" }}
                animate={{ x: 0, width: isCollapsed ? 72 : 400 }}
                exit={{ x: "100%" }}
                transition={{ x: { type: "spring", damping: 28, stiffness: 300 }, width: { type: "spring", damping: 28, stiffness: 300 } }}
                className="fixed inset-y-0 right-0 z-[101] flex h-screen min-h-screen flex-col border-l border-slate-200/60 dark:border-white/[0.07] bg-slate-50/80 dark:bg-[#141414]/90 shadow-2xl backdrop-blur-xl"
              >
                {/* Header */}
                <div className="flex shrink-0 items-center justify-between border-b border-slate-200/60 dark:border-white/[0.07] px-4 py-3">
                  {!isCollapsed ? (
                    <div className="flex items-center gap-2">
                      <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-indigo-300/50 bg-gradient-to-br from-indigo-600 to-violet-600 text-white shadow-glow">
                        <Users className="h-4 w-4" />
                      </span>
                      <h2 className="text-base font-semibold text-slate-800 dark:text-slate-200">Điều phối dữ liệu</h2>
                    </div>
                  ) : null}
                  <div className="ml-auto flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setIsCollapsed((c) => !c)}
                      aria-label={isCollapsed ? "Mở rộng sidebar" : "Thu gọn sidebar"}
                      className="rounded-lg p-2 text-slate-600 dark:text-slate-300 transition-all duration-200 hover:bg-slate-100/50 dark:hover:bg-white/[0.07]"
                    >
                      {isCollapsed ? <PanelRightOpen className="h-5 w-5" /> : <PanelRightClose className="h-5 w-5" />}
                    </button>
                    <button
                      onClick={() => setIsOpen(false)}
                      aria-label="Đóng sidebar cài đặt"
                      title="Đóng"
                      className="rounded-lg p-2 text-slate-600 dark:text-slate-300 transition-all duration-200 hover:bg-slate-100/50 dark:hover:bg-white/[0.07] hover:text-indigo-600 dark:hover:text-indigo-400"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                </div>

                {/* Scrollable body */}
                <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overflow-x-hidden">
                  {isCollapsed ? (
                    <div className="flex flex-col items-center gap-1 px-2 py-4">
                      <span className="mb-1 text-[10px] font-medium text-slate-400 dark:text-slate-500">Menu</span>
                      <button type="button" onClick={() => importInputRef.current?.click()} disabled={importingCatalog} className="rounded-lg p-2 text-slate-600 dark:text-slate-300 transition-all duration-200 hover:bg-slate-100/50 dark:hover:bg-white/[0.07]" title={t("mapping.import.button")}><Upload className="h-5 w-5" /></button>
                      <button type="button" onClick={exportCatalogCsv} disabled={exportingCatalog || !exportTemplateId || exportFieldCount === 0} className="rounded-lg p-2 text-slate-600 dark:text-slate-300 transition-all duration-200 hover:bg-slate-100/50 dark:hover:bg-white/[0.07]" title={t("mapping.export.csv")}><Download className="h-5 w-5" /></button>
                      <button type="button" onClick={exportCatalogXlsx} disabled={exportingCatalog || !exportTemplateId || exportFieldCount === 0} className="rounded-lg p-2 text-slate-600 dark:text-slate-300 transition-all duration-200 hover:bg-slate-100/50 dark:hover:bg-white/[0.07]" title={t("mapping.export.xlsx")}><Download className="h-5 w-5" /></button>
                    </div>
                  ) : (
                    <div className="flex-1 space-y-6 px-4 py-5">
                      <div className="space-y-3">
                        <button
                          type="button"
                          onClick={() => setSectionOpen((prev) => ({ ...prev, context: !prev.context }))}
                          className="flex w-full items-center justify-between rounded-lg px-1 py-1 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 transition-colors hover:bg-slate-100/60 dark:hover:bg-white/[0.06]"
                        >
                          <span>1. Ngữ cảnh làm việc</span>
                          {sectionOpen.context ? <ChevronUp className="h-4 w-4 text-slate-400 dark:text-slate-500" /> : <ChevronDown className="h-4 w-4 text-slate-400 dark:text-slate-500" />}
                        </button>
                        {sectionOpen.context ? (
                          <>
                            <div className="space-y-2">
                              <label className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-200"><Users className="h-4 w-4 text-slate-600 dark:text-slate-300" />Dữ liệu khách hàng</label>
                              <select value={selectedCustomerId} onChange={(e) => { setEditingFieldTemplateId(""); setEditingFieldTemplateName(""); setSelectedCustomerId(e.target.value); }} aria-label="Chọn dữ liệu khách hàng" disabled={loadingCustomers || loading} className="w-full rounded-lg border border-slate-200/80 dark:border-white/[0.09] bg-white/90 dark:bg-white/[0.05] px-3 py-2.5 text-sm font-medium text-slate-800 dark:text-slate-100 transition-all duration-200 hover:bg-slate-100/50 dark:hover:bg-white/[0.06] focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-400/30 dark:focus:ring-indigo-400/20 disabled:opacity-70">
                                <option value="">{t("mapping.selectCustomer")}</option>
                                {customers.map((c) => (<option key={c.id} value={c.id}>{c.customer_name} ({c.customer_code})</option>))}
                              </select>
                            </div>
                            <div className="space-y-2">
                              <label className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-200"><FileText className="h-4 w-4 text-slate-600 dark:text-slate-300" />Mẫu dữ liệu</label>
                              <div className="relative">
                                <button
                                  type="button"
                                  onClick={() => setTemplatePickerOpen((v) => !v)}
                                  disabled={loadingFieldTemplates}
                                  className={`flex w-full items-center justify-between rounded-lg border bg-white/90 dark:bg-white/[0.05] px-3 py-2.5 text-left text-sm font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-400/30 dark:focus:ring-indigo-400/20 disabled:opacity-70 ${selectedFieldTemplateId ? "border-indigo-200 dark:border-indigo-500/30 bg-indigo-50/50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 shadow-sm" : "border-slate-200/80 dark:border-white/[0.09] text-slate-800 dark:text-slate-100 hover:bg-slate-100/50 dark:hover:bg-white/[0.06]"}`}
                                >
                                  <span className="truncate">
                                    {selectedTemplate?.name ?? t("mapping.selectFieldTemplate")}
                                  </span>
                                  <span className="ml-2 text-slate-500 dark:text-slate-400">▾</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    openEditFieldTemplatePicker();
                                    setIsOpen(false);
                                  }}
                                  className="absolute right-9 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-slate-500 dark:text-slate-400 transition-colors hover:bg-slate-100 dark:hover:bg-white/[0.07] hover:text-indigo-600 dark:hover:text-indigo-400"
                                  title="Manage templates"
                                >
                                  <Settings className="h-4 w-4" />
                                </button>

                                <AnimatePresence>
                                  {templatePickerOpen ? (
                                    <motion.div
                                      initial={{ opacity: 0, y: -6 }}
                                      animate={{ opacity: 1, y: 0 }}
                                      exit={{ opacity: 0, y: -6 }}
                                      className="absolute z-20 mt-2 w-full overflow-hidden rounded-xl border border-slate-200 dark:border-white/[0.07] bg-white dark:bg-[#141414]/90 shadow-xl"
                                    >
                                      <div className="border-b border-slate-200 dark:border-white/[0.07] p-2">
                                        <div className="relative">
                                          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
                                          <input
                                            value={templateQuery}
                                            onChange={(e) => setTemplateQuery(e.target.value)}
                                            placeholder="Tìm template..."
                                            className="h-9 w-full rounded-lg border border-slate-200 dark:border-white/[0.09] dark:bg-white/[0.05] dark:text-slate-100 pl-8 pr-2 text-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-400/20 dark:focus:ring-indigo-400/20"
                                          />
                                        </div>
                                      </div>
                                      <div className="max-h-72 overflow-y-auto p-2">
                                        {selectedCustomerId && filteredInstances.length > 0 ? (
                                          <div className="mb-2">
                                            <p className="px-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-indigo-500">
                                              Hồ sơ hiện tại
                                            </p>
                                            {filteredInstances.map((tpl) => (
                                              <button
                                                key={tpl.id}
                                                type="button"
                                                onClick={() => {
                                                  applySelectedFieldTemplate(tpl.id);
                                                  setTemplatePickerOpen(false);
                                                }}
                                                className={`mb-1 flex w-full items-start justify-between rounded-lg px-2 py-2 text-left transition-colors ${selectedFieldTemplateId === tpl.id
                                                    ? "bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400"
                                                    : "hover:bg-slate-100/70 dark:hover:bg-white/[0.06] text-slate-700 dark:text-slate-200"
                                                  }`}
                                              >
                                                <span className="min-w-0">
                                                  <span className="block truncate text-sm font-medium">{tpl.name}</span>
                                                  <span className="block truncate text-[11px] text-slate-500 dark:text-slate-400">
                                                    Cập nhật {formatRelativeTime(tpl.created_at)}
                                                  </span>
                                                </span>
                                                <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-emerald-50 dark:bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700 dark:text-emerald-400">
                                                  <span className={`h-1.5 w-1.5 rounded-full ${isMappingValid ? "bg-emerald-500" : "bg-amber-400"}`} />
                                                  {isMappingValid ? "Đã hoàn thiện" : "Đang soạn thảo"}
                                                </span>
                                              </button>
                                            ))}
                                          </div>
                                        ) : null}

                                        <div>
                                          <p className="px-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                            Thư viện mẫu
                                          </p>
                                          {filteredMasters.length > 0 ? (
                                            filteredMasters.map((tpl) => (
                                              <button
                                                key={tpl.id}
                                                type="button"
                                                onClick={() => {
                                                  applySelectedFieldTemplate(tpl.id);
                                                  setTemplatePickerOpen(false);
                                                }}
                                                className={`mb-1 flex w-full items-start justify-between rounded-lg px-2 py-2 text-left transition-colors ${selectedFieldTemplateId === tpl.id
                                                    ? "bg-slate-100 dark:bg-white/[0.06] text-slate-800 dark:text-slate-200"
                                                    : "hover:bg-slate-100/70 dark:hover:bg-white/[0.06] text-slate-700 dark:text-slate-200"
                                                  }`}
                                              >
                                                <span className="min-w-0">
                                                  <span className="block truncate text-sm font-medium">{tpl.name}</span>
                                                  <span className="block truncate text-[11px] text-slate-500 dark:text-slate-400">
                                                    Mẫu chuẩn hệ thống
                                                  </span>
                                                </span>
                                                <span className="ml-2 inline-flex items-center rounded-full bg-slate-100 dark:bg-white/[0.06] px-1.5 py-0.5 text-[10px] font-medium text-slate-600 dark:text-slate-300">
                                                  <Library className="mr-1 h-3 w-3" />
                                                  Library
                                                </span>
                                              </button>
                                            ))
                                          ) : (
                                            <p className="rounded-lg border border-dashed border-slate-200 dark:border-white/[0.10] bg-slate-50 dark:bg-white/[0.04] px-3 py-2 text-xs text-slate-500 dark:text-slate-400">
                                              Không tìm thấy template phù hợp.
                                            </p>
                                          )}
                                        </div>

                                        {selectedCustomerId && filteredInstances.length === 0 ? (
                                          <p className="mt-2 rounded-lg border border-indigo-100 dark:border-indigo-500/30 bg-indigo-50 dark:bg-indigo-500/10 px-3 py-2 text-xs text-indigo-700 dark:text-indigo-400">
                                            Chọn mẫu từ thư viện để bắt đầu tạo hồ sơ.
                                          </p>
                                        ) : null}
                                      </div>
                                    </motion.div>
                                  ) : null}
                                </AnimatePresence>
                              </div>
                              <div className="flex flex-wrap items-center gap-2 pt-1">
                                <button type="button" onClick={() => { openCreateFieldTemplateModal(); setIsOpen(false); }} className="rounded-lg border border-slate-200/80 dark:border-white/[0.09] bg-white dark:bg-[#141414]/90 px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 transition-all duration-200 hover:bg-slate-100/50 dark:hover:bg-white/[0.06]">Tạo mẫu mới</button>
                                <button type="button" onClick={() => { openAttachFieldTemplateModal(); setIsOpen(false); }} disabled={!selectedFieldTemplateId} className={`rounded-lg border px-3 py-2 text-xs font-medium transition-all duration-200 ${!selectedFieldTemplateId ? "cursor-not-allowed border-slate-200/60 dark:border-white/[0.07] bg-slate-50 dark:bg-white/[0.04] text-slate-400 dark:text-slate-500" : "border-slate-200/80 dark:border-white/[0.09] bg-white dark:bg-[#141414]/90 text-slate-700 dark:text-slate-200 hover:bg-slate-100/50 dark:hover:bg-white/[0.06]"}`}>Áp dụng mẫu</button>
                                <button type="button" onClick={() => { openEditFieldTemplatePicker(); setIsOpen(false); }} className="rounded-lg border border-slate-200/80 dark:border-white/[0.09] bg-white dark:bg-[#141414]/90 px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 transition-all duration-200 hover:bg-slate-100/50 dark:hover:bg-white/[0.06]">Chỉnh sửa tên mẫu</button>
                              </div>
                            </div>
                          </>
                        ) : null}
                      </div>

                      <hr className="border-slate-200/60 dark:border-white/[0.07]" />

                      <div className="space-y-3">
                        <button
                          type="button"
                          onClick={() => setSectionOpen((prev) => ({ ...prev, utility: !prev.utility }))}
                          className="flex w-full items-center justify-between rounded-lg px-1 py-1 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 transition-colors hover:bg-slate-100/60 dark:hover:bg-white/[0.06]"
                        >
                          <span>2. Các tiện ích</span>
                          {sectionOpen.utility ? <ChevronUp className="h-4 w-4 text-slate-400 dark:text-slate-500" /> : <ChevronDown className="h-4 w-4 text-slate-400 dark:text-slate-500" />}
                        </button>
                        {sectionOpen.utility ? (
                          <>
                            <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-slate-200/60 dark:border-white/[0.07] bg-white/70 dark:bg-[#141414]/90 p-3 transition-all duration-200 hover:bg-slate-100/50 dark:hover:bg-white/[0.06]">
                              <input type="checkbox" checked={showTechnicalKeys} onChange={(e) => setShowTechnicalKeys(e.target.checked)} className="mt-0.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" />
                              <div>
                                <span className="block text-sm font-medium text-slate-800 dark:text-slate-200">{t("mapping.showTechnicalKeys")}</span>
                                <span className="text-xs text-slate-600 dark:text-slate-300">Phục vụ coder gán mapping vào mẫu Docx.</span>
                              </div>
                            </label>
                            <button type="button" onClick={() => { setIsOpen(false); openMergeGroupsModal(); }} className="flex w-full items-center gap-2 rounded-lg border border-slate-200/60 dark:border-white/[0.07] bg-white/70 dark:bg-[#141414]/90 px-3 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-200 transition-all duration-200 hover:bg-slate-100/50 dark:hover:bg-white/[0.06]">
                              <ChevronsDown className="h-4 w-4 text-slate-600 dark:text-slate-300" />{t("mapping.mergeGroups")}
                            </button>
                            <div className="space-y-2 rounded-lg border border-slate-200/60 dark:border-white/[0.07] bg-white/70 dark:bg-[#141414]/90 p-3">
                              <p className="text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300">Tiện ích nối nhiều DOCX</p>
                              <label className="flex flex-col gap-1 text-xs">
                                <span className="text-slate-600 dark:text-slate-300">Danh sách file DOCX</span>
                                <input
                                  type="file"
                                  multiple
                                  accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                                  onChange={onPickMergeFiles}
                                  className="block w-full text-xs dark:text-slate-300 file:mr-2 file:rounded-md file:border file:border-slate-200/80 dark:file:border-white/[0.09] file:bg-white dark:file:bg-white/[0.05] file:px-2 file:py-1.5 file:text-xs file:font-medium file:text-slate-700 dark:file:text-slate-200 hover:file:bg-slate-50 dark:hover:file:bg-white/[0.06]"
                                />
                              </label>
                              <label className="flex flex-col gap-1 text-xs">
                                <span className="text-slate-600 dark:text-slate-300">Tên file kết quả</span>
                                <input
                                  type="text"
                                  value={mergeState.outputName}
                                  onChange={(e) => dispatchMerge({ type: "SET_OUTPUT_NAME", name: e.target.value })}
                                  placeholder="merged-template"
                                  className="rounded-lg border border-slate-200/80 dark:border-white/[0.09] bg-white dark:bg-white/[0.05] dark:text-slate-100 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-400/30 dark:focus:ring-indigo-400/20"
                                />
                              </label>
                              <label className="inline-flex items-center gap-2 text-xs text-slate-700 dark:text-slate-200">
                                <input
                                  type="checkbox"
                                  checked={mergeState.withPageBreak}
                                  onChange={(e) => dispatchMerge({ type: "SET_PAGE_BREAK", value: e.target.checked })}
                                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                />
                                Chèn ngắt trang giữa các file
                              </label>
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => void runMergeDocx()}
                                  disabled={mergeState.merging || mergeState.files.length < 2}
                                  className="rounded-lg bg-gradient-to-r from-violet-600 to-indigo-600 px-3 py-2 text-xs font-medium text-white transition-all hover:from-violet-700 hover:to-indigo-700 disabled:opacity-50"
                                >
                                  {mergeState.merging ? "Đang nối..." : "Nối DOCX và tải về"}
                                </button>
                                <span className="text-[11px] text-slate-500 dark:text-slate-400">Đã chọn: {mergeState.files.length} file</span>
                              </div>
                              {mergeState.notice ? (
                                <p
                                  className={`rounded-lg border px-2.5 py-2 text-xs ${
                                    mergeState.notice.type === "success"
                                      ? "border-emerald-200 dark:border-emerald-500/30 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                                      : "border-rose-200 dark:border-rose-500/30 bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400"
                                  }`}
                                >
                                  {mergeState.notice.text}
                                </p>
                              ) : null}
                            </div>
                          </>
                        ) : null}
                      </div>

                      <hr className="border-slate-200/60 dark:border-white/[0.07]" />

                      <div className="space-y-3">
                        <button
                          type="button"
                          onClick={() => setSectionOpen((prev) => ({ ...prev, actions: !prev.actions }))}
                          className="flex w-full items-center justify-between rounded-lg px-1 py-1 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 transition-colors hover:bg-slate-100/60 dark:hover:bg-white/[0.06]"
                        >
                          <span>3. Thao tác hệ thống</span>
                          {sectionOpen.actions ? <ChevronUp className="h-4 w-4 text-slate-400 dark:text-slate-500" /> : <ChevronDown className="h-4 w-4 text-slate-400 dark:text-slate-500" />}
                        </button>
                        {sectionOpen.actions ? (
                          <>
                            <div className="space-y-2 rounded-lg border border-slate-200/60 dark:border-white/[0.07] bg-white/70 dark:bg-[#141414]/90 p-3">
                              <p className="text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300">Import</p>
                              <input ref={importInputRef} type="file" accept=".csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" aria-label="Import field từ file" className="hidden" onChange={innerHandleImport} />
                              <div className="space-y-1">
                                <label className="text-xs font-medium text-slate-600 dark:text-slate-300">{t("mapping.import.modeLabel")}</label>
                                <select value={importMode} onChange={(e) => setImportMode(e.target.value as "append" | "overwrite")} aria-label={t("mapping.import.modeLabel")} className="w-full rounded-lg border border-slate-200/80 dark:border-white/[0.09] bg-white dark:bg-white/[0.05] dark:text-slate-100 px-3 py-2 text-sm font-medium focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-400/30 dark:focus:ring-indigo-400/20">
                                  <option value="append">{t("mapping.import.mode.append")}</option>
                                  <option value="overwrite">{t("mapping.import.mode.overwrite")}</option>
                                </select>
                              </div>
                              <button type="button" onClick={() => importInputRef.current?.click()} disabled={importingCatalog} className="flex w-full items-center justify-center gap-2 rounded-lg border border-slate-200/80 dark:border-white/[0.09] bg-white dark:bg-[#141414]/90 px-4 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-200 transition-all duration-200 hover:bg-slate-100/50 dark:hover:bg-white/[0.06] disabled:opacity-75">
                                <Upload className="h-4 w-4 text-slate-600 dark:text-slate-300" />{importingCatalog ? t("mapping.import.loading") : t("mapping.import.button")}
                              </button>
                            </div>
                            <div className="space-y-2 rounded-lg border border-slate-200/60 dark:border-white/[0.07] bg-indigo-50/50 dark:bg-indigo-500/10 p-3">
                              <p className="text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300">Export</p>
                              <label className="text-xs font-medium text-slate-600 dark:text-slate-300">{t("mapping.export.scopeLabel")}</label>
                              <select value={exportScope} onChange={(e) => setExportScope(e.target.value as "customer" | "common" | "all")} aria-label={t("mapping.export.scopeLabel")} className="w-full rounded-lg border border-slate-200/80 dark:border-white/[0.09] bg-white dark:bg-white/[0.05] dark:text-slate-100 px-3 py-2 text-sm font-medium focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-400/30 dark:focus:ring-indigo-400/20">
                                <option value="customer">{t("mapping.export.scope.customer")}</option>
                                <option value="common">{t("mapping.export.scope.common")}</option>
                                <option value="all">{t("mapping.export.scope.all")}</option>
                              </select>
                              {exportScope === "customer" ? (selectedCustomerId ? <p className="text-xs text-slate-600 dark:text-slate-300">Khách hàng: <span className="font-medium">{customers.find((c) => c.id === selectedCustomerId)?.customer_name ?? t("mapping.selectCustomer")}</span></p> : <p className="text-xs text-amber-600">{t("mapping.export.scope.customerHint")}</p>) : null}
                              {exportScope === "common" ? <p className="text-xs text-slate-600 dark:text-slate-300">{t("mapping.export.scope.commonHint")}</p> : null}
                              <label className="text-xs font-medium text-slate-600 dark:text-slate-300">{t("mapping.export.templateLabel")}</label>
                              <select value={exportTemplateId} onChange={(e) => setExportTemplateId(e.target.value)} aria-label={t("mapping.export.templateLabel")} disabled={exportTemplateOptions.length === 0} className="w-full rounded-lg border border-slate-200/80 dark:border-white/[0.09] bg-white dark:bg-white/[0.05] dark:text-slate-100 px-3 py-2 text-sm font-medium disabled:opacity-70 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-400/30 dark:focus:ring-indigo-400/20">
                                <option value="">{t("mapping.export.templatePlaceholder")}</option>
                                {exportTemplateOptions.map((tpl) => (<option key={tpl.id} value={tpl.id}>{tpl.name}</option>))}
                              </select>
                              <p className="text-xs text-slate-600 dark:text-slate-300">{t("mapping.export.fieldCount").replace("{count}", String(exportFieldCount))}</p>
                            </div>
                            <button type="button" onClick={exportCatalogCsv} disabled={exportingCatalog || !exportTemplateId || exportFieldCount === 0} className="flex w-full items-center justify-center gap-2 rounded-lg border border-slate-200/80 dark:border-white/[0.09] bg-white dark:bg-[#141414]/90 px-4 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-200 transition-all duration-200 hover:bg-slate-100/50 dark:hover:bg-white/[0.06] disabled:opacity-75">
                              <Download className="h-4 w-4 text-slate-600 dark:text-slate-300" />{t("mapping.export.csv")}
                            </button>
                            <button type="button" onClick={exportCatalogXlsx} disabled={exportingCatalog || !exportTemplateId || exportFieldCount === 0} className="flex w-full items-center justify-center gap-2 rounded-lg border border-slate-200/80 dark:border-white/[0.09] bg-white dark:bg-[#141414]/90 px-4 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-200 transition-all duration-200 hover:bg-slate-100/50 dark:hover:bg-white/[0.06] disabled:opacity-75">
                              <Download className="h-4 w-4 text-slate-600 dark:text-slate-300" />{t("mapping.export.xlsx")}
                            </button>
                          </>
                        ) : null}
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </>,
        portalTarget,
      )}

      {/* Import Name Dialog */}
      {importNameDialogOpen && portalTarget && createPortal(
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[110] bg-black/20 backdrop-blur-sm"
            onClick={() => setImportNameDialogOpen(false)}
            aria-hidden="true"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[111] flex items-center justify-center p-4"
          >
            <div className="w-full max-w-md rounded-xl border border-slate-200 dark:border-white/[0.07] bg-white dark:bg-[#141414]/90 shadow-2xl">
              <div className="border-b border-slate-200 dark:border-white/[0.07] px-6 py-4">
                <h3 className="text-base font-semibold text-slate-800 dark:text-slate-200">
                  Nhập tên template
                </h3>
              </div>
              <div className="px-6 py-4 space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-2">
                    Tên field template mới
                  </label>
                  <input
                    type="text"
                    value={importNameInput}
                    onChange={(e) => setImportNameInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleConfirmImportName();
                      if (e.key === "Escape") setImportNameDialogOpen(false);
                    }}
                    placeholder="Nhập tên..."
                    autoFocus
                    className="w-full rounded-lg border border-slate-200 dark:border-white/[0.09] bg-slate-50 dark:bg-white/[0.04] px-3 py-2.5 text-sm text-slate-900 dark:text-slate-100 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-400/30 dark:focus:ring-indigo-400/20"
                  />
                </div>
              </div>
              <div className="border-t border-slate-200 dark:border-white/[0.07] px-6 py-3 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setImportNameDialogOpen(false)}
                  className="rounded-lg border border-slate-200 dark:border-white/[0.09] bg-white dark:bg-[#141414]/90 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 transition-colors hover:bg-slate-100 dark:hover:bg-white/[0.06]"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  onClick={handleConfirmImportName}
                  className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700 disabled:opacity-60"
                  disabled={!importNameInput.trim()}
                >
                  Xác nhận
                </button>
              </div>
            </div>
          </motion.div>
        </>,
        portalTarget,
      )}
    </>
  );
}
