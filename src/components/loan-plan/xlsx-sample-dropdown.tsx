"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Download, FolderUp, ChevronDown } from "lucide-react";

/**
 * Dropdown button for downloading/uploading sample XLSX loan plan templates.
 * Lists files from report_assets/KHCN templates/Phương án vay vốn xlsx/.
 */
export function XlsxSampleDropdown() {
  const [open, setOpen] = useState(false);
  const [files, setFiles] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const dropRef = useRef<HTMLDivElement>(null);
  const uploadRef = useRef<HTMLInputElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  // Load file list when opening
  const loadFiles = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/report/templates/khcn/xlsx-samples");
      const data = (await res.json()) as { ok: boolean; files?: string[] };
      setFiles(data.files ?? []);
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  function handleToggle() {
    const next = !open;
    setOpen(next);
    if (next) void loadFiles();
  }

  function handleDownload(fileName: string) {
    window.open(`/api/report/templates/khcn/xlsx-samples?file=${encodeURIComponent(fileName)}`, "_blank");
  }

  async function handleUpload(file: File) {
    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      await fetch("/api/report/templates/khcn/xlsx-samples", { method: "POST", body: form });
      void loadFiles();
    } catch { /* ignore */ }
    setUploading(false);
  }

  return (
    <div ref={dropRef} className="relative">
      <button
        type="button"
        onClick={handleToggle}
        className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 dark:border-white/10 bg-white dark:bg-[#1a1a1a] px-3 py-2 text-sm font-medium text-zinc-600 dark:text-slate-400 hover:bg-zinc-50 dark:hover:bg-white/[0.05] transition-colors"
      >
        <Download className="h-4 w-4" />
        Mẫu PA
        <ChevronDown className={`h-3.5 w-3.5 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute right-0 top-full z-30 mt-1 w-72 rounded-lg border border-zinc-200 dark:border-white/10 bg-white dark:bg-[#1a1a1a] shadow-lg overflow-hidden">
          {/* Upload button */}
          <div className="border-b border-zinc-100 dark:border-white/[0.06] p-2">
            <input ref={uploadRef} type="file" accept=".xlsx,.xls" className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) void handleUpload(f); e.target.value = ""; }} />
            <button
              type="button"
              disabled={uploading}
              onClick={() => uploadRef.current?.click()}
              className="flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-sm text-violet-600 dark:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-500/10 transition-colors"
            >
              <FolderUp className="h-4 w-4" />
              {uploading ? "Đang tải lên..." : "Tải lên mẫu mới"}
            </button>
          </div>

          {/* File list */}
          <div className="max-h-64 overflow-y-auto p-1">
            {loading ? (
              <div className="flex justify-center py-4">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-violet-200 border-t-violet-600" />
              </div>
            ) : files.length === 0 ? (
              <p className="px-3 py-3 text-xs text-zinc-400">Chưa có mẫu nào</p>
            ) : (
              files.map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => handleDownload(f)}
                  className="flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-sm text-zinc-700 dark:text-slate-300 hover:bg-zinc-50 dark:hover:bg-white/[0.05] transition-colors"
                >
                  <Download className="h-3.5 w-3.5 shrink-0 text-zinc-400" />
                  <span className="truncate">{f.replace(/\.xlsx$/i, "")}</span>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
