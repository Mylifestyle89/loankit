type ImportGroupPromptModalProps = {
  prompt: {
    rowNumber: number;
    missingPath: string;
    level: "parent" | "subgroup";
  } | null;
  onResolve: (decision: "create_once" | "create_all" | "stop") => void;
};

export function ImportGroupPromptModal({ prompt, onResolve }: ImportGroupPromptModalProps) {
  if (!prompt) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md space-y-3 rounded-lg bg-white p-4 shadow-xl">
        <h3 className="text-base font-semibold text-coral-tree-900">Xác nhận tạo nhóm khi import</h3>
        <p className="text-sm text-coral-tree-800">
          Dòng <span className="font-semibold">{prompt.rowNumber}</span>:{" "}
          {prompt.level === "parent" ? "group cha" : "subgroup"}{" "}
          <span className="font-semibold">{"\""}{prompt.missingPath}{"\""}</span> chưa tồn tại.
        </p>
        <p className="text-xs text-coral-tree-600">Chọn cách xử lý để tiếp tục import theo đúng thứ tự dòng.</p>
        <div className="mt-2 flex flex-wrap justify-end gap-2">
          <button
            type="button"
            onClick={() => onResolve("stop")}
            className="rounded-md border border-coral-tree-300 px-3 py-1.5 text-sm hover:bg-coral-tree-50"
          >
            Dừng import
          </button>
          <button
            type="button"
            onClick={() => onResolve("create_once")}
            className="rounded-md border border-coral-tree-300 px-3 py-1.5 text-sm hover:bg-coral-tree-50"
          >
            Tạo dòng này
          </button>
          <button
            type="button"
            onClick={() => onResolve("create_all")}
            className="rounded-md bg-coral-tree-700 px-3 py-1.5 text-sm text-white hover:bg-coral-tree-800"
          >
            Tạo tất cả còn lại
          </button>
        </div>
      </div>
    </div>
  );
}

