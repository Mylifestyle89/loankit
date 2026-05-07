import { Save, BookOpen } from "lucide-react";
import { useLanguage } from "@/components/language-provider";
import { useCustomerStore } from "../stores/use-customer-store";
import { useFieldTemplateStore } from "../stores/use-field-template-store";
import { useUiStore } from "../stores/use-ui-store";

type MappingHeaderProps = {
  saving: boolean;
  saveDraft: () => Promise<void>;
};

export function MappingHeader({ saving, saveDraft }: MappingHeaderProps) {
  const { t } = useLanguage();
  const customers = useCustomerStore((s) => s.customers);
  const selectedCustomerId = useCustomerStore((s) => s.selectedCustomerId);
  const editingFieldTemplateName = useFieldTemplateStore((s) => s.editingFieldTemplateName);

  return (
    <div className="flex flex-wrap items-start justify-between gap-3 rounded-xl bg-gradient-to-br from-primary-50 via-white to-primary-100 dark:from-primary-950/30 dark:via-[#242220] dark:to-primary-900/20 px-4 py-3">
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
        <button
          type="button"
          onClick={() => useUiStore.getState().setModals({ functionList: true })}
          title="Danh sách hàm"
          className="rounded-lg p-2 border border-zinc-200 dark:border-white/[0.08] bg-white dark:bg-white/[0.05] text-zinc-700 dark:text-slate-200 hover:bg-primary-50 dark:hover:bg-primary-500/10 hover:text-primary-500 dark:hover:text-primary-400 transition-colors"
        >
          <BookOpen className="h-4 w-4" />
        </button>

        <button
          type="button"
          onClick={() => void saveDraft()}
          disabled={saving}
          className="flex h-10 items-center gap-2 rounded-lg bg-primary-500 px-4 text-sm font-medium text-white shadow-sm shadow-primary-500/25 transition-all duration-200 hover:shadow-md hover:shadow-primary-500/30 hover:brightness-110 disabled:opacity-60"
        >
          <Save className="h-4 w-4" />
          {saving ? t("mapping.saving") : t("mapping.saveDraft")}
        </button>
      </div>
    </div>
  );
}
