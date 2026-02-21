import { X, Save } from "lucide-react";
import { useLanguage } from "@/components/language-provider";

interface MergeGroupsModalProps {
    isOpen: boolean;
    onClose: () => void;
    existingGroups: string[];
    mergeSourceGroups: string[];
    toggleMergeSourceGroup: (group: string) => void;
    mergeTargetGroup: string;
    setMergeTargetGroup: (val: string) => void;
    mergeGroupsError: string;
    setMergeGroupsError: (val: string) => void;
    mergeOrderMode: "keep" | "alpha";
    setMergeOrderMode: (val: "keep" | "alpha") => void;
    mergePreview: { groupCount: number; fieldCount: number; targetGroup: string };
    applyMergeGroups: () => void;
}

export function MergeGroupsModal({
    isOpen,
    onClose,
    existingGroups,
    mergeSourceGroups,
    toggleMergeSourceGroup,
    mergeTargetGroup,
    setMergeTargetGroup,
    mergeGroupsError,
    setMergeGroupsError,
    mergeOrderMode,
    setMergeOrderMode,
    mergePreview,
    applyMergeGroups,
}: MergeGroupsModalProps) {
    const { t } = useLanguage();

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4">
            <div className="w-full max-w-md space-y-3 rounded-lg bg-white p-4 shadow-xl">
                <h3 className="text-sm font-semibold">{t("mapping.merge.modalTitle")}</h3>
                <div className="space-y-2">
                    <p className="text-xs text-coral-tree-600">{t("mapping.merge.selectLabel")}</p>
                    <div className="max-h-56 space-y-1 overflow-auto rounded border border-coral-tree-200 p-2">
                        {existingGroups.map((group) => (
                            <label key={group} className="flex items-center gap-2 text-sm">
                                <input
                                    type="checkbox"
                                    checked={mergeSourceGroups.includes(group)}
                                    onChange={() => toggleMergeSourceGroup(group)}
                                />
                                <span>{group}</span>
                            </label>
                        ))}
                    </div>
                </div>
                <div className="space-y-1">
                    <label className="text-xs text-coral-tree-600" htmlFor="merge-target-group-input">
                        {t("mapping.merge.targetLabel")}
                    </label>
                    <input
                        id="merge-target-group-input"
                        value={mergeTargetGroup}
                        onChange={(e) => {
                            setMergeTargetGroup(e.target.value);
                            if (mergeGroupsError) setMergeGroupsError("");
                        }}
                        className="w-full rounded-md border border-coral-tree-300 px-2 py-1.5 text-sm"
                        placeholder={t("mapping.newGroupPlaceholder")}
                        autoFocus
                    />
                    {mergeGroupsError ? <p className="text-xs text-red-600">{mergeGroupsError}</p> : null}
                </div>
                <div className="space-y-1">
                    <p className="text-xs text-coral-tree-600">{t("mapping.merge.orderLabel")}</p>
                    <label className="flex items-center gap-2 text-sm">
                        <input
                            type="radio"
                            name="merge-order-mode"
                            checked={mergeOrderMode === "keep"}
                            onChange={() => setMergeOrderMode("keep")}
                        />
                        <span>{t("mapping.merge.order.keep")}</span>
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                        <input
                            type="radio"
                            name="merge-order-mode"
                            checked={mergeOrderMode === "alpha"}
                            onChange={() => setMergeOrderMode("alpha")}
                        />
                        <span>{t("mapping.merge.order.alpha")}</span>
                    </label>
                </div>
                <div className="rounded-md border border-coral-tree-200 bg-coral-tree-50 p-2 text-xs text-coral-tree-700">
                    <p>{t("mapping.merge.preview.groups").replace("{count}", String(mergePreview.groupCount))}</p>
                    <p>{t("mapping.merge.preview.fields").replace("{count}", String(mergePreview.fieldCount))}</p>
                    <p>{t("mapping.merge.preview.target").replace("{name}", mergePreview.targetGroup || "—")}</p>
                </div>
                <div className="mt-2 flex justify-end gap-2">
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex items-center gap-1.5 rounded-md border border-coral-tree-300 px-3 py-1.5 text-xs hover:bg-coral-tree-50"
                    >
                        <X className="h-3.5 w-3.5" />
                        {t("mapping.merge.cancel")}
                    </button>
                    <button
                        type="button"
                        onClick={applyMergeGroups}
                        className="flex items-center gap-1.5 rounded-md bg-coral-tree-700 px-3 py-1.5 text-xs text-white"
                    >
                        <Save className="h-3.5 w-3.5" />
                        {t("mapping.merge.save")}
                    </button>
                </div>
            </div>
        </div>
    );
}
