"use client";

/**
 * Collapsible "paste from DOCX" AI extractor panel.
 * Renders a textarea + button; calls /api/ai/extract-text and returns structured
 * data via onExtracted. Used on collateral, customer, and co-borrower forms.
 */

import { useState, useRef } from "react";
import { ChevronDown, ChevronUp, Loader2, Sparkles } from "lucide-react";
import type { AiExtractEntityType } from "@/services/ai-text-extraction.service";

// Generic over the extracted shape so callers can pass typed handlers without casts.
// Using `any` (not `unknown`) avoids breaking contravariance on the callback parameter.
type Props<T = unknown> = {
  entityType: AiExtractEntityType;
  onExtracted: (data: T) => void;
  label?: string;
  placeholder?: string;
};

export function AiPasteExtractor<T = unknown>({ entityType, onExtracted, label, placeholder }: Props<T>) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  async function handleExtract() {
    if (!text.trim()) return;
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/ai/extract-text", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entityType, text }),
        signal: ctrl.signal,
      });
      const json = await res.json() as { ok: boolean; data?: unknown; error?: string };
      if (!json.ok) { setError(json.error ?? "Lỗi trích xuất."); return; }
      onExtracted(json.data as T);
      // Collapse and clear after success
      setText("");
      setOpen(false);
    } catch (err) {
      // Silently ignore abort errors — user closed the panel or new request started
      if (err instanceof Error && err.name === "AbortError") return;
      setError("Lỗi kết nối. Thử lại.");
    } finally {
      setLoading(false);
    }
  }

  function handleClose() {
    abortRef.current?.abort();
    setOpen(false);
  }

  return (
    <div className="rounded-xl border border-dashed border-brand-300 dark:border-brand-500/30 bg-brand-50/40 dark:bg-brand-500/5 overflow-hidden">
      {/* Header toggle */}
      <button
        type="button"
        aria-expanded={open}
        onClick={() => { if (open) { handleClose(); } else { setOpen(true); setTimeout(() => textareaRef.current?.focus(), 50); } }}
        className="w-full flex items-center gap-2 px-4 py-2.5 text-left text-sm font-medium text-brand-600 dark:text-brand-400 hover:bg-brand-50 dark:hover:bg-brand-500/10 transition-colors"
      >
        <Sparkles className="h-3.5 w-3.5 shrink-0" />
        <span>{label ?? "Trích xuất từ DOCX (AI)"}</span>
        {open ? <ChevronUp className="h-3.5 w-3.5 ml-auto" /> : <ChevronDown className="h-3.5 w-3.5 ml-auto" />}
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-2 border-t border-brand-200/50 dark:border-brand-500/20 pt-3">
          <p className="text-xs text-zinc-500 dark:text-slate-400">
            Copy phần nội dung từ file DOCX rồi dán vào đây. AI sẽ điền các trường tương ứng.
          </p>
          <textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={6}
            maxLength={50000}
            placeholder={placeholder ?? "Dán nội dung từ DOCX vào đây (Ctrl+V)..."}
            className="w-full rounded-lg border border-zinc-200 dark:border-white/[0.09] bg-white dark:bg-[#1a1a1a] px-3 py-2 text-xs text-zinc-800 dark:text-slate-200 resize-y focus:outline-none focus:ring-1 focus:ring-brand-500/40"
          />
          {error && <p className="text-xs text-red-500">{error}</p>}
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => { setText(""); setError(""); }}
              className="text-xs px-3 py-1.5 rounded-lg text-zinc-500 hover:bg-zinc-100 dark:hover:bg-white/[0.06]"
            >
              Xóa
            </button>
            <button
              type="button"
              onClick={handleExtract}
              disabled={!text.trim() || loading}
              className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-brand-500 text-white hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
              {loading ? "Đang trích xuất..." : "Trích xuất"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
