"use client";

import { useCallback, useEffect, useState } from "react";
import { FolderOpen, FileJson, Loader2 } from "lucide-react";
import type { FieldCatalogItem } from "@/lib/report/config-schema";

type BackupItem = { filename: string; label: string };
type TemplateFromBackup = { id: string; name: string; field_catalog: FieldCatalogItem[] };

type ImportBackupModalProps = {
  open: boolean;
  onClose: () => void;
  onRestore: (fieldCatalog: FieldCatalogItem[]) => void;
  t: (key: string) => string;
};

export function ImportBackupModal({ open, onClose, onRestore }: ImportBackupModalProps) {
  const [backups, setBackups] = useState<BackupItem[]>([]);
  const [loadingList, setLoadingList] = useState(false);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [templates, setTemplates] = useState<TemplateFromBackup[]>([]);
  const [loadingContent, setLoadingContent] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateFromBackup | null>(null);
  const [error, setError] = useState("");

  const loadList = useCallback(async () => {
    setLoadingList(true);
    setError("");
    try {
      const res = await fetch("/api/report/backups/list", { cache: "no-store" });
      const data = (await res.json()) as { ok?: boolean; backups?: BackupItem[]; error?: string };
      if (!data.ok) throw new Error(data.error ?? "Không tải được danh sách backup.");
      setBackups(data.backups ?? []);
      setSelectedFile(null);
      setTemplates([]);
      setSelectedTemplate(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Lỗi tải danh sách backup.");
    } finally {
      setLoadingList(false);
    }
  }, []);

  useEffect(() => {
    if (open) void loadList();
  }, [open, loadList]);

  const loadBackupContent = useCallback(async (filename: string) => {
    setLoadingContent(true);
    setError("");
    try {
      const res = await fetch(
        `/api/report/backups/restore?file=${encodeURIComponent(filename)}`,
        { cache: "no-store" },
      );
      const data = (await res.json()) as {
        ok?: boolean;
        field_templates?: TemplateFromBackup[];
        error?: string;
      };
      if (!data.ok) throw new Error(data.error ?? "Không đọc được backup.");
      setTemplates(data.field_templates ?? []);
      setSelectedTemplate(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Lỗi đọc backup.");
      setTemplates([]);
    } finally {
      setLoadingContent(false);
    }
  }, []);

  const handleSelectFile = useCallback(
    (filename: string) => {
      setSelectedFile(filename);
      void loadBackupContent(filename);
    },
    [loadBackupContent],
  );

  const handleRestore = useCallback(() => {
    if (!selectedTemplate?.field_catalog?.length) return;
    onRestore(selectedTemplate.field_catalog);
    onClose();
  }, [selectedTemplate, onRestore, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div
        className="w-full max-w-lg rounded-2xl border border-slate-200/60 bg-white/90 p-5 shadow-[0_8px_30px_rgb(0,0,0,0.04)] backdrop-blur-md dark:border-white/[0.07] dark:bg-[#141414]/90"
        role="dialog"
        aria-labelledby="import-backup-title"
      >
        <div className="flex items-center gap-2 border-b border-slate-200/60 pb-3 dark:border-white/[0.07]">
          <FolderOpen className="h-5 w-5 text-brand-500 dark:text-brand-400" />
          <h2 id="import-backup-title" className="text-lg font-semibold text-slate-800 dark:text-slate-200">
            Import từ backup
          </h2>
        </div>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
          Chọn file backup rồi chọn mẫu dữ liệu để khôi phục cấu trúc field vào template hiện tại.
        </p>

        {error ? (
          <p className="mt-2 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>
        ) : null}

        <div className="mt-4 space-y-3">
          <div>
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">File backup</span>
            {loadingList ? (
              <div className="mt-1 flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                <Loader2 className="h-4 w-4 animate-spin" />
                Đang tải...
              </div>
            ) : backups.length === 0 ? (
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Chưa có file backup nào.</p>
            ) : (
              <ul className="mt-1 max-h-40 overflow-y-auto rounded-xl border border-slate-200/60 bg-slate-50/50 dark:border-white/[0.07] dark:bg-white/[0.04]">
                {backups.map((b) => (
                  <li key={b.filename}>
                    <button
                      type="button"
                      onClick={() => handleSelectFile(b.filename)}
                      className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors ${
                        selectedFile === b.filename
                          ? "bg-brand-50/80 text-brand-700 dark:bg-brand-500/10 dark:text-brand-400"
                          : "text-slate-700 hover:bg-slate-100/60 dark:text-slate-200 dark:hover:bg-white/[0.06]"
                      }`}
                    >
                      <FileJson className="h-4 w-4 shrink-0" />
                      {b.label}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {selectedFile && (
            <div>
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Mẫu trong backup</span>
              {loadingContent ? (
                <div className="mt-1 flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Đang đọc...
                </div>
              ) : templates.length === 0 ? (
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">File này không có mẫu dữ liệu.</p>
              ) : (
                <ul className="mt-1 max-h-40 overflow-y-auto rounded-xl border border-slate-200/60 bg-slate-50/50 dark:border-white/[0.07] dark:bg-white/[0.04]">
                  {templates.map((tpl) => (
                    <li key={tpl.id}>
                      <button
                        type="button"
                        onClick={() => setSelectedTemplate(tpl)}
                        className={`flex w-full items-center justify-between px-3 py-2 text-left text-sm transition-colors ${
                          selectedTemplate?.id === tpl.id
                            ? "bg-brand-50/80 text-brand-700 dark:bg-brand-500/10 dark:text-brand-400"
                            : "text-slate-700 hover:bg-slate-100/60 dark:text-slate-200 dark:hover:bg-white/[0.06]"
                        }`}
                      >
                        <span className="font-medium">{tpl.name}</span>
                        <span className="text-xs text-slate-500 dark:text-slate-400">
                          {tpl.field_catalog?.length ?? 0} field
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>

        <div className="mt-5 flex flex-wrap justify-end gap-2 border-t border-slate-200/60 pt-4 dark:border-white/[0.07]">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-200/60 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50/80 dark:border-white/[0.07] dark:bg-[#141414]/90 dark:text-slate-200 dark:hover:bg-white/[0.05]"
          >
            Hủy
          </button>
          <button
            type="button"
            onClick={handleRestore}
            disabled={!selectedTemplate?.field_catalog?.length}
            className="rounded-lg bg-brand-500 px-3 py-2 text-sm font-medium text-white shadow-md transition-all hover:brightness-110 disabled:opacity-50 disabled:pointer-events-none"
          >
            Khôi phục vào template
          </button>
        </div>
      </div>
    </div>
  );
}
