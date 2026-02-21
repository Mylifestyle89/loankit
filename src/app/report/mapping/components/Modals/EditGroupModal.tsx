import { X, Save } from "lucide-react";
import { useLanguage } from "@/components/language-provider";

interface EditGroupModalProps {
    isOpen: boolean;
    onClose: () => void;
    editingGroup: string | null;
    editingGroupValue: string;
    setEditingGroupValue: (val: string) => void;
    editingGroupError: string;
    applyEditGroup: () => void;
}

export function EditGroupModal({
    isOpen,
    onClose,
    editingGroup,
    editingGroupValue,
    setEditingGroupValue,
    editingGroupError,
    applyEditGroup,
}: EditGroupModalProps) {
    const { t } = useLanguage();

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4">
            <div className="w-full max-w-sm space-y-3 rounded-lg bg-white p-4 shadow-xl">
                <h3 className="text-sm font-semibold">{t("mapping.editGroup.modalTitle")}</h3>
                {editingGroup ? (
                    <p className="text-xs text-coral-tree-600">
                        {t("mapping.editGroup.current")}: <span className="font-medium">{editingGroup}</span>
                    </p>
                ) : null}
                <div className="space-y-1">
                    <label className="text-xs text-coral-tree-600" htmlFor="edit-group-input">
                        {t("mapping.editGroup.label")}
                    </label>
                    <input
                        id="edit-group-input"
                        value={editingGroupValue}
                        onChange={(e) => setEditingGroupValue(e.target.value)}
                        className="w-full rounded-md border border-coral-tree-300 px-2 py-1.5 text-sm"
                        autoFocus
                    />
                    {editingGroupError ? <p className="text-xs text-red-600">{editingGroupError}</p> : null}
                </div>
                <div className="mt-2 flex justify-end gap-2">
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex items-center gap-1.5 rounded-md border border-coral-tree-300 px-3 py-1.5 text-xs hover:bg-coral-tree-50"
                    >
                        <X className="h-3.5 w-3.5" />
                        {t("mapping.editGroup.cancel")}
                    </button>
                    <button
                        type="button"
                        onClick={applyEditGroup}
                        className="flex items-center gap-1.5 rounded-md bg-coral-tree-700 px-3 py-1.5 text-xs text-white"
                    >
                        <Save className="h-3.5 w-3.5" />
                        {t("mapping.editGroup.save")}
                    </button>
                </div>
            </div>
        </div>
    );
}
