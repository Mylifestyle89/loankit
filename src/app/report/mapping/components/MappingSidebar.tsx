import { Users, FileText, Upload, ChevronsDown, X, Settings } from "lucide-react";
import { useState, useRef } from "react";

export type MappingSidebarProps = {
    t: (key: string) => string;
    customers: { id: string; customer_name: string; customer_code: string }[];
    selectedCustomerId: string;
    setSelectedCustomerId: (id: string) => void;
    loadingCustomers: boolean;
    loading: boolean;
    fieldTemplates: { id: string; name: string }[];
    selectedFieldTemplateId: string;
    applySelectedFieldTemplate: (id: string) => void;
    loadingFieldTemplates: boolean;
    openCreateFieldTemplateModal: () => void;
    openAttachFieldTemplateModal: () => void;
    openEditFieldTemplatePicker: () => void;
    showTechnicalKeys: boolean;
    setShowTechnicalKeys: (v: boolean) => void;
    importingCatalog: boolean;
    handleImportFieldFile: (e: React.ChangeEvent<HTMLInputElement>) => void;
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
    fieldTemplates,
    selectedFieldTemplateId,
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
    const importInputRef = useRef<HTMLInputElement | null>(null);

    const innerHandleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
        handleImportFieldFile(e);
        setIsOpen(false);
    };

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
                        className="rounded p-1.5 text-coral-tree-500 hover:bg-coral-tree-100 hover:text-coral-tree-800"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <div className="flex-1 space-y-6 px-5 py-6">
                    <div className="space-y-4">
                        <h3 className="text-xs font-semibold uppercase tracking-wider text-coral-tree-500">
                            1. Ngữ cảnh làm việc
                        </h3>

                        <div className="space-y-2">
                            <label className="flex items-center gap-2 text-sm font-medium text-coral-tree-700">
                                <Users className="h-4 w-4 text-coral-tree-500" />
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
                                disabled={loadingCustomers || loading}
                                className="w-full rounded-md border border-coral-tree-300 px-3 py-2 text-sm disabled:opacity-50"
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
                                <FileText className="h-4 w-4 text-coral-tree-500" />
                                Mẫu dữ liệu
                            </label>
                            <select
                                value={selectedFieldTemplateId}
                                onChange={(e) => applySelectedFieldTemplate(e.target.value)}
                                disabled={!selectedCustomerId || loadingFieldTemplates || fieldTemplates.length === 0}
                                className="w-full rounded-md border border-coral-tree-300 px-3 py-2 text-sm disabled:opacity-50"
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
                                    className="rounded border border-coral-tree-200 bg-coral-tree-50 px-2 py-1 text-xs font-medium text-coral-tree-700 hover:bg-coral-tree-100 hover:text-coral-tree-800"
                                >
                                    Áp dụng mẫu có sẵn
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        openEditFieldTemplatePicker();
                                        setIsOpen(false);
                                    }}
                                    className="text-xs font-medium text-coral-tree-600 hover:underline"
                                >
                                    Chỉnh sửa tên mẫu
                                </button>
                            </div>
                        </div>
                    </div>

                    <hr className="border-coral-tree-200" />

                    <div className="space-y-4">
                        <h3 className="text-xs font-semibold uppercase tracking-wider text-coral-tree-500">
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
                                <span className="text-xs text-coral-tree-500">
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
                                <ChevronsDown className="h-4 w-4 text-coral-tree-500" />
                                {t("mapping.mergeGroups")}
                            </div>
                        </button>
                    </div>

                    <hr className="border-coral-tree-200" />

                    <div className="space-y-4">
                        <h3 className="text-xs font-semibold uppercase tracking-wider text-coral-tree-500">
                            3. Thao tác hệ thống
                        </h3>

                        <input
                            ref={importInputRef}
                            type="file"
                            accept=".csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                            className="hidden"
                            onChange={innerHandleImport}
                        />
                        <button
                            type="button"
                            onClick={() => importInputRef.current?.click()}
                            disabled={importingCatalog}
                            className="flex w-full items-center justify-center gap-2 rounded-md border border-coral-tree-300 bg-white px-4 py-2 text-sm font-medium hover:bg-coral-tree-50 disabled:opacity-60"
                        >
                            <Upload className="h-4 w-4 text-coral-tree-500" />
                            {importingCatalog ? t("mapping.import.loading") : t("mapping.import.button")}
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
}
