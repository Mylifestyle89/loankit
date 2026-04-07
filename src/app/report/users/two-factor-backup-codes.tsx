"use client";

import { Copy, Download } from "lucide-react";

/** Display backup codes with copy/download actions */
export function TwoFactorBackupCodes({ codes, onDone }: { codes: string[]; onDone: () => void }) {
  function copyAll() {
    navigator.clipboard.writeText(codes.join("\n"));
  }

  function download() {
    const blob = new Blob([codes.join("\n")], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "loankit-backup-codes.txt";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-3">
      <p className="text-xs font-medium text-brand-500 dark:text-brand-400">
        ⚠ Lưu mã dự phòng — mỗi mã chỉ dùng được 1 lần. Không thể xem lại sau khi đóng.
      </p>
      <div className="grid grid-cols-2 gap-1.5 rounded-lg bg-slate-50 p-3 font-mono text-xs dark:bg-white/[0.04]">
        {codes.map((code, i) => (
          <span key={i} className="text-zinc-700 dark:text-slate-300">{code}</span>
        ))}
      </div>
      <div className="flex gap-2">
        <button type="button" onClick={copyAll} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-zinc-600 hover:bg-slate-50 dark:border-white/[0.1] dark:text-slate-400 dark:hover:bg-white/[0.04]">
          <Copy className="h-3 w-3" /> Copy
        </button>
        <button type="button" onClick={download} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-zinc-600 hover:bg-slate-50 dark:border-white/[0.1] dark:text-slate-400 dark:hover:bg-white/[0.04]">
          <Download className="h-3 w-3" /> Tải xuống
        </button>
      </div>
      <button type="button" onClick={onDone} className="w-full rounded-lg bg-brand-500 px-4 py-2 text-xs font-medium text-white hover:bg-brand-600">
        Hoàn tất
      </button>
    </div>
  );
}
