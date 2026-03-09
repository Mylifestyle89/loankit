"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Markdown from "react-markdown";
import { Download, BookOpen, FileText } from "lucide-react";
import { asBlob } from "html-docx-js-typescript";

import { useLanguage } from "@/components/language-provider";

export default function GuidePage() {
  const { t } = useLanguage();
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadGuide = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/report/guide", { cache: "no-store" });
      const data = (await res.json()) as { ok: boolean; content?: string; error?: string };
      if (!data.ok) { setError(data.error ?? "Không thể tải hướng dẫn."); return; }
      setContent(data.content ?? "");
    } catch { setError("Không thể tải hướng dẫn."); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { void loadGuide(); }, [loadGuide]);

  const proseRef = useRef<HTMLDivElement>(null);

  async function handleDownloadDocx() {
    if (!proseRef.current) return;
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>body{font-family:Arial,sans-serif;font-size:12pt;line-height:1.6}h1{font-size:20pt;color:#5b21b6}h2{font-size:16pt;color:#6d28d9;border-bottom:1px solid #e5e7eb;padding-bottom:6px}h3{font-size:13pt;color:#7c3aed}blockquote{border-left:3px solid #a78bfa;padding-left:12px;color:#6b7280}hr{border:none;border-top:1px solid #d4d4d8;margin:16px 0}</style></head><body>${proseRef.current.innerHTML}</body></html>`;
    const blob = await asBlob(html) as Blob;
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "huong-dan-su-dung.docx";
    document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
  }

  function handleDownloadMarkdown() {
    window.open("/api/report/guide?format=download", "_blank");
  }

  if (loading) {
    return <div className="flex items-center justify-center py-16"><div className="h-6 w-6 animate-spin rounded-full border-2 border-violet-200 border-t-violet-600 dark:border-violet-800 dark:border-t-violet-400" /></div>;
  }

  if (error) {
    return <div className="py-8 text-center text-red-600 dark:text-red-400">{error}</div>;
  }

  return (
    <section className="space-y-5">
      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl border border-violet-100 dark:border-violet-500/10 bg-gradient-to-br from-violet-50 via-white to-fuchsia-50 dark:from-violet-950/30 dark:via-[#141414] dark:to-fuchsia-950/20 p-5">
        <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-violet-200/30 blur-2xl dark:bg-violet-500/10" />
        <div className="relative flex items-start justify-between">
          <div className="flex items-center gap-3">
            <BookOpen className="h-6 w-6 text-violet-600 dark:text-violet-400" />
            <div>
              <h2 className="text-xl font-bold tracking-tight bg-gradient-to-r from-violet-700 to-fuchsia-600 dark:from-violet-400 dark:to-fuchsia-400 bg-clip-text text-transparent">
                {t("nav.guide")}
              </h2>
              <p className="mt-1 text-sm text-zinc-500 dark:text-slate-400">
                Hướng dẫn chi tiết dành cho người sử dụng ứng dụng
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={handleDownloadDocx}
              className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-violet-600 to-fuchsia-600 px-4 py-2 text-sm font-medium text-white shadow-sm shadow-violet-500/25 hover:brightness-110">
              <FileText className="h-4 w-4" /> Tải DOCX
            </button>
            <button type="button" onClick={handleDownloadMarkdown}
              className="inline-flex items-center gap-2 rounded-lg border border-zinc-200 dark:border-white/[0.09] bg-white dark:bg-[#1a1a1a] px-4 py-2 text-sm font-medium shadow-sm hover:border-violet-200 dark:hover:border-violet-500/20">
              <Download className="h-4 w-4" /> Tải MD
            </button>
          </div>
        </div>
      </div>

      {/* Markdown content */}
      <div className="rounded-2xl border border-zinc-200 dark:border-white/[0.07] bg-white dark:bg-[#161616] p-6 shadow-sm">
        <div ref={proseRef} className="prose prose-zinc dark:prose-invert max-w-none
          prose-headings:tracking-tight prose-h1:text-2xl prose-h2:text-xl prose-h3:text-lg
          prose-h2:border-b prose-h2:border-zinc-200 prose-h2:dark:border-white/[0.07] prose-h2:pb-2 prose-h2:mt-8
          prose-a:text-violet-600 prose-a:dark:text-violet-400
          prose-strong:text-zinc-800 prose-strong:dark:text-slate-200
          prose-blockquote:border-violet-300 prose-blockquote:dark:border-violet-500/30
          prose-code:text-violet-700 prose-code:dark:text-violet-300 prose-code:bg-violet-50 prose-code:dark:bg-violet-500/10 prose-code:px-1 prose-code:rounded
          prose-li:marker:text-violet-500">
          <Markdown>{content}</Markdown>
        </div>
      </div>
    </section>
  );
}
