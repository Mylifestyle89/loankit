import { Save, BookOpen, Undo2 } from "lucide-react";
import { useLanguage } from "@/components/language-provider";
import { useCustomerStore } from "../stores/use-customer-store";
import { useFieldTemplateStore } from "../stores/use-field-template-store";
import { useUiStore } from "../stores/use-ui-store";
import { useUndoStore } from "../stores/use-undo-store";
import { MappingSidebar, type MappingSidebarProps } from "./MappingSidebar";

type MappingHeaderProps = {
  saving: boolean;
  saveDraft: () => Promise<void>;
  undoLastAction: () => void;
  undoHistoryLength: number;
} & Omit<MappingSidebarProps, "customers" | "selectedCustomerId" | "setSelectedCustomerId" | "loadingCustomers">;

export function MappingHeader({
  saving,
  saveDraft,
  undoLastAction,
  undoHistoryLength,
  ...sidebarProps
}: MappingHeaderProps) {
  const { t } = useLanguage();
  const customers = useCustomerStore((s) => s.customers);
  const loadingCustomers = useCustomerStore((s) => s.loadingCustomers);
  const selectedCustomerId = useCustomerStore((s) => s.selectedCustomerId);
  const editingFieldTemplateName = useFieldTemplateStore((s) => s.editingFieldTemplateName);

  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="space-y-2">
        <h2 className="text-lg font-semibold dark:text-slate-100">{t("mapping.title")}</h2>
        <div className="flex flex-col gap-1">
          <p className="text-xs font-medium text-zinc-500 dark:text-slate-400">
            {customers.find((c) => c.id === selectedCustomerId)?.customer_name || t("mapping.na")}
          </p>
          {editingFieldTemplateName && (
            <p className="text-xs font-medium text-zinc-500 dark:text-slate-400">
              {editingFieldTemplateName}
            </p>
          )}
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-zinc-200 dark:border-white/[0.08] bg-zinc-50/60 dark:bg-[#0a0a0a] p-1">
          <button
            type="button"
            onClick={undoLastAction}
            disabled={undoHistoryLength === 0}
            className="flex h-9 items-center gap-2 rounded-md border border-zinc-300 dark:border-white/[0.10] bg-white dark:bg-white/[0.05] px-3 text-sm font-medium text-zinc-700 dark:text-slate-200 hover:bg-zinc-50 dark:hover:bg-white/[0.06] disabled:opacity-50"
          >
            <Undo2 className="h-4 w-4" />
            {t("mapping.undo")} ({undoHistoryLength}/5)
          </button>
          <button
            type="button"
            onClick={() => useUiStore.getState().setModals({ functionList: true })}
            className="flex h-9 items-center gap-2 rounded-md border border-zinc-300 dark:border-white/[0.10] bg-white dark:bg-white/[0.05] px-3 text-sm font-medium text-zinc-700 dark:text-slate-200 hover:bg-zinc-50 dark:hover:bg-white/[0.06]"
          >
            <BookOpen className="h-4 w-4" />
            Danh sách hàm
          </button>
        </div>

        <button
          type="button"
          onClick={() => void saveDraft()}
          disabled={saving}
          className="flex h-10 items-center gap-2 rounded-lg bg-indigo-600 px-4 text-sm font-medium text-white shadow-glow hover:bg-indigo-700 disabled:opacity-60"
        >
          <Save className="h-4 w-4" />
          {saving ? t("mapping.saving") : t("mapping.saveDraft")}
        </button>

        <MappingSidebar
          customers={customers}
          loadingCustomers={loadingCustomers}
          selectedCustomerId={selectedCustomerId}
          setSelectedCustomerId={useCustomerStore.getState().setSelectedCustomerId}
          {...sidebarProps}
        />
      </div>
    </div>
  );
}
