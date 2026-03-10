"use client";

type MappingInstance = {
  id: string;
  name: string;
  status: string;
  publishedAt: string | null;
  master: { id: string; name: string } | null;
};

const statusLabels: Record<string, string> = {
  draft: "Nháp",
  published: "Đã xuất bản",
  archived: "Đã lưu trữ",
};

export function CustomerTemplatesSection({ instances }: { instances: MappingInstance[] }) {
  if (instances.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-zinc-300 dark:border-white/[0.08] py-8 text-center">
        <p className="text-sm text-zinc-400 dark:text-slate-500">Chưa có mapping instance nào</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-zinc-200 dark:border-white/[0.07] text-xs text-zinc-500 dark:text-slate-400">
            <th className="text-left py-2 px-3 font-medium">Tên</th>
            <th className="text-left py-2 px-3 font-medium">Mẫu gốc</th>
            <th className="text-left py-2 px-3 font-medium">Trạng thái</th>
            <th className="text-left py-2 px-3 font-medium">Ngày xuất bản</th>
          </tr>
        </thead>
        <tbody>
          {instances.map((inst) => (
            <tr key={inst.id} className="border-b border-zinc-100 dark:border-white/[0.05] hover:bg-zinc-50 dark:hover:bg-white/[0.03]">
              <td className="py-2 px-3 font-medium">{inst.name}</td>
              <td className="py-2 px-3 text-zinc-500 dark:text-slate-400">{inst.master?.name ?? "—"}</td>
              <td className="py-2 px-3">
                <span className="inline-flex items-center rounded-full bg-violet-50 dark:bg-violet-500/10 px-2 py-0.5 text-xs font-medium text-violet-700 dark:text-violet-400">
                  {statusLabels[inst.status] ?? inst.status}
                </span>
              </td>
              <td className="py-2 px-3 text-zinc-500 dark:text-slate-400">
                {inst.publishedAt ? new Date(inst.publishedAt).toLocaleDateString("vi-VN") : "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
