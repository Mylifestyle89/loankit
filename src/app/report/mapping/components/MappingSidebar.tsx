import { Users, FileText, Upload, ChevronsDown, X, Download } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
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
}: MappingSidebarProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [exportingCatalog, setExportingCatalog] = useState(false);
    const [exportTemplateId, setExportTemplateId] = useState("");
    const [exportScope, setExportScope] = useState<"customer" | "common" | "all">("customer");
    const [importMode, setImportMode] = useState<"append" | "overwrite">("append");
    const importInputRef = useRef<HTMLInputElement | null>(null);

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

    return (
        <>
            <button
                type="button"
                onClick={() => setIsOpen(true)}
                className="flex items-center gap-2 rounded-md bg-coral-tree-600 px-4 py-2 text-sm font-medium text-white shadow hover:bg-coral-tree-700 transition-colors"
            >
                <Users className="h-4 w-4" />
                Lựa chọn khách hàng
            </button>

            {/* Overlay */}
            {isOpen ? (
                <div
                    className="fixed inset-0 z-40 bg-black/20 transition-opacity backdrop-blur-sm"
                    onClick={() => setIsOpen(false)}
                />
            ) : null}

            {/* Sidebar Panel */}
            <div
                className={`fixed right-0 top-0 z-50 flex h-full w-[400px] flex-col overflow-auto bg-white shadow-2xl transition-transform duration-300 ${isOpen ? "translate-x-0" : "translate-x-full"}`}
            >
                <div className="flex items-center justify-between border-b border-coral-tree-200 px-5 py-4">
                    <h2 className="text-lg font-semibold text-coral-tree-800">Cài đặt nâng cao</h2>
                    <button
                        onClick={() => setIsOpen(false)}
                        aria-label="Đóng sidebar cài đặt"
                        title="Đóng"
                        className="rounded p-1.5 text-coral-tree-700 hover:bg-coral-tree-100 hover:text-coral-tree-900"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <div className="flex-1 space-y-6 px-5 py-6">
                    <div className="space-y-4">
                        <h3 className="text-xs font-semibold uppercase tracking-wider text-coral-tree-700">
                            1. Ngữ cảnh làm việc
                        </h3>

                        <div className="space-y-2">
                            <label className="flex items-center gap-2 text-sm font-medium text-coral-tree-700">
                                <Users className="h-4 w-4 text-coral-tree-700" />
                                Dữ liệu khách hàng
                            </label>
                            <select
                                value={selectedCustomerId}
                                onChange={(e) => {
                                    const customerId = e.target.value;
                                    setEditingFieldTemplateId("");
                                    setEditingFieldTemplateName("");
                                    setSelectedCustomerId(customerId);
                                }}
                                aria-label="Chọn dữ liệu khách hàng"
                                disabled={loadingCustomers || loading}
                                className="w-full rounded-md border border-coral-tree-300 px-3 py-2 text-sm disabled:opacity-70"
                            >
                                <option value="">{t("mapping.selectCustomer")}</option>
                                {customers.map((customer) => (
                                    <option key={customer.id} value={customer.id}>
                                        {customer.customer_name} ({customer.customer_code})
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="space-y-2">
                            <label className="flex items-center gap-2 text-sm font-medium text-coral-tree-700">
                                <FileText className="h-4 w-4 text-coral-tree-700" />
                                Mẫu dữ liệu
                            </label>
                            <select
                                value={selectedFieldTemplateId}
                                onChange={(e) => applySelectedFieldTemplate(e.target.value)}
                                aria-label="Chọn mẫu dữ liệu"
                                disabled={!selectedCustomerId || loadingFieldTemplates || fieldTemplates.length === 0}
                                className="w-full rounded-md border border-coral-tree-300 px-3 py-2 text-sm disabled:opacity-70"
                            >
                                <option value="">{t("mapping.selectFieldTemplate")}</option>
                                {fieldTemplates.map((template) => (
                                    <option key={template.id} value={template.id}>
                                        {template.name}
                                    </option>
                                ))}
                            </select>

                            <div className="flex flex-wrap items-center gap-2 pt-1">
                                <button
                                    type="button"
                                    onClick={() => {
                                        openCreateFieldTemplateModal();
                                        setIsOpen(false);
                                    }}
                                    className="rounded border border-coral-tree-300 bg-white px-2 py-1 text-xs font-medium text-coral-tree-700 hover:bg-coral-tree-50 hover:text-coral-tree-900"
                                >
                                    Tạo mẫu mới
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        openAttachFieldTemplateModal();
                                        setIsOpen(false);
                                    }}
                                    disabled={!selectedFieldTemplateId}
                                    className={`rounded border px-2 py-1 text-xs font-medium ${!selectedFieldTemplateId ? "border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed" : "border-coral-tree-200 bg-coral-tree-50 text-coral-tree-700 hover:bg-coral-tree-100 hover:text-coral-tree-800"}`}
                                >
                                    Áp dụng mẫu
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        openEditFieldTemplatePicker();
                                        setIsOpen(false);
                                    }}
                                    className="rounded border border-coral-tree-300 bg-white px-2 py-1 text-xs font-medium text-coral-tree-800 hover:bg-coral-tree-50 hover:text-coral-tree-900"
                                >
                                    Chỉnh sửa tên mẫu
                                </button>
                            </div>
                        </div>
                    </div>

                    <hr className="border-coral-tree-200" />

                    <div className="space-y-4">
                        <h3 className="text-xs font-semibold uppercase tracking-wider text-coral-tree-700">
                            2. Tiện ích bảng dữ liệu
                        </h3>

                        <label className="flex cursor-pointer items-start gap-3 rounded-md border border-coral-tree-200 p-3 hover:bg-coral-tree-50">
                            <input
                                type="checkbox"
                                checked={showTechnicalKeys}
                                onChange={(e) => setShowTechnicalKeys(e.target.checked)}
                                className="mt-0.5 rounded border-coral-tree-300 text-coral-tree-600 focus:ring-coral-tree-600"
                            />
                            <div>
                                <span className="block text-sm font-medium text-coral-tree-800">
                                    {t("mapping.showTechnicalKeys")}
                                </span>
                                <span className="text-xs text-coral-tree-800">
                                    Phục vụ coder gán mapping vào mẫu Docx, cho phép thay đổi Label mà không sợ vỡ layout.
                                </span>
                            </div>
                        </label>

                        <button
                            type="button"
                            onClick={() => {
                                setIsOpen(false);
                                openMergeGroupsModal();
                            }}
                            className="flex w-full items-center justify-between rounded-md border border-coral-tree-200 bg-white p-3 text-sm font-medium hover:bg-coral-tree-50"
                        >
                            <div className="flex items-center gap-2">
                                <ChevronsDown className="h-4 w-4 text-coral-tree-700" />
                                {t("mapping.mergeGroups")}
                            </div>
                        </button>
                    </div>

                    <hr className="border-coral-tree-200" />

                    <div className="space-y-4">
                        <h3 className="text-xs font-semibold uppercase tracking-wider text-coral-tree-700">
                            3. Thao tác hệ thống
                        </h3>

                        <div className="space-y-2 rounded-md border border-coral-tree-200 bg-white p-3">
                            <p className="text-xs font-semibold uppercase tracking-wide text-coral-tree-700">Import</p>
                            <input
                                ref={importInputRef}
                                type="file"
                                accept=".csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                                aria-label="Import field từ file"
                                className="hidden"
                                onChange={innerHandleImport}
                            />
                            <div className="space-y-1">
                                <label className="text-xs text-coral-tree-700">{t("mapping.import.modeLabel")}</label>
                                <select
                                    value={importMode}
                                    onChange={(e) => setImportMode(e.target.value as "append" | "overwrite")}
                                    aria-label={t("mapping.import.modeLabel")}
                                    className="w-full rounded-md border border-coral-tree-300 bg-white px-3 py-2 text-sm"
                                >
                                    <option value="append">{t("mapping.import.mode.append")}</option>
                                    <option value="overwrite">{t("mapping.import.mode.overwrite")}</option>
                                </select>
                            </div>
                            <button
                                type="button"
                                onClick={() => importInputRef.current?.click()}
                                disabled={importingCatalog}
                                className="flex w-full items-center justify-center gap-2 rounded-md border border-coral-tree-300 bg-white px-4 py-2 text-sm font-medium hover:bg-coral-tree-50 disabled:opacity-75"
                            >
                                <Upload className="h-4 w-4 text-coral-tree-700" />
                                {importingCatalog ? t("mapping.import.loading") : t("mapping.import.button")}
                            </button>
                        </div>

                        <div className="space-y-2 rounded-md border border-coral-tree-200 bg-coral-tree-50 p-3">
                            <p className="text-xs font-semibold uppercase tracking-wide text-coral-tree-700">Export</p>
                            <p className="text-xs font-semibold uppercase tracking-wide text-coral-tree-700">
                                Cấu hình xuất field
                            </p>
                            <label className="text-xs text-coral-tree-700">{t("mapping.export.scopeLabel")}</label>
                            <select
                                value={exportScope}
                                onChange={(e) => setExportScope(e.target.value as "customer" | "common" | "all")}
                                aria-label={t("mapping.export.scopeLabel")}
                                className="w-full rounded-md border border-coral-tree-300 bg-white px-3 py-2 text-sm"
                            >
                                <option value="customer">{t("mapping.export.scope.customer")}</option>
                                <option value="common">{t("mapping.export.scope.common")}</option>
                                <option value="all">{t("mapping.export.scope.all")}</option>
                            </select>
                            {exportScope === "customer" ? (
                                selectedCustomerId ? (
                                    <p className="text-xs text-coral-tree-700">
                                        Khách hàng:{" "}
                                        <span className="font-medium">
                                            {customers.find((c) => c.id === selectedCustomerId)?.customer_name ?? t("mapping.selectCustomer")}
                                        </span>
                                    </p>
                                ) : (
                                    <p className="text-xs text-amber-700">{t("mapping.export.scope.customerHint")}</p>
                                )
                            ) : null}
                            {exportScope === "common" ? (
                                <p className="text-xs text-coral-tree-700">{t("mapping.export.scope.commonHint")}</p>
                            ) : null}
                            <label className="text-xs text-coral-tree-700">{t("mapping.export.templateLabel")}</label>
                            <select
                                value={exportTemplateId}
                                onChange={(e) => setExportTemplateId(e.target.value)}
                                aria-label={t("mapping.export.templateLabel")}
                                disabled={exportTemplateOptions.length === 0}
                                className="w-full rounded-md border border-coral-tree-300 bg-white px-3 py-2 text-sm disabled:opacity-70"
                            >
                                <option value="">{t("mapping.export.templatePlaceholder")}</option>
                                {exportTemplateOptions.map((template) => (
                                    <option key={template.id} value={template.id}>
                                        {template.name}
                                    </option>
                                ))}
                            </select>
                            <p className="text-xs text-coral-tree-700">
                                {t("mapping.export.fieldCount").replace("{count}", String(exportFieldCount))}
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={exportCatalogCsv}
                            disabled={exportingCatalog || !exportTemplateId || exportFieldCount === 0}
                            className="flex w-full items-center justify-center gap-2 rounded-md border border-coral-tree-300 bg-white px-4 py-2 text-sm font-medium hover:bg-coral-tree-50 disabled:opacity-75"
                        >
                            <Download className="h-4 w-4 text-coral-tree-700" />
                            {t("mapping.export.csv")}
                        </button>
                        <button
                            type="button"
                            onClick={exportCatalogXlsx}
                            disabled={exportingCatalog || !exportTemplateId || exportFieldCount === 0}
                            className="flex w-full items-center justify-center gap-2 rounded-md border border-coral-tree-300 bg-white px-4 py-2 text-sm font-medium hover:bg-coral-tree-50 disabled:opacity-75"
                        >
                            <Download className="h-4 w-4 text-coral-tree-700" />
                            {t("mapping.export.xlsx")}
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
}
