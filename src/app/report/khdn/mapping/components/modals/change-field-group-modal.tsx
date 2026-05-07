import { X, Save } from "lucide-react";
import { useLanguage } from "@/components/language-provider";
import { FieldCatalogItem } from "@/lib/report/config-schema";

interface ChangeFieldGroupModalProps {
    isOpen: boolean;
    onClose: () => void;
    changingFieldGroup: string | null;
    changingFieldGroupValue: string;
    setChangingFieldGroupValue: (val: string) => void;
    changingFieldGroupNewName: string;
    setChangingFieldGroupNewName: (val: string) => void;
    existingGroups: string[];
    fieldCatalog: FieldCatalogItem[];
    applyChangeGroup: () => void;
}

export function ChangeFieldGroupModal({
    isOpen,
    onClose,
    changingFieldGroup,
    changingFieldGroupValue,
    setChangingFieldGroupValue,
    changingFieldGroupNewName,
    setChangingFieldGroupNewName,
    existingGroups,
    fieldCatalog,
    applyChangeGroup,
}: ChangeFieldGroupModalProps) {
    const { t } = useLanguage();

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4">
            <div className="w-full max-w-sm space-y-3 rounded-lg bg-white dark:bg-[#141414]/90 p-4 shadow-xl">
                <h3 className="text-sm font-semibold dark:text-slate-100">{t("mapping.changeGroup.modalTitle")}</h3>
                {(() => {
                    const field = fieldCatalog.find((f) => f.field_key === changingFieldGroup);
                    return field ? (
                        <p className="text-xs text-zinc-500 dark:text-slate-300">
                            {t("mapping.changeGroup.current")}: <span className="font-medium">{field.group}</span>
                        </p>
                    ) : null;
                })()}
                <div className="space-y-1">
                    <label className="text-xs text-zinc-500 dark:text-slate-300" htmlFor="change-group-select">
                        {t("mapping.changeGroup.select")}
                    </label>
                    <select
                        id="change-group-select"
                        value={changingFieldGroupValue}
                        onChange={(e) => setChangingFieldGroupValue(e.target.value)}
                        className="w-full rounded-md border border-zinc-200 dark:border-white/[0.09] dark:bg-white/[0.05] dark:text-slate-100 px-2 py-1.5 text-sm"
                        autoFocus
                    >
                        <option value="" disabled>
                            {t("mapping.changeGroup.select")}
                        </option>
                        {existingGroups
                            .filter((group) => {
                                const field = fieldCatalog.find((f) => f.field_key === changingFieldGroup);
                                return field && group !== field.group;
                            })
                            .map((group) => (
                                <option key={group} value={group}>
                                    {group}
                                </option>
                            ))}
                        <option value="__create_new__" className="text-emerald-600 font-medium">
                            {t("mapping.newGroupOption")}
                        </option>
                    </select>
                    {changingFieldGroupValue === "__create_new__" ? (
                        <input
                            value={changingFieldGroupNewName}
                            onChange={(e) => setChangingFieldGroupNewName(e.target.value)}
                            placeholder={t("mapping.newGroupPlaceholder")}
                            className="mt-2 w-full rounded-md border border-zinc-200 dark:border-white/[0.09] dark:bg-white/[0.05] dark:text-slate-100 px-2 py-1.5 text-sm"
                        />
                    ) : null}
                </div>
                <div className="mt-2 flex justify-end gap-2">
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex items-center gap-1.5 rounded-md border border-zinc-200 dark:border-white/[0.09] dark:text-slate-200 px-3 py-1.5 text-xs hover:bg-primary-50/30 dark:hover:bg-white/[0.06]"
                    >
                        <X className="h-3.5 w-3.5" />
                        {t("mapping.changeGroup.cancel")}
                    </button>
                    <button
                        type="button"
                        onClick={applyChangeGroup}
                        disabled={
                            !changingFieldGroupValue ||
                            (changingFieldGroupValue === "__create_new__" && !changingFieldGroupNewName.trim())
                        }
                        className="flex items-center gap-1.5 rounded-md bg-primary-500 px-3 py-1.5 text-xs text-white disabled:opacity-50"
                    >
                        <Save className="h-3.5 w-3.5" />
                        {t("mapping.changeGroup.save")}
                    </button>
                </div>
            </div>
        </div>
    );
}
