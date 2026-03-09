"use client";

import { useRef, useState } from "react";
import { Download, Upload, FileEdit, BookmarkPlus, X, Check } from "lucide-react";

import { getSignedFileUrl } from "@/lib/report/signed-file-url";

type Props = {
  /** Relative path within report_assets/ (e.g. "Disbursement templates/file.docx") */
  filePath: string;
  fileName: string;
  onRefresh: () => void;
  onOpenEditor?: (docxPath: string) => void;
  editorAvailable?: boolean;
  onRegisterTemplate?: (docxPath: string, templateName: string) => Promise<void>;
};

/** Per-file action buttons: Download, Upload (overwrite), and optional Editor */
export function TemplateFileActions({ filePath, fileName, onRefresh, onOpenEditor, editorAvailable, onRegisterTemplate }: Props) {
  const [uploading, setUploading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [registering, setRegistering] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [registerName, setRegisterName] = useState("");
  const [showRegisterInput, setShowRegisterInput] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const fullPath = `report_assets/${filePath}`;

  async function downloadFile() {
    setDownloading(true);
    setError("");
    try {
      const signedUrl = await getSignedFileUrl(fullPath, true);
      const a = document.createElement("a");
      a.href = signedUrl;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch {
      setError("Không thể tải file.");
    } finally {
      setDownloading(false);
    }
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";

    if (!file.name.toLowerCase().endsWith(".docx")) {
      setError("Chỉ chấp nhận file .docx");
      return;
    }

    setUploading(true);
    setError("");
    setSuccess("");
    try {
      const buffer = await file.arrayBuffer();
      const res = await fetch(`/api/report/template/save-docx?path=${encodeURIComponent(fullPath)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/octet-stream" },
        body: buffer,
      });
      const data = (await res.json()) as { ok: boolean; error?: string };
      if (!data.ok) throw new Error(data.error ?? "Upload thất bại");
      setSuccess("Đã tải lên!");
      setTimeout(() => setSuccess(""), 2000);
      onRefresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload thất bại");
    } finally {
      setUploading(false);
    }
  }

  function openRegisterInput() {
    setRegisterName(fileName.replace(/\.docx$/i, ""));
    setShowRegisterInput(true);
    setError("");
  }

  async function submitRegister() {
    const name = registerName.trim();
    if (!name || !onRegisterTemplate) return;
    setRegistering(true);
    setError("");
    try {
      await onRegisterTemplate(fullPath, name);
      setSuccess("Đã đăng ký!");
      setTimeout(() => setSuccess(""), 2000);
      setShowRegisterInput(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Đăng ký thất bại");
    } finally {
      setRegistering(false);
    }
  }

  return (
    <div className="flex items-center gap-1">
      {error && <span className="text-xs text-red-500 mr-1">{error}</span>}
      {success && <span className="text-xs text-emerald-600 mr-1">{success}</span>}

      <button type="button" onClick={downloadFile} disabled={downloading} title="Tải về"
        className="rounded-md bg-emerald-600 px-2 py-1 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-50 transition-all">
        {downloading ? "..." : <Download className="h-3.5 w-3.5" />}
      </button>

      <input ref={fileInputRef} type="file" accept=".docx" className="hidden" onChange={handleUpload} />
      <button type="button" onClick={() => fileInputRef.current?.click()} disabled={uploading} title="Tải lên (ghi đè)"
        className="rounded-md bg-blue-600 px-2 py-1 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-all">
        {uploading ? "..." : <Upload className="h-3.5 w-3.5" />}
      </button>

      {editorAvailable && onOpenEditor && (
        <button type="button" onClick={() => onOpenEditor(fullPath)} title="Mở trình chỉnh sửa"
          className="rounded-md border border-zinc-300 dark:border-white/10 px-2 py-1 text-xs text-zinc-600 dark:text-slate-400 hover:bg-zinc-100 dark:hover:bg-white/5 transition-all">
          <FileEdit className="h-3.5 w-3.5" />
        </button>
      )}

      {onRegisterTemplate && !showRegisterInput && (
        <button type="button" disabled={registering} title="Đăng ký mẫu" onClick={openRegisterInput}
          className="rounded-md bg-violet-600 px-2 py-1 text-xs font-medium text-white hover:bg-violet-700 disabled:opacity-50 transition-all">
          <BookmarkPlus className="h-3.5 w-3.5" />
        </button>
      )}

      {showRegisterInput && (
        <div className="flex items-center gap-1">
          <input
            type="text" value={registerName} onChange={(e) => setRegisterName(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") void submitRegister(); if (e.key === "Escape") setShowRegisterInput(false); }}
            placeholder="Tên mẫu" autoFocus
            className="w-32 rounded-md border border-zinc-300 dark:border-white/10 bg-white dark:bg-[#1a1a1a] px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-violet-500"
          />
          <button type="button" onClick={() => void submitRegister()} disabled={registering || !registerName.trim()} title="Xác nhận"
            className="rounded-md bg-violet-600 p-1 text-white hover:bg-violet-700 disabled:opacity-50 transition-all">
            {registering ? "..." : <Check className="h-3 w-3" />}
          </button>
          <button type="button" onClick={() => setShowRegisterInput(false)} title="Hủy"
            className="rounded-md border border-zinc-300 dark:border-white/10 p-1 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-white/5 transition-all">
            <X className="h-3 w-3" />
          </button>
        </div>
      )}
    </div>
  );
}
