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
      <div className="w-full max-w-md space-y-3 rounded-lg bg-white dark:bg-[#141414]/90 p-4 shadow-xl">
        <h3 className="text-base font-semibold text-zinc-800 dark:text-slate-100">Xác nhận tạo nhóm khi import</h3>
        <p className="text-sm text-zinc-800 dark:text-slate-200">
          Dòng <span className="font-semibold">{prompt.rowNumber}</span>:{" "}
          {prompt.level === "parent" ? "group cha" : "subgroup"}{" "}
          <span className="font-semibold">{"\""}{prompt.missingPath}{"\""}</span> chưa tồn tại.
        </p>
        <p className="text-xs text-zinc-500 dark:text-slate-300">Chọn cách xử lý để tiếp tục import theo đúng thứ tự dòng.</p>
        <div className="mt-2 flex flex-wrap justify-end gap-2">
          <button
            type="button"
            onClick={() => onResolve("stop")}
            className="rounded-md border border-zinc-200 dark:border-white/[0.09] dark:text-slate-200 px-3 py-1.5 text-sm hover:bg-violet-50/30 dark:hover:bg-white/[0.06]"
          >
            Dừng import
          </button>
          <button
            type="button"
            onClick={() => onResolve("create_once")}
            className="rounded-md border border-zinc-200 dark:border-white/[0.09] dark:text-slate-200 px-3 py-1.5 text-sm hover:bg-violet-50/30 dark:hover:bg-white/[0.06]"
          >
            Tạo dòng này
          </button>
          <button
            type="button"
            onClick={() => onResolve("create_all")}
            className="rounded-md bg-gradient-to-r from-violet-600 to-fuchsia-600 px-3 py-1.5 text-sm text-white hover:brightness-110"
          >
            Tạo tất cả còn lại
          </button>
        </div>
      </div>
    </div>
  );
}

