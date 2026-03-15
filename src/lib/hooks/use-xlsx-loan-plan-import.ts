"use client";

import { useCallback, useState } from "react";
import type { XlsxParseResult } from "@/lib/import/xlsx-loan-plan-types";

type ImportState = {
  parseResult: XlsxParseResult | null;
  isUploading: boolean;
  isSaving: boolean;
  showPreview: boolean;
  error: string | null;
};

export function useXlsxLoanPlanImport(customerId: string) {
  const [state, setState] = useState<ImportState>({
    parseResult: null,
    isUploading: false,
    isSaving: false,
    showPreview: false,
    error: null,
  });

  const uploadFile = useCallback(async (file: File) => {
    setState((s) => ({ ...s, isUploading: true, error: null }));
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("customerId", customerId);
      const res = await fetch("/api/loan-plans/import", { method: "POST", body: formData });
      const data = await res.json() as XlsxParseResult & { ok: boolean; error?: string };
      if (!data.ok) {
        setState((s) => ({ ...s, isUploading: false, error: data.error || data.message }));
        return;
      }
      setState((s) => ({ ...s, isUploading: false, parseResult: data, showPreview: true }));
    } catch {
      setState((s) => ({ ...s, isUploading: false, error: "Lỗi khi upload file" }));
    }
  }, [customerId]);

  const confirmImport = useCallback(async (payload: Record<string, unknown>) => {
    setState((s) => ({ ...s, isSaving: true, error: null }));
    try {
      const res = await fetch("/api/loan-plans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customerId, ...payload }),
      });
      const data = await res.json();
      if (!data.ok) {
        setState((s) => ({ ...s, isSaving: false, error: data.error }));
        return false;
      }
      setState({ parseResult: null, isUploading: false, isSaving: false, showPreview: false, error: null });
      return true;
    } catch {
      setState((s) => ({ ...s, isSaving: false, error: "Lỗi khi lưu phương án" }));
      return false;
    }
  }, [customerId]);

  const resetImport = useCallback(() => {
    setState({ parseResult: null, isUploading: false, isSaving: false, showPreview: false, error: null });
  }, []);

  return { ...state, uploadFile, confirmImport, resetImport };
}
