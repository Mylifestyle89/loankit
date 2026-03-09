"use client";

import { Component, type ReactNode } from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";

type Props = {
  children: ReactNode;
  onClose?: () => void;
  onFallbackToOnlyOffice?: () => void;
};

type State = {
  hasError: boolean;
  errorMessage: string;
};

/**
 * Error boundary specifically for the Eigenpal DOCX editor.
 * Catches rendering crashes (e.g. unsupported table structures)
 * and shows a friendly fallback instead of crashing the whole page.
 */
export class DocxEditorErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, errorMessage: "" };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, errorMessage: error.message };
  }

  componentDidCatch(error: Error) {
    console.error("[DocxEditor] Render crash:", error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex h-full flex-col items-center justify-center gap-4 p-8 text-center">
          <AlertTriangle className="h-12 w-12 text-amber-500" />
          <div>
            <p className="text-base font-semibold text-slate-800 dark:text-slate-200">
              Không thể hiển thị file DOCX này
            </p>
            <p className="mt-1 max-w-md text-sm text-slate-500 dark:text-slate-400">
              File chứa cấu trúc không được hỗ trợ bởi trình chỉnh sửa (ví dụ: table row trống hoặc định dạng phức tạp).
            </p>
            {this.state.errorMessage && (
              <p className="mt-2 rounded bg-slate-100 px-3 py-1.5 text-xs font-mono text-slate-600 dark:bg-white/5 dark:text-slate-400">
                {this.state.errorMessage}
              </p>
            )}
          </div>
          <div className="flex gap-3">
            {this.props.onFallbackToOnlyOffice && (
              <button
                type="button"
                onClick={this.props.onFallbackToOnlyOffice}
                className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
              >
                Mở bằng OnlyOffice
              </button>
            )}
            <button
              type="button"
              onClick={() => this.setState({ hasError: false, errorMessage: "" })}
              className="flex items-center gap-1.5 rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/5"
            >
              <RotateCcw className="h-4 w-4" />
              Thử lại
            </button>
            {this.props.onClose && (
              <button
                type="button"
                onClick={this.props.onClose}
                className="rounded-lg bg-slate-800 px-4 py-2 text-sm text-white hover:bg-slate-700 dark:bg-white/10 dark:hover:bg-white/15"
              >
                Đóng
              </button>
            )}
          </div>
          <p className="mt-2 text-xs text-slate-400 dark:text-slate-500">
            {this.props.onFallbackToOnlyOffice
              ? "Click \"Mở bằng OnlyOffice\" để chỉnh sửa file này, hoặc dùng Microsoft Word."
              : "Hãy thử dùng OnlyOffice editor hoặc chỉnh sửa file bằng Microsoft Word trước."}
          </p>
        </div>
      );
    }

    return this.props.children;
  }
}
