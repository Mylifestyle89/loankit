"use client";

import { useCallback, useEffect, useState } from "react";

import { TemplateFileActions } from "./template-file-actions";

type FileEntry = { name: string; path: string; size: number; modified: string };
type FolderNode = { name: string; path: string; files: FileEntry[]; subfolders: FolderNode[] };

type Props = {
  onOpenEditor?: (docxPath: string) => void;
  editorAvailable?: boolean;
  onUploadValidate?: () => void;
  onRegisterTemplate?: (docxPath: string, templateName: string) => Promise<void>;
};

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Count total DOCX files recursively in a folder node */
function countFiles(node: FolderNode): number {
  return node.files.length + node.subfolders.reduce((s, f) => s + countFiles(f), 0);
}

export function TemplateFolderBrowser({ onOpenEditor, editorAvailable, onUploadValidate, onRegisterTemplate }: Props) {
  const [tree, setTree] = useState<FolderNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [expanded, setExpanded] = useState<Set<string>>(new Set(["."]));

  const fetchTree = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/report/template/folder-files", { cache: "no-store" });
      const data = (await res.json()) as { ok: boolean; tree?: FolderNode[]; error?: string };
      if (!data.ok) throw new Error(data.error ?? "Failed to load");
      setTree(data.tree ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Lỗi tải danh sách mẫu");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void fetchTree(); }, [fetchTree]);

  function toggleFolder(path: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-amber-200 border-t-amber-600 dark:border-amber-800 dark:border-t-amber-400" />
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-zinc-200 dark:border-white/[0.07] bg-white dark:bg-[#161616] p-4 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-base font-bold tracking-tight">Duyệt mẫu từ folder</h3>
          <p className="mt-0.5 text-sm text-zinc-500 dark:text-slate-400">Tải về để chỉnh sửa bằng Word, sau đó tải lên lại</p>
        </div>
        <div className="flex items-center gap-2">
          {onUploadValidate && (
            <button type="button" onClick={onUploadValidate} className="rounded-lg bg-gradient-to-r from-amber-600 to-orange-500 px-3 py-1.5 text-xs font-medium text-white shadow-sm shadow-amber-500/25 hover:brightness-110 transition-all">
              Upload &amp; Validate
            </button>
          )}
          <button type="button" onClick={() => void fetchTree()} className="rounded-lg border border-zinc-200 dark:border-white/[0.09] bg-white dark:bg-[#1a1a1a] px-3 py-1.5 text-xs shadow-sm hover:border-amber-200 dark:hover:border-amber-500/20 transition-all">
            Làm mới
          </button>
        </div>
      </div>
      {error && <p className="mb-2 text-sm text-red-600 dark:text-red-400">{error}</p>}
      <div className="max-h-[28rem] overflow-y-auto rounded-lg border border-zinc-100 dark:border-white/[0.05] bg-zinc-50/50 dark:bg-[#111]">
        {tree.map((node) => (
          <FolderRow key={node.path} node={node} depth={0} expanded={expanded} onToggle={toggleFolder} onRefresh={fetchTree} onOpenEditor={onOpenEditor} editorAvailable={editorAvailable} onRegisterTemplate={onRegisterTemplate} />
        ))}
        {tree.length === 0 && !error && (
          <p className="p-4 text-sm text-zinc-400 dark:text-slate-500">Không tìm thấy file DOCX nào.</p>
        )}
      </div>
    </div>
  );
}

/** Recursive folder row with files */
function FolderRow({ node, depth, expanded, onToggle, onRefresh, onOpenEditor, editorAvailable, onRegisterTemplate }: {
  node: FolderNode; depth: number; expanded: Set<string>;
  onToggle: (p: string) => void; onRefresh: () => void;
  onOpenEditor?: (p: string) => void; editorAvailable?: boolean;
  onRegisterTemplate?: (docxPath: string, templateName: string) => Promise<void>;
}) {
  const isExpanded = expanded.has(node.path);
  const totalFiles = countFiles(node);
  const indent = depth * 16;

  return (
    <>
      <button
        type="button"
        onClick={() => onToggle(node.path)}
        style={{ paddingLeft: `${12 + indent}px` }}
        className="flex w-full items-center gap-2 py-2 pr-3 text-left text-sm font-medium hover:bg-amber-50/60 dark:hover:bg-amber-950/20 transition-colors"
      >
        <span className="text-xs text-zinc-400 dark:text-slate-500">{isExpanded ? "▼" : "▶"}</span>
        <span className="text-amber-700 dark:text-amber-400">📁</span>
        <span className="truncate flex-1">{node.name}</span>
        <span className="shrink-0 rounded-full bg-zinc-200/70 dark:bg-white/[0.08] px-2 py-0.5 text-xs text-zinc-500 dark:text-slate-400">
          {totalFiles}
        </span>
      </button>

      {isExpanded && (
        <>
          {node.files.map((file) => (
            <div
              key={file.path}
              style={{ paddingLeft: `${28 + indent}px` }}
              className="flex items-center gap-2 py-1.5 pr-3 text-sm hover:bg-zinc-100/70 dark:hover:bg-white/[0.03] transition-colors group"
            >
              <span className="text-zinc-400 dark:text-slate-500">📄</span>
              <span className="truncate flex-1 text-zinc-700 dark:text-slate-300" title={file.name}>{file.name}</span>
              <span className="shrink-0 text-xs text-zinc-400 dark:text-slate-500 mr-1">{formatSize(file.size)}</span>
              <TemplateFileActions
                filePath={file.path}
                fileName={file.name}
                onRefresh={() => void onRefresh()}
                onOpenEditor={onOpenEditor}
                editorAvailable={editorAvailable}
                onRegisterTemplate={onRegisterTemplate}
              />
            </div>
          ))}

          {node.subfolders.map((sub) => (
            <FolderRow key={sub.path} node={sub} depth={depth + 1} expanded={expanded} onToggle={onToggle} onRefresh={onRefresh} onOpenEditor={onOpenEditor} editorAvailable={editorAvailable} onRegisterTemplate={onRegisterTemplate} />
          ))}
        </>
      )}
    </>
  );
}
