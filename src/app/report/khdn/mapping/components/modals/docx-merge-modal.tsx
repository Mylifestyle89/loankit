"use client";

import { useEffect, useReducer, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { X, FileText } from "lucide-react";

type MergeState = {
  files: File[];
  outputName: string;
  withPageBreak: boolean;
  merging: boolean;
  notice: { type: "success" | "error"; text: string } | null;
};

type MergeAction =
  | { type: "SET_FILES"; files: File[] }
  | { type: "SET_OUTPUT_NAME"; name: string }
  | { type: "SET_PAGE_BREAK"; value: boolean }
  | { type: "START" }
  | { type: "SUCCESS"; fileCount: number }
  | { type: "ERROR"; message: string }
  | { type: "CLEAR_NOTICE" }
  | { type: "FINISH" };

const MERGE_INITIAL: MergeState = {
  files: [],
  outputName: "merged-template",
  withPageBreak: true,
  merging: false,
  notice: null,
};

function mergeReducer(state: MergeState, action: MergeAction): MergeState {
  switch (action.type) {
    case "SET_FILES":      return { ...state, files: action.files, notice: null };
    case "SET_OUTPUT_NAME": return { ...state, outputName: action.name };
    case "SET_PAGE_BREAK":  return { ...state, withPageBreak: action.value };
    case "START":           return { ...state, merging: true, notice: null };
    case "SUCCESS":         return { ...state, notice: { type: "success", text: `Đã nối thành công ${action.fileCount} file DOCX.` } };
    case "ERROR":           return { ...state, notice: { type: "error", text: action.message } };
    case "CLEAR_NOTICE":    return { ...state, notice: null };
    case "FINISH":          return { ...state, merging: false };
  }
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

type DocxMergeModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

export function DocxMergeModal({ isOpen, onClose }: DocxMergeModalProps) {
  const [mergeState, dispatchMerge] = useReducer(mergeReducer, MERGE_INITIAL);
  const mergeNoticeTimerRef = useRef<number | null>(null);
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);

  useEffect(() => { setPortalTarget(document.body); }, []);

  useEffect(() => {
    return () => {
      if (mergeNoticeTimerRef.current !== null) window.clearTimeout(mergeNoticeTimerRef.current);
    };
  }, []);

  function onPickMergeFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []).filter((f) => f.name.toLowerCase().endsWith(".docx"));
    dispatchMerge({ type: "SET_FILES", files });
  }

  async function runMergeDocx() {
    if (mergeState.files.length < 2) {
      dispatchMerge({ type: "ERROR", message: "Vui lòng chọn ít nhất 2 file DOCX để nối." });
      return;
    }
    dispatchMerge({ type: "START" });
    try {
      const form = new FormData();
      mergeState.files.forEach((file) => form.append("files", file));
      form.set("pageBreak", mergeState.withPageBreak ? "true" : "false");
      form.set("outputName", mergeState.outputName.trim() || "merged-template");
      const res = await fetch("/api/report/template/merge-docx", { method: "POST", body: form });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? "Nối DOCX thất bại.");
      }
      const blob = await res.blob();
      const outputName = (mergeState.outputName.trim() || "merged-template").replace(/[^a-zA-Z0-9._-]+/g, "_");
      downloadBlob(blob, `${outputName}.docx`);
      dispatchMerge({ type: "SUCCESS", fileCount: mergeState.files.length });
      if (mergeNoticeTimerRef.current !== null) window.clearTimeout(mergeNoticeTimerRef.current);
      mergeNoticeTimerRef.current = window.setTimeout(() => dispatchMerge({ type: "CLEAR_NOTICE" }), 5000);
    } catch (error) {
      dispatchMerge({ type: "ERROR", message: error instanceof Error ? error.message : "Nối DOCX thất bại." });
    } finally {
      dispatchMerge({ type: "FINISH" });
    }
  }

  if (!portalTarget) return null;

  return createPortal(
    <AnimatePresence>
      {isOpen ? (
        <>
          {/* Overlay */}
          <motion.div
            key="docx-merge-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[110] bg-black/30 backdrop-blur-sm"
            onClick={onClose}
            aria-hidden="true"
          />

          {/* Modal panel */}
          <motion.div
            key="docx-merge-panel"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[111] flex items-center justify-center p-4"
          >
            <div className="w-full max-w-md rounded-xl border border-slate-200 dark:border-white/[0.07] bg-white dark:bg-[#141414]/95 shadow-2xl">

              {/* Header */}
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/[0.07] px-6 py-4">
                <div className="flex items-center gap-2">
                  <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-brand-300/50 bg-gradient-to-br from-brand-500 to-brand-500 text-white shadow-sm">
                    <FileText className="h-3.5 w-3.5" />
                  </span>
                  <h3 className="text-base font-semibold text-slate-800 dark:text-slate-200">
                    Tiện ích nối nhiều DOCX
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Đóng"
                  className="rounded-lg p-1.5 text-slate-500 dark:text-slate-400 transition-colors hover:bg-slate-100 dark:hover:bg-white/[0.07] hover:text-slate-700 dark:hover:text-slate-200"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Body */}
              <div className="space-y-4 px-6 py-5">
                {/* File picker */}
                <label className="flex flex-col gap-1 text-xs">
                  <span className="font-medium text-slate-600 dark:text-slate-300">Danh sách file DOCX</span>
                  <input
                    type="file"
                    multiple
                    accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                    onChange={onPickMergeFiles}
                    className="block w-full text-xs dark:text-slate-300 file:mr-2 file:rounded-md file:border file:border-slate-200/80 dark:file:border-white/[0.09] file:bg-white dark:file:bg-white/[0.05] file:px-2 file:py-1.5 file:text-xs file:font-medium file:text-slate-700 dark:file:text-slate-200 hover:file:bg-slate-50 dark:hover:file:bg-white/[0.06]"
                  />
                </label>

                {/* Output name */}
                <label className="flex flex-col gap-1 text-xs">
                  <span className="font-medium text-slate-600 dark:text-slate-300">Tên file kết quả</span>
                  <input
                    type="text"
                    value={mergeState.outputName}
                    onChange={(e) => dispatchMerge({ type: "SET_OUTPUT_NAME", name: e.target.value })}
                    placeholder="merged-template"
                    className="rounded-lg border border-slate-200/80 dark:border-white/[0.09] bg-white dark:bg-white/[0.05] dark:text-slate-100 px-3 py-2 text-sm focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-400/30 dark:focus:ring-brand-400/20"
                  />
                </label>

                {/* Page break checkbox */}
                <label className="inline-flex items-center gap-2 text-xs text-slate-700 dark:text-slate-200">
                  <input
                    type="checkbox"
                    checked={mergeState.withPageBreak}
                    onChange={(e) => dispatchMerge({ type: "SET_PAGE_BREAK", value: e.target.checked })}
                    className="rounded border-slate-300 text-brand-500 focus:ring-brand-500"
                  />
                  Chèn ngắt trang giữa các file
                </label>

                {/* Status / notice */}
                {mergeState.notice ? (
                  <p className={`rounded-lg border px-2.5 py-2 text-xs ${
                    mergeState.notice.type === "success"
                      ? "border-emerald-200 dark:border-emerald-500/30 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                      : "border-rose-200 dark:border-rose-500/30 bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400"
                  }`}>
                    {mergeState.notice.text}
                  </p>
                ) : null}
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between border-t border-slate-200 dark:border-white/[0.07] px-6 py-3">
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  Đã chọn: {mergeState.files.length} file
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="rounded-lg border border-slate-200 dark:border-white/[0.09] bg-white dark:bg-[#141414]/90 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 transition-colors hover:bg-slate-100 dark:hover:bg-white/[0.06]"
                  >
                    Đóng
                  </button>
                  <button
                    type="button"
                    onClick={() => void runMergeDocx()}
                    disabled={mergeState.merging || mergeState.files.length < 2}
                    className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white transition-all hover:brightness-110 shadow-sm shadow-brand-500/25 disabled:opacity-50"
                  >
                    {mergeState.merging ? "Đang nối..." : "Nối DOCX và tải về"}
                  </button>
                </div>
              </div>

            </div>
          </motion.div>
        </>
      ) : null}
    </AnimatePresence>,
    portalTarget,
  );
}
