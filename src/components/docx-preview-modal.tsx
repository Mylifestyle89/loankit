"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";
import dynamic from "next/dynamic";
import { AlertTriangle, Download, X } from "lucide-react";

// Loaded only in browser (DOM required)
const EigenpalDocxEditor = dynamic(
  async () => {
    const mod = await import("@eigenpal/docx-js-editor");
    return mod.DocxEditor;
  },
  { ssr: false },
);

/** Error boundary to catch DOCX rendering crashes (e.g. invalid table rows) */
class DocxErrorBoundary extends Component<
  { children: ReactNode; onDownload: () => void },
  { error: string | null }
> {
  state: { error: string | null } = { error: null };

  static getDerivedStateFromError(err: Error) {
    return { error: err.message };
  }

  componentDidCatch(err: Error, info: ErrorInfo) {
    console.warn("[DocxPreview] render error:", err.message, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex flex-col items-center justify-center gap-4 p-10 text-center">
          <AlertTriangle className="h-10 w-10 text-amber-500" />
          <p className="text-sm text-zinc-600 dark:text-slate-400">
            Không thể xem trước văn bản này. Vui lòng tải về để kiểm tra.
          </p>
          <button
            type="button"
            onClick={this.props.onDownload}
            className="flex items-center gap-1.5 rounded-md bg-gradient-to-r from-violet-600 to-fuchsia-600 px-4 py-1.5 text-sm font-medium text-white hover:brightness-110 transition-colors shadow-sm"
          >
            <Download className="h-4 w-4" />
            Xuất file DOCX
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

type Props = {
  documentBuffer: ArrayBuffer;
  fileName: string;
  onClose: () => void;
  onDownload: () => void;
};

export function DocxPreviewModal({ documentBuffer, fileName, onClose, onDownload }: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3">
      <div className="flex h-full max-h-[95vh] w-full max-w-7xl flex-col overflow-hidden rounded-xl bg-white dark:bg-[#141414]/90 shadow-xl">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-200 px-4 py-3">
          <div className="min-w-0">
            <p className="text-sm font-semibold">Xem trước: {fileName}</p>
            <p className="text-xs text-zinc-400 truncate">Văn bản đã được nhúng dữ liệu. Bạn có thể kiểm tra trước khi tải về.</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex items-center gap-1.5 rounded-md border border-zinc-200 px-3 py-1.5 text-sm hover:bg-violet-50/30 transition-colors"
            >
              <X className="h-4 w-4" />
              Đóng
            </button>
            <button
              type="button"
              onClick={onDownload}
              className="flex items-center gap-1.5 rounded-md bg-gradient-to-r from-violet-600 to-fuchsia-600 px-4 py-1.5 text-sm font-medium text-white hover:brightness-110 transition-colors shadow-sm"
            >
              <Download className="h-4 w-4" />
              Xuất file DOCX
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-auto bg-gray-100 dark:bg-[#0a0a0a]">
          <DocxErrorBoundary onDownload={onDownload}>
            <EigenpalDocxEditor documentBuffer={documentBuffer.slice(0)} />
          </DocxErrorBoundary>
        </div>
      </div>
    </div>
  );
}
