import { Users, FileText, Upload, ChevronsDown, X, Download, PanelRightClose, PanelRightOpen, Search, Library, Settings, ChevronDown, ChevronUp } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
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
  const [mergeFiles, setMergeFiles] = useState<File[]>([]);
  const [mergeOutputName, setMergeOutputName] = useState("merged-template");
  const [mergeWithPageBreak, setMergeWithPageBreak] = useState(true);
  const [mergingDocx, setMergingDocx] = useState(false);
  const [mergeDocxNotice, setMergeDocxNotice] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const importInputRef = useRef<HTMLInputElement | null>(null);
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);

  useEffect(() => { setPortalTarget(document.body); }, []);

  const innerHandleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    let templateName: string | null = null;
    if (importMode === "append") {
      const defaultName =
        (selectedTemplateName && selectedTemplateName !== "field-template"
          ? `${selectedTemplateName} - bản import`
          : "Template import mới");
      const inputName = window.prompt("Nhập tên field template mới để import:", defaultName);
      if (!inputName || !inputName.trim()) {
        e.target.value = "";
        return;
      }
      templateName = inputName.trim();
    }
    handleImportFieldFile(e, { mode: importMode, templateName });
    setIsOpen(false);
  };

  const commonTemplates = useMemo(
    () => allFieldTemplates.filter((template) => (template.assigned_customer_count ?? 0) === 0),
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
    setMergeFiles(files);
    setMergeDocxNotice(null);
  }

  async function runMergeDocx() {
    if (mergeFiles.length < 2) {
      setMergeDocxNotice({ type: "error", text: "Vui lòng chọn ít nhất 2 file DOCX để nối." });
      return;
    }
    setMergingDocx(true);
    setMergeDocxNotice(null);
    try {
      const form = new FormData();
      mergeFiles.forEach((file) => form.append("files", file));
      form.set("pageBreak", mergeWithPageBreak ? "true" : "false");
      form.set("outputName", mergeOutputName.trim() || "merged-template");
      const res = await fetch("/api/report/template/merge-docx", {
        method: "POST",
        body: form,
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? "Nối DOCX thất bại.");
      }
      const blob = await res.blob();
      const outputName = (mergeOutputName.trim() || "merged-template").replace(/[^a-zA-Z0-9._-]+/g, "_");
      downloadBlob(blob, `${outputName}.docx`);
      setMergeDocxNotice({ type: "success", text: `Đã nối thành công ${mergeFiles.length} file DOCX.` });
      window.setTimeout(() => setMergeDocxNotice(null), 5000);
    } catch (error) {
      setMergeDocxNotice({
        type: "error",
        text: error instanceof Error ? error.message : "Nối DOCX thất bại.",
      });
    } finally {
      setMergingDocx(false);
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
        <div className="fixed bottom-[84px] right-6 z-[95] max-w-[240px] rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 shadow-xl">
          <button
            type="button"
            onClick={() => setShowFabHint(false)}
            className="absolute right-1 top-1 rounded p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
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
                className="fixed inset-y-0 right-0 z-[101] flex h-screen min-h-screen flex-col border-l border-slate-200/60 bg-slate-50/80 shadow-2xl backdrop-blur-xl"
              >
                {/* Header */}
                <div className="flex shrink-0 items-center justify-between border-b border-slate-200/60 px-4 py-3">
                  {!isCollapsed ? (
                    <div className="flex items-center gap-2">
                      <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-indigo-300/50 bg-gradient-to-br from-indigo-600 to-violet-600 text-white shadow-glow">
                        <Users className="h-4 w-4" />
                      </span>
                      <h2 className="text-base font-semibold text-slate-800">Điều phối dữ liệu</h2>
                    </div>
                  ) : null}
                  <div className="ml-auto flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setIsCollapsed((c) => !c)}
                      aria-label={isCollapsed ? "Mở rộng sidebar" : "Thu gọn sidebar"}
                      className="rounded-lg p-2 text-slate-600 transition-all duration-200 hover:bg-slate-100/50"
                    >
                      {isCollapsed ? <PanelRightOpen className="h-5 w-5" /> : <PanelRightClose className="h-5 w-5" />}
                    </button>
                    <button
                      onClick={() => setIsOpen(false)}
                      aria-label="Đóng sidebar cài đặt"
                      title="Đóng"
                      className="rounded-lg p-2 text-slate-600 transition-all duration-200 hover:bg-slate-100/50 hover:text-indigo-600"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                </div>

                {/* Scrollable body */}
                <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overflow-x-hidden">
                  {isCollapsed ? (
                    <div className="flex flex-col items-center gap-1 px-2 py-4">
                      <span className="mb-1 text-[10px] font-medium text-slate-400">Menu</span>
                      <button type="button" onClick={() => importInputRef.current?.click()} disabled={importingCatalog} className="rounded-lg p-2 text-slate-600 transition-all duration-200 hover:bg-slate-100/50" title={t("mapping.import.button")}><Upload className="h-5 w-5" /></button>
                      <button type="button" onClick={exportCatalogCsv} disabled={exportingCatalog || !exportTemplateId || exportFieldCount === 0} className="rounded-lg p-2 text-slate-600 transition-all duration-200 hover:bg-slate-100/50" title={t("mapping.export.csv")}><Download className="h-5 w-5" /></button>
                      <button type="button" onClick={exportCatalogXlsx} disabled={exportingCatalog || !exportTemplateId || exportFieldCount === 0} className="rounded-lg p-2 text-slate-600 transition-all duration-200 hover:bg-slate-100/50" title={t("mapping.export.xlsx")}><Download className="h-5 w-5" /></button>
                    </div>
                  ) : (
                    <div className="flex-1 space-y-6 px-4 py-5">
                      <div className="space-y-3">
                        <button
                          type="button"
                          onClick={() => setSectionOpen((prev) => ({ ...prev, context: !prev.context }))}
                          className="flex w-full items-center justify-between rounded-lg px-1 py-1 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 transition-colors hover:bg-slate-100/60"
                        >
                          <span>1. Ngữ cảnh làm việc</span>
                          {sectionOpen.context ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
                        </button>
                        {sectionOpen.context ? (
                          <>
                            <div className="space-y-2">
                              <label className="flex items-center gap-2 text-sm font-medium text-slate-700"><Users className="h-4 w-4 text-slate-600" />Dữ liệu khách hàng</label>
                              <select value={selectedCustomerId} onChange={(e) => { setEditingFieldTemplateId(""); setEditingFieldTemplateName(""); setSelectedCustomerId(e.target.value); }} aria-label="Chọn dữ liệu khách hàng" disabled={loadingCustomers || loading} className="w-full rounded-lg border border-slate-200/80 bg-white/90 px-3 py-2.5 text-sm font-medium text-slate-800 transition-all duration-200 hover:bg-slate-100/50 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-400/30 disabled:opacity-70">
                                <option value="">{t("mapping.selectCustomer")}</option>
                                {customers.map((c) => (<option key={c.id} value={c.id}>{c.customer_name} ({c.customer_code})</option>))}
                              </select>
                            </div>
                            <div className="space-y-2">
                              <label className="flex items-center gap-2 text-sm font-medium text-slate-700"><FileText className="h-4 w-4 text-slate-600" />Mẫu dữ liệu</label>
                              <div className="relative">
                                <button
                                  type="button"
                                  onClick={() => setTemplatePickerOpen((v) => !v)}
                                  disabled={!selectedCustomerId || loadingFieldTemplates}
                                  className={`flex w-full items-center justify-between rounded-lg border bg-white/90 px-3 py-2.5 text-left text-sm font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-400/30 disabled:opacity-70 ${selectedFieldTemplateId ? "border-indigo-200 bg-indigo-50/50 text-indigo-700 shadow-sm" : "border-slate-200/80 text-slate-800 hover:bg-slate-100/50"}`}
                                >
                                  <span className="truncate">
                                    {selectedTemplate?.name ?? t("mapping.selectFieldTemplate")}
                                  </span>
                                  <span className="ml-2 text-slate-500">▾</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    openEditFieldTemplatePicker();
                                    setIsOpen(false);
                                  }}
                                  className="absolute right-9 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-slate-500 transition-colors hover:bg-slate-100 hover:text-indigo-600"
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
                                      className="absolute z-20 mt-2 w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl"
                                    >
                                      <div className="border-b border-slate-200 p-2">
                                        <div className="relative">
                                          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                                          <input
                                            value={templateQuery}
                                            onChange={(e) => setTemplateQuery(e.target.value)}
                                            placeholder="Tìm template..."
                                            className="h-9 w-full rounded-lg border border-slate-200 pl-8 pr-2 text-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-400/20"
                                          />
                                        </div>
                                      </div>
                                      <div className="max-h-72 overflow-y-auto p-2">
                                        {filteredInstances.length > 0 ? (
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
                                                    ? "bg-indigo-50 text-indigo-700"
                                                    : "hover:bg-slate-100/70 text-slate-700"
                                                  }`}
                                              >
                                                <span className="min-w-0">
                                                  <span className="block truncate text-sm font-medium">{tpl.name}</span>
                                                  <span className="block truncate text-[11px] text-slate-500">
                                                    Cập nhật {formatRelativeTime(tpl.created_at)}
                                                  </span>
                                                </span>
                                                <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-emerald-50 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700">
                                                  <span className={`h-1.5 w-1.5 rounded-full ${isMappingValid ? "bg-emerald-500" : "bg-amber-400"}`} />
                                                  {isMappingValid ? "Đã hoàn thiện" : "Đang soạn thảo"}
                                                </span>
                                              </button>
                                            ))}
                                          </div>
                                        ) : null}

                                        <div>
                                          <p className="px-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
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
                                                    ? "bg-slate-100 text-slate-800"
                                                    : "hover:bg-slate-100/70 text-slate-700"
                                                  }`}
                                              >
                                                <span className="min-w-0">
                                                  <span className="block truncate text-sm font-medium">{tpl.name}</span>
                                                  <span className="block truncate text-[11px] text-slate-500">
                                                    Mẫu chuẩn hệ thống
                                                  </span>
                                                </span>
                                                <span className="ml-2 inline-flex items-center rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-600">
                                                  <Library className="mr-1 h-3 w-3" />
                                                  Library
                                                </span>
                                              </button>
                                            ))
                                          ) : (
                                            <p className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-500">
                                              {selectedCustomerId
                                                ? "Không tìm thấy template phù hợp."
                                                : "Chọn khách hàng trước để tạo hồ sơ."}
                                            </p>
                                          )}
                                        </div>

                                        {selectedCustomerId && filteredInstances.length === 0 ? (
                                          <p className="mt-2 rounded-lg border border-indigo-100 bg-indigo-50 px-3 py-2 text-xs text-indigo-700">
                                            Chọn mẫu từ thư viện để bắt đầu tạo hồ sơ.
                                          </p>
                                        ) : null}
                                      </div>
                                    </motion.div>
                                  ) : null}
                                </AnimatePresence>
                              </div>
                              <div className="flex flex-wrap items-center gap-2 pt-1">
                                <button type="button" onClick={() => { openCreateFieldTemplateModal(); setIsOpen(false); }} className="rounded-lg border border-slate-200/80 bg-white px-3 py-2 text-xs font-medium text-slate-700 transition-all duration-200 hover:bg-slate-100/50">Tạo mẫu mới</button>
                                <button type="button" onClick={() => { openAttachFieldTemplateModal(); setIsOpen(false); }} disabled={!selectedFieldTemplateId} className={`rounded-lg border px-3 py-2 text-xs font-medium transition-all duration-200 ${!selectedFieldTemplateId ? "cursor-not-allowed border-slate-200/60 bg-slate-50 text-slate-400" : "border-slate-200/80 bg-white text-slate-700 hover:bg-slate-100/50"}`}>Áp dụng mẫu</button>
                                <button type="button" onClick={() => { openEditFieldTemplatePicker(); setIsOpen(false); }} className="rounded-lg border border-slate-200/80 bg-white px-3 py-2 text-xs font-medium text-slate-700 transition-all duration-200 hover:bg-slate-100/50">Chỉnh sửa tên mẫu</button>
                              </div>
                            </div>
                          </>
                        ) : null}
                      </div>

                      <hr className="border-slate-200/60" />

                      <div className="space-y-3">
                        <button
                          type="button"
                          onClick={() => setSectionOpen((prev) => ({ ...prev, utility: !prev.utility }))}
                          className="flex w-full items-center justify-between rounded-lg px-1 py-1 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 transition-colors hover:bg-slate-100/60"
                        >
                          <span>2. Các tiện ích</span>
                          {sectionOpen.utility ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
                        </button>
                        {sectionOpen.utility ? (
                          <>
                            <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-slate-200/60 bg-white/70 p-3 transition-all duration-200 hover:bg-slate-100/50">
                              <input type="checkbox" checked={showTechnicalKeys} onChange={(e) => setShowTechnicalKeys(e.target.checked)} className="mt-0.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" />
                              <div>
                                <span className="block text-sm font-medium text-slate-800">{t("mapping.showTechnicalKeys")}</span>
                                <span className="text-xs text-slate-600">Phục vụ coder gán mapping vào mẫu Docx.</span>
                              </div>
                            </label>
                            <button type="button" onClick={() => { setIsOpen(false); openMergeGroupsModal(); }} className="flex w-full items-center gap-2 rounded-lg border border-slate-200/60 bg-white/70 px-3 py-2.5 text-sm font-medium text-slate-700 transition-all duration-200 hover:bg-slate-100/50">
                              <ChevronsDown className="h-4 w-4 text-slate-600" />{t("mapping.mergeGroups")}
                            </button>
                            <div className="space-y-2 rounded-lg border border-slate-200/60 bg-white/70 p-3">
                              <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">Tiện ích nối nhiều DOCX</p>
                              <label className="flex flex-col gap-1 text-xs">
                                <span className="text-slate-600">Danh sách file DOCX</span>
                                <input
                                  type="file"
                                  multiple
                                  accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                                  onChange={onPickMergeFiles}
                                  className="block w-full text-xs file:mr-2 file:rounded-md file:border file:border-slate-200/80 file:bg-white file:px-2 file:py-1.5 file:text-xs file:font-medium file:text-slate-700 hover:file:bg-slate-50"
                                />
                              </label>
                              <label className="flex flex-col gap-1 text-xs">
                                <span className="text-slate-600">Tên file kết quả</span>
                                <input
                                  type="text"
                                  value={mergeOutputName}
                                  onChange={(e) => setMergeOutputName(e.target.value)}
                                  placeholder="merged-template"
                                  className="rounded-lg border border-slate-200/80 bg-white px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-400/30"
                                />
                              </label>
                              <label className="inline-flex items-center gap-2 text-xs text-slate-700">
                                <input
                                  type="checkbox"
                                  checked={mergeWithPageBreak}
                                  onChange={(e) => setMergeWithPageBreak(e.target.checked)}
                                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                />
                                Chèn ngắt trang giữa các file
                              </label>
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => void runMergeDocx()}
                                  disabled={mergingDocx || mergeFiles.length < 2}
                                  className="rounded-lg bg-gradient-to-r from-violet-600 to-indigo-600 px-3 py-2 text-xs font-medium text-white transition-all hover:from-violet-700 hover:to-indigo-700 disabled:opacity-50"
                                >
                                  {mergingDocx ? "Đang nối..." : "Nối DOCX và tải về"}
                                </button>
                                <span className="text-[11px] text-slate-500">Đã chọn: {mergeFiles.length} file</span>
                              </div>
                              {mergeDocxNotice ? (
                                <p
                                  className={`rounded-lg border px-2.5 py-2 text-xs ${
                                    mergeDocxNotice.type === "success"
                                      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                                      : "border-rose-200 bg-rose-50 text-rose-700"
                                  }`}
                                >
                                  {mergeDocxNotice.text}
                                </p>
                              ) : null}
                            </div>
                          </>
                        ) : null}
                      </div>

                      <hr className="border-slate-200/60" />

                      <div className="space-y-3">
                        <button
                          type="button"
                          onClick={() => setSectionOpen((prev) => ({ ...prev, actions: !prev.actions }))}
                          className="flex w-full items-center justify-between rounded-lg px-1 py-1 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 transition-colors hover:bg-slate-100/60"
                        >
                          <span>3. Thao tác hệ thống</span>
                          {sectionOpen.actions ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
                        </button>
                        {sectionOpen.actions ? (
                          <>
                            <div className="space-y-2 rounded-lg border border-slate-200/60 bg-white/70 p-3">
                              <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">Import</p>
                              <input ref={importInputRef} type="file" accept=".csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" aria-label="Import field từ file" className="hidden" onChange={innerHandleImport} />
                              <div className="space-y-1">
                                <label className="text-xs font-medium text-slate-600">{t("mapping.import.modeLabel")}</label>
                                <select value={importMode} onChange={(e) => setImportMode(e.target.value as "append" | "overwrite")} aria-label={t("mapping.import.modeLabel")} className="w-full rounded-lg border border-slate-200/80 bg-white px-3 py-2 text-sm font-medium focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-400/30">
                                  <option value="append">{t("mapping.import.mode.append")}</option>
                                  <option value="overwrite">{t("mapping.import.mode.overwrite")}</option>
                                </select>
                              </div>
                              <button type="button" onClick={() => importInputRef.current?.click()} disabled={importingCatalog} className="flex w-full items-center justify-center gap-2 rounded-lg border border-slate-200/80 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition-all duration-200 hover:bg-slate-100/50 disabled:opacity-75">
                                <Upload className="h-4 w-4 text-slate-600" />{importingCatalog ? t("mapping.import.loading") : t("mapping.import.button")}
                              </button>
                            </div>
                            <div className="space-y-2 rounded-lg border border-slate-200/60 bg-indigo-50/50 p-3">
                              <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">Export</p>
                              <label className="text-xs font-medium text-slate-600">{t("mapping.export.scopeLabel")}</label>
                              <select value={exportScope} onChange={(e) => setExportScope(e.target.value as "customer" | "common" | "all")} aria-label={t("mapping.export.scopeLabel")} className="w-full rounded-lg border border-slate-200/80 bg-white px-3 py-2 text-sm font-medium focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-400/30">
                                <option value="customer">{t("mapping.export.scope.customer")}</option>
                                <option value="common">{t("mapping.export.scope.common")}</option>
                                <option value="all">{t("mapping.export.scope.all")}</option>
                              </select>
                              {exportScope === "customer" ? (selectedCustomerId ? <p className="text-xs text-slate-600">Khách hàng: <span className="font-medium">{customers.find((c) => c.id === selectedCustomerId)?.customer_name ?? t("mapping.selectCustomer")}</span></p> : <p className="text-xs text-amber-600">{t("mapping.export.scope.customerHint")}</p>) : null}
                              {exportScope === "common" ? <p className="text-xs text-slate-600">{t("mapping.export.scope.commonHint")}</p> : null}
                              <label className="text-xs font-medium text-slate-600">{t("mapping.export.templateLabel")}</label>
                              <select value={exportTemplateId} onChange={(e) => setExportTemplateId(e.target.value)} aria-label={t("mapping.export.templateLabel")} disabled={exportTemplateOptions.length === 0} className="w-full rounded-lg border border-slate-200/80 bg-white px-3 py-2 text-sm font-medium disabled:opacity-70 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-400/30">
                                <option value="">{t("mapping.export.templatePlaceholder")}</option>
                                {exportTemplateOptions.map((tpl) => (<option key={tpl.id} value={tpl.id}>{tpl.name}</option>))}
                              </select>
                              <p className="text-xs text-slate-600">{t("mapping.export.fieldCount").replace("{count}", String(exportFieldCount))}</p>
                            </div>
                            <button type="button" onClick={exportCatalogCsv} disabled={exportingCatalog || !exportTemplateId || exportFieldCount === 0} className="flex w-full items-center justify-center gap-2 rounded-lg border border-slate-200/80 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition-all duration-200 hover:bg-slate-100/50 disabled:opacity-75">
                              <Download className="h-4 w-4 text-slate-600" />{t("mapping.export.csv")}
                            </button>
                            <button type="button" onClick={exportCatalogXlsx} disabled={exportingCatalog || !exportTemplateId || exportFieldCount === 0} className="flex w-full items-center justify-center gap-2 rounded-lg border border-slate-200/80 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition-all duration-200 hover:bg-slate-100/50 disabled:opacity-75">
                              <Download className="h-4 w-4 text-slate-600" />{t("mapping.export.xlsx")}
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
    </>
  );
}
