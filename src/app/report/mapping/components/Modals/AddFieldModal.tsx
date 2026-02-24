import { Plus } from "lucide-react";
import { typeLabelKey } from "../../helpers";
import { useLanguage } from "@/components/language-provider";

interface AddFieldModalProps {
    isOpen: boolean;
    onClose: () => void;
    newField: { label_vi: string; group: string; type: "string" | "number" | "percent" | "date" | "table" };
    setNewField: React.Dispatch<React.SetStateAction<{ label_vi: string; group: string; type: "string" | "number" | "percent" | "date" | "table" }>>;
    selectedGroup: string;
    setSelectedGroup: (val: string) => void;
    existingGroups: string[];
    fieldCatalogKeys: string[];
    setEditingGroup: (group: string) => void;
    setEditingGroupValue: (val: string) => void;
    setEditingGroupError: (err: string) => void;
    addNewField: (override?: Partial<{ label_vi: string; group: string; type: "string" | "number" | "percent" | "date" | "table" }>) => void;
    buildInternalFieldKey: (args: { group: string; labelVi: string; existingKeys: string[] }) => string;
}

export function AddFieldModal({
    isOpen,
    onClose,
    newField,
    setNewField,
    selectedGroup,
    setSelectedGroup,
    existingGroups,
    fieldCatalogKeys,
    setEditingGroup,
    setEditingGroupValue,
    setEditingGroupError,
    addNewField,
    buildInternalFieldKey,
}: AddFieldModalProps) {
    const { t } = useLanguage();

    if (!isOpen) return null;

    function resolveGroupSelection() {
        if (selectedGroup.trim()) {
            return selectedGroup.trim();
        }
        return newField.group.trim();
    }

    return (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4">
            <div className="w-full max-w-xl space-y-4 rounded-xl bg-white p-5 shadow-2xl">
                <h3 className="text-base font-semibold">{t("mapping.newFieldTitle")}</h3>

                <div className="grid gap-3">
                    <div>
                        <label className="mb-1 block text-sm font-medium text-coral-tree-700">Tên hiển thị</label>
                        <input
                            value={newField.label_vi}
                            onChange={(e) => setNewField((prev) => ({ ...prev, label_vi: e.target.value }))}
                            placeholder={t("mapping.newFieldLabelPlaceholder")}
                            className="w-full rounded-md border border-coral-tree-300 px-3 py-2 text-sm"
                            autoFocus
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="mb-1 block text-sm font-medium text-coral-tree-700">Thuộc Nhóm</label>
                            <div className="flex gap-1">
                                <select
                                    value={selectedGroup}
                                    onChange={(e) => {
                                        const group = e.target.value;
                                        if (group === "__create_new__") {
                                            onClose();
                                            setEditingGroup("");
                                            setEditingGroupValue("");
                                            setEditingGroupError("");
                                            setSelectedGroup("");
                                        } else {
                                            setSelectedGroup(group);
                                            if (group) {
                                                setNewField((prev) => ({ ...prev, group }));
                                            }
                                        }
                                    }}
                                    className="w-full rounded-md border border-coral-tree-300 px-3 py-2 text-sm"
                                >
                                    <option value="" disabled>{t("mapping.selectGroup")}</option>
                                    {existingGroups.map((group) => (
                                        <option key={group} value={group}>{group}</option>
                                    ))}
                                    <option value="__create_new__" className="font-medium text-emerald-600">{t("mapping.newGroupOption")}</option>
                                </select>
                            </div>
                            <p className="mt-1 text-xs text-coral-tree-500">{t("mapping.groupPathHint")}</p>
                        </div>

                        <div>
                            <label className="mb-1 block text-sm font-medium text-coral-tree-700">Kiểu dữ liệu</label>
                            <select
                                value={newField.type}
                                onChange={(e) =>
                                    setNewField((prev) => ({
                                        ...prev,
                                        type: e.target.value as "string" | "number" | "percent" | "date" | "table",
                                    }))
                                }
                                className="w-full rounded-md border border-coral-tree-300 px-3 py-2 text-sm"
                            >
                                <option value="string">{t(typeLabelKey("string"))}</option>
                                <option value="number">{t(typeLabelKey("number"))}</option>
                                <option value="percent">{t(typeLabelKey("percent"))}</option>
                                <option value="date">{t(typeLabelKey("date"))}</option>
                                <option value="table">{t(typeLabelKey("table"))}</option>
                            </select>
                        </div>
                    </div>
                </div>

                <div className="rounded border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
                    <span className="font-medium">Technical Key sinh tự động: </span>
                    <span className="font-mono text-xs">
                        {buildInternalFieldKey({
                            group: resolveGroupSelection() || "Nhóm mới",
                            labelVi: newField.label_vi || "Tên field",
                            existingKeys: fieldCatalogKeys,
                        })}
                    </span>
                </div>

                <div className="mt-4 flex justify-end gap-2">
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-md border border-coral-tree-300 px-4 py-2 text-sm font-medium text-coral-tree-700 hover:bg-coral-tree-50"
                    >
                        Hủy
                    </button>
                    <button
                        type="button"
                        onClick={() =>
                            addNewField({
                                label_vi: newField.label_vi,
                                group: resolveGroupSelection(),
                                type: newField.type as "string" | "number" | "percent" | "date" | "table",
                            })
                        }
                        className="flex items-center gap-2 rounded-md bg-coral-tree-700 px-4 py-2 text-sm font-medium text-white hover:bg-coral-tree-800"
                    >
                        <Plus className="h-4 w-4" />
                        {t("mapping.addField")}
                    </button>
                </div>
            </div>
        </div>
    );
}
