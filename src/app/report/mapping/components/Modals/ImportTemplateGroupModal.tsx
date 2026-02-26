import type { FieldTemplateItem } from "../../types";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  templates: FieldTemplateItem[];
  selectedSourceTemplateId: string;
  setSelectedSourceTemplateId: (value: string) => void;
  selectedGroupPath: string;
  setSelectedGroupPath: (value: string) => void;
  onApply: () => void;
};

export function ImportTemplateGroupModal({
  isOpen,
  onClose,
  templates,
  selectedSourceTemplateId,
  setSelectedSourceTemplateId,
  selectedGroupPath,
  setSelectedGroupPath,
  onApply,
}: Props) {
  if (!isOpen) return null;

  const sourceTemplate = templates.find((item) => item.id === selectedSourceTemplateId);
  const uniqueGroups = Array.from(
    new Set((sourceTemplate?.field_catalog ?? []).map((field) => field.group).filter(Boolean)),
  ).sort((a, b) => a.localeCompare(b, "vi"));

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md space-y-3 rounded-lg bg-white dark:bg-[#0f1629]/90 p-4 shadow-xl">
        <h3 className="text-sm font-semibold dark:text-slate-100">Thêm nhóm dữ liệu từ mẫu</h3>
        <div className="space-y-1">
          <label className="text-xs text-coral-tree-600 dark:text-slate-300" htmlFor="import-group-template-select">
            Mẫu nguồn
          </label>
          <select
            id="import-group-template-select"
            value={selectedSourceTemplateId}
            onChange={(e) => {
              setSelectedSourceTemplateId(e.target.value);
              setSelectedGroupPath("");
            }}
            className="w-full rounded-md border border-coral-tree-300 dark:border-white/[0.09] dark:bg-white/[0.05] dark:text-slate-100 px-2 py-1.5 text-sm"
          >
            <option value="">Chọn mẫu nguồn...</option>
            {templates.map((tpl) => (
              <option key={tpl.id} value={tpl.id}>
                {tpl.name}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-xs text-coral-tree-600 dark:text-slate-300" htmlFor="import-group-path-select">
            Nhóm dữ liệu
          </label>
          <select
            id="import-group-path-select"
            value={selectedGroupPath}
            onChange={(e) => setSelectedGroupPath(e.target.value)}
            className="w-full rounded-md border border-coral-tree-300 dark:border-white/[0.09] dark:bg-white/[0.05] dark:text-slate-100 px-2 py-1.5 text-sm"
            disabled={!selectedSourceTemplateId}
          >
            <option value="">Chọn nhóm...</option>
            {uniqueGroups.map((groupPath) => (
              <option key={groupPath} value={groupPath}>
                {groupPath}
              </option>
            ))}
          </select>
        </div>
        <p className="text-xs text-coral-tree-600 dark:text-slate-300">
          Sẽ bê nguyên group đã chọn, gồm tất cả subgroup và field vào mẫu dữ liệu đang chỉnh.
        </p>
        <div className="mt-2 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-coral-tree-300 dark:border-white/[0.09] dark:text-slate-200 px-3 py-1.5 text-xs hover:bg-coral-tree-50 dark:hover:bg-white/[0.06]"
          >
            Hủy
          </button>
          <button
            type="button"
            onClick={onApply}
            disabled={!selectedSourceTemplateId || !selectedGroupPath}
            className="rounded-md bg-coral-tree-700 px-3 py-1.5 text-xs text-white disabled:opacity-50"
          >
            Thêm nhóm dữ liệu
          </button>
        </div>
      </div>
    </div>
  );
}

