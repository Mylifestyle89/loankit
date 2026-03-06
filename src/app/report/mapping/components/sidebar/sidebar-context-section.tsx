"use client";

import { useMemo, useState } from "react";
import { Users, FileText, Settings, ChevronDown, ChevronUp } from "lucide-react";
import { useCustomerStore } from "../../stores/use-customer-store";
import { useFieldTemplateStore } from "../../stores/use-field-template-store";
import { useUiStore } from "../../stores/use-ui-store";
import { useMappingDataStore } from "../../stores/use-mapping-data-store";
import { useLanguage } from "@/components/language-provider";
import { TemplatePickerDropdown } from "./sidebar-template-picker-dropdown";

type SidebarContextSectionProps = {
  applySelectedFieldTemplate: (id: string) => void;
  openCreateFieldTemplateModal: () => void;
  openAttachFieldTemplateModal: () => void;
  openEditFieldTemplatePicker: () => void;
  onCloseSidebar: () => void;
};

export function SidebarContextSection({
  applySelectedFieldTemplate,
  openCreateFieldTemplateModal,
  openAttachFieldTemplateModal,
  openEditFieldTemplatePicker,
  onCloseSidebar,
}: SidebarContextSectionProps) {
  const { t } = useLanguage();
  const { customers, selectedCustomerId, loadingCustomers, setSelectedCustomerId } = useCustomerStore();
  const {
    fieldTemplates,
    allFieldTemplates,
    selectedFieldTemplateId,
    loadingFieldTemplates,
    setEditingFieldTemplateId,
    setEditingFieldTemplateName,
  } = useFieldTemplateStore();
  const loading = useUiStore((s) => s.status.loading);
  const isMappingValid = useMappingDataStore(
    (s) => s.validation != null && !s.validation.errors?.length,
  );

  const [sectionOpen, setSectionOpen] = useState(true);
  const [templatePickerOpen, setTemplatePickerOpen] = useState(false);
  const [templateQuery, setTemplateQuery] = useState("");

  const normalizedQuery = templateQuery.trim().toLowerCase();

  const selectedTemplate = useMemo(
    () => allFieldTemplates.find((item) => item.id === selectedFieldTemplateId) ?? null,
    [allFieldTemplates, selectedFieldTemplateId],
  );

  const filteredInstances = useMemo(
    () => fieldTemplates.filter((tpl) => !normalizedQuery || tpl.name.toLowerCase().includes(normalizedQuery)),
    [fieldTemplates, normalizedQuery],
  );

  const filteredMasters = useMemo(
    () => allFieldTemplates.filter((tpl) => !normalizedQuery || tpl.name.toLowerCase().includes(normalizedQuery)),
    [allFieldTemplates, normalizedQuery],
  );

  function handleSelect(id: string) {
    applySelectedFieldTemplate(id);
    setTemplatePickerOpen(false);
  }

  return (
    <div className="space-y-3">
      {/* Section header toggle */}
      <button
        type="button"
        onClick={() => setSectionOpen((v) => !v)}
        className="flex w-full items-center justify-between rounded-lg px-1 py-1 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 transition-colors hover:bg-slate-100/60 dark:hover:bg-white/[0.06]"
      >
        <span>1. Ngữ cảnh làm việc</span>
        {sectionOpen
          ? <ChevronUp className="h-4 w-4 text-slate-400 dark:text-slate-500" />
          : <ChevronDown className="h-4 w-4 text-slate-400 dark:text-slate-500" />}
      </button>

      {sectionOpen ? (
        <>
          {/* Customer dropdown */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
              <Users className="h-4 w-4 text-slate-600 dark:text-slate-300" />Dữ liệu khách hàng
            </label>
            <select
              value={selectedCustomerId}
              onChange={(e) => {
                setEditingFieldTemplateId("");
                setEditingFieldTemplateName("");
                setSelectedCustomerId(e.target.value);
              }}
              aria-label="Chọn dữ liệu khách hàng"
              disabled={loadingCustomers || loading}
              className="w-full rounded-lg border border-slate-200/80 dark:border-white/[0.09] bg-white/90 dark:bg-white/[0.05] px-3 py-2.5 text-sm font-medium text-slate-800 dark:text-slate-100 transition-all duration-200 hover:bg-slate-100/50 dark:hover:bg-white/[0.06] focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-400/30 dark:focus:ring-violet-400/20 disabled:opacity-70"
            >
              <option value="">{t("mapping.selectCustomer")}</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>{c.customer_name} ({c.customer_code})</option>
              ))}
            </select>
          </div>

          {/* Template picker */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
              <FileText className="h-4 w-4 text-slate-600 dark:text-slate-300" />Mẫu dữ liệu
            </label>
            <div className="relative">
              {/* Trigger button */}
              <button
                type="button"
                onClick={() => setTemplatePickerOpen((v) => !v)}
                disabled={loadingFieldTemplates}
                className={`flex w-full items-center justify-between rounded-lg border bg-white/90 dark:bg-white/[0.05] px-3 py-2.5 text-left text-sm font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-violet-400/30 dark:focus:ring-violet-400/20 disabled:opacity-70 ${
                  selectedFieldTemplateId
                    ? "border-violet-200 dark:border-violet-500/30 bg-violet-50/50 dark:bg-violet-500/10 text-violet-700 dark:text-violet-400 shadow-sm"
                    : "border-slate-200/80 dark:border-white/[0.09] text-slate-800 dark:text-slate-100 hover:bg-slate-100/50 dark:hover:bg-white/[0.06]"
                }`}
              >
                <span className="truncate">{selectedTemplate?.name ?? t("mapping.selectFieldTemplate")}</span>
                <span className="ml-2 text-slate-500 dark:text-slate-400">▾</span>
              </button>

              {/* Settings shortcut */}
              <button
                type="button"
                onClick={() => { openEditFieldTemplatePicker(); onCloseSidebar(); }}
                className="absolute right-9 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-slate-500 dark:text-slate-400 transition-colors hover:bg-slate-100 dark:hover:bg-white/[0.07] hover:text-violet-600 dark:hover:text-violet-400"
                title="Manage templates"
              >
                <Settings className="h-4 w-4" />
              </button>

              {/* Dropdown list — extracted component */}
              <TemplatePickerDropdown
                open={templatePickerOpen}
                query={templateQuery}
                onQueryChange={setTemplateQuery}
                selectedCustomerId={selectedCustomerId}
                selectedFieldTemplateId={selectedFieldTemplateId}
                filteredInstances={filteredInstances}
                filteredMasters={filteredMasters}
                isMappingValid={isMappingValid}
                onSelect={handleSelect}
              />
            </div>

            {/* Action buttons */}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => { openCreateFieldTemplateModal(); onCloseSidebar(); }}
                className="rounded-lg border border-slate-200/80 dark:border-white/[0.09] bg-white dark:bg-[#141414]/90 px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 transition-all duration-200 hover:bg-slate-100/50 dark:hover:bg-white/[0.06]"
              >
                Tạo mẫu mới
              </button>
              <button
                type="button"
                onClick={() => { openAttachFieldTemplateModal(); onCloseSidebar(); }}
                disabled={!selectedFieldTemplateId}
                className={`rounded-lg border px-3 py-2 text-xs font-medium transition-all duration-200 ${
                  !selectedFieldTemplateId
                    ? "cursor-not-allowed border-slate-200/60 dark:border-white/[0.07] bg-slate-50 dark:bg-white/[0.04] text-slate-400 dark:text-slate-500"
                    : "border-slate-200/80 dark:border-white/[0.09] bg-white dark:bg-[#141414]/90 text-slate-700 dark:text-slate-200 hover:bg-slate-100/50 dark:hover:bg-white/[0.06]"
                }`}
              >
                Áp dụng mẫu
              </button>
              <button
                type="button"
                onClick={() => { openEditFieldTemplatePicker(); onCloseSidebar(); }}
                className="rounded-lg border border-slate-200/80 dark:border-white/[0.09] bg-white dark:bg-[#141414]/90 px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 transition-all duration-200 hover:bg-slate-100/50 dark:hover:bg-white/[0.06]"
              >
                Chỉnh sửa tên mẫu
              </button>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
