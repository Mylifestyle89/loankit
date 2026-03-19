"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// Validation report shape returned by the API
export type ValidationReport = {
  ok: true;
  total_placeholders: number;
  total_catalog_fields: number;
  valid: { placeholder: string; field_key: string; label_vi: string }[];
  unknown: { placeholder: string; suggestions: string[] }[];
  missing: { field_key: string; label_vi: string; group: string }[];
};

type HookState = {
  validating: boolean;
  report: ValidationReport | null;
  fileName: string;
  error: string;
};

/**
 * Manages the upload-validate-save flow:
 * 1. User picks a .docx file
 * 2. POST to /api/report/template/validate-upload
 * 3. Store buffer in ref for later save
 * 4. Save via PUT /api/report/template/save-docx
 */
export function useTemplateUploadValidation(fieldTemplateId: string) {
  const [state, setState] = useState<HookState>({
    validating: false, report: null, fileName: "", error: "",
  });

  // [RT-5] Store buffer in ref to avoid memory leak on re-renders
  const fileBufferRef = useRef<ArrayBuffer | null>(null);

  // Clear buffer on unmount
  useEffect(() => () => { fileBufferRef.current = null; }, []);

  const validateFile = useCallback(async (file: File) => {
    setState({ validating: true, report: null, fileName: file.name, error: "" });
    fileBufferRef.current = null;

    try {
      const buffer = await file.arrayBuffer();
      fileBufferRef.current = buffer;

      const formData = new FormData();
      formData.append("file", file);
      formData.append("field_template_id", fieldTemplateId);

      const res = await fetch("/api/report/template/validate-upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();

      if (!data.ok) {
        setState((s) => ({ ...s, validating: false, error: data.error ?? "Lỗi kiểm tra." }));
        return;
      }
      setState((s) => ({ ...s, validating: false, report: data as ValidationReport }));
    } catch (e) {
      setState((s) => ({
        ...s, validating: false,
        error: e instanceof Error ? e.message : "Lỗi không xác định.",
      }));
    }
  }, [fieldTemplateId]);

  const saveFile = useCallback(async (savePath: string) => {
    const buffer = fileBufferRef.current;
    if (!buffer) throw new Error("Không có file buffer.");

    const res = await fetch(
      `/api/report/template/save-docx?path=${encodeURIComponent(savePath)}`,
      { method: "PUT", headers: { "Content-Type": "application/octet-stream" }, body: buffer },
    );
    const data = await res.json();
    if (!data.ok) throw new Error(data.error ?? "Lỗi lưu file.");
    return data;
  }, []);

  const reset = useCallback(() => {
    fileBufferRef.current = null;
    setState({ validating: false, report: null, fileName: "", error: "" });
  }, []);

  return { ...state, validateFile, saveFile, reset };
}
