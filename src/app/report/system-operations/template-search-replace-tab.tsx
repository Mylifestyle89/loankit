"use client";

import { useState } from "react";
import { Search, Replace, Loader2, FileText } from "lucide-react";

type Result = { file: string; matches: number };
type ApiResponse = {
  ok: boolean;
  error?: string;
  mode: "search" | "replace";
  totalFiles: number;
  matchedFiles: number;
  totalMatches: number;
  results: Result[];
};

export function TemplateSearchReplaceTab() {
  const [search, setSearch] = useState("");
  const [replace, setReplace] = useState("");
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<ApiResponse | null>(null);
  const [error, setError] = useState("");

  async function handleAction(mode: "search" | "replace") {
    if (!search.trim() || search.length < 2) { setError("Từ khóa >= 2 ký tự"); return; }
    if (mode === "replace" && !replace.trim()) { setError("Nhập nội dung thay thế"); return; }
    setLoading(true);
    setError("");
    setResponse(null);
    try {
      const res = await fetch("/api/report/templates/search-replace", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ search: search.trim(), replace: replace.trim(), mode }),
      });
      const data = await res.json();
      if (!data.ok) { setError(data.error ?? "Lỗi"); return; }
      setResponse(data);
    } catch { setError("Lỗi kết nối"); }
    finally { setLoading(false); }
  }

  const inputCls = "w-full rounded-lg border border-zinc-200 dark:border-white/[0.09] bg-white dark:bg-[#1a1a1a] px-3 py-2.5 text-sm shadow-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/40";

  return (
    <div className="space-y-4">
      <p className="text-xs text-zinc-500 dark:text-slate-400">
        Tìm và thay thế văn bản trong tất cả template DOCX. Chỉ hoạt động trên máy trạm (local).
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <label className="block">
          <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">Tìm kiếm</span>
          <input value={search} onChange={(e) => setSearch(e.target.value)} className={inputCls} placeholder="VD: Nghị định 39/2016/NĐ-CP" />
        </label>
        <label className="block">
          <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">Thay thế bằng</span>
          <input value={replace} onChange={(e) => setReplace(e.target.value)} className={inputCls} placeholder="VD: Nghị định XX/2025/NĐ-CP" />
        </label>
      </div>

      <div className="flex gap-2">
        <button type="button" onClick={() => handleAction("search")} disabled={loading}
          className="cursor-pointer inline-flex items-center gap-1.5 rounded-lg border border-amber-300 dark:border-amber-500/30 px-4 py-2 text-sm font-medium text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-500/10 transition-colors disabled:opacity-50">
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Search className="h-3.5 w-3.5" />}
          Tìm kiếm
        </button>
        <button type="button" onClick={() => handleAction("replace")} disabled={loading || !replace.trim()}
          className="cursor-pointer inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-amber-600 to-orange-500 px-4 py-2 text-sm font-medium text-white shadow-sm shadow-amber-500/25 hover:brightness-110 transition-all disabled:opacity-50">
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Replace className="h-3.5 w-3.5" />}
          Thay thế tất cả
        </button>
      </div>

      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

      {response && (
        <div className="space-y-3">
          <div className="flex gap-4 text-sm">
            <span className="text-zinc-500">Đã quét: <strong>{response.totalFiles}</strong> files</span>
            <span className="text-zinc-500">Tìm thấy: <strong className="text-amber-600">{response.totalMatches}</strong> chỗ trong <strong>{response.matchedFiles}</strong> files</span>
            {response.mode === "replace" && <span className="text-emerald-600 font-medium">Đã thay thế xong</span>}
          </div>

          {response.results.length > 0 && (
            <div className="rounded-lg border border-zinc-200 dark:border-white/[0.07] overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-zinc-50 dark:bg-white/[0.03] text-xs text-zinc-500">
                    <th className="px-3 py-2 text-left">File</th>
                    <th className="px-3 py-2 text-right w-24">Số lần</th>
                  </tr>
                </thead>
                <tbody>
                  {response.results.map((r) => (
                    <tr key={r.file} className="border-t border-zinc-100 dark:border-white/[0.05]">
                      <td className="px-3 py-2 flex items-center gap-2">
                        <FileText className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                        <span className="truncate text-zinc-700 dark:text-slate-300">{r.file}</span>
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums font-medium text-amber-600">{r.matches}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {response.results.length === 0 && (
            <p className="text-sm text-zinc-400">Không tìm thấy kết quả nào.</p>
          )}
        </div>
      )}
    </div>
  );
}
