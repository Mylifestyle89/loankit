// ─── Utility helpers for FinancialAnalysisModal ───────────────────────────────

import { ACCEPTED_EXT, ACCEPTED_MIME, MAX_FILE_BYTES } from "./financial-analysis-constants";

/** Format integer number (triệu/tỷ) with Vietnamese locale, negative in parens */
export function fmtNum(v: number | null): string {
  if (v === null || v === undefined) return "—";
  const abs = Math.abs(v);
  const s = Math.round(abs).toLocaleString("vi-VN");
  return v < 0 ? `(${s})` : s;
}

/** Format ratio/percentage to fixed decimal places */
export function fmtRatio(v: number | null, digits = 2): string {
  if (v === null || v === undefined) return "—";
  return v.toFixed(digits);
}

/** Validate uploaded file — returns error string or null if valid */
export function validateFile(file: File): string | null {
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  const mime = file.type ?? "";
  if (!ACCEPTED_EXT.has(ext) && !ACCEPTED_MIME.has(mime)) {
    return `Chỉ hỗ trợ file Excel (.xlsx, .xls). Nhận được: .${ext}`;
  }
  if (file.size > MAX_FILE_BYTES) {
    return "File vượt quá giới hạn 20MB.";
  }
  return null;
}
