// Detect XLSX loan plan type: A (horizontal key-value), B (vertical table), C (unknown)

import type { WorkBook } from "xlsx";
import * as XLSX from "xlsx";
import type { XlsxDetectedType } from "./xlsx-loan-plan-types";

// Type A suffix pattern: headers end with _DG, _SL, _TT
const TYPE_A_SUFFIXES = ["_DG", "_SL", "_TT"];

// Type B fuzzy header patterns for vertical table columns
const TYPE_B_PATTERNS: RegExp[] = [
  /^(stt|tt|#)$/i,
  /t[eê]n\s*h[aà]ng|n[oộ]i\s*dung|kho[aả]n\s*m[uụ]c|h[aạ]ng\s*m[uụ]c|di[eễ]n\s*gi[aả]i/i,
  /[đd][oơ]n\s*v[iị]|[đd]vt/i,
  /s[oố]\s*l[uư][oợ]ng|sl/i,
  /[đd][oơ]n\s*gi[aá]|[đd]g/i,
  /th[aà]nh\s*ti[eề]n|tt/i,
];

/** Read first row of Sheet1 as string[] */
function getFirstRowHeaders(wb: WorkBook): string[] {
  const sheetName = wb.SheetNames[0];
  if (!sheetName) return [];
  const ws = wb.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json<string[]>(ws, { header: 1, defval: "" });
  if (!rows[0]) return [];
  return rows[0].map((h) => String(h).trim());
}

/** Check if Sheet2 has [PA.xxx] placeholder patterns */
function hasPlaceholderSheet(wb: WorkBook): boolean {
  if (wb.SheetNames.length < 2) return false;
  const ws = wb.Sheets[wb.SheetNames[1]];
  const rows = XLSX.utils.sheet_to_json<string[]>(ws, { header: 1, defval: "" });
  return rows.some((row) => row.some((cell) => /\[PA\..+\]/.test(String(cell))));
}

/** Count how many Type B header patterns match in a row */
function countTableHeaderMatches(headers: string[]): number {
  return TYPE_B_PATTERNS.filter((pat) => headers.some((h) => pat.test(h))).length;
}

/** Check if file matches Type S standard template: sheet named "Chi phí - Doanh thu" or "Thông tin vay" */
function isStandardTemplate(wb: WorkBook): boolean {
  const hasSheet1 = wb.SheetNames.some((n) => /chi ph[ií].*doanh thu/i.test(n));
  const hasSheet2 = wb.SheetNames.some((n) => /thông tin vay/i.test(n));
  if (hasSheet1 && hasSheet2) return true;

  // Also detect by row 3 "Số sào đất:" pattern in first sheet
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<string[]>(ws, { header: 1, defval: "" });
  if (rows[2] && /s[oố]\s*s[aà]o\s*[đd][aấ]t/i.test(String(rows[2][0]))) return true;

  return false;
}

/**
 * Detect XLSX structure type.
 * - S: Standard template (TEMPLATE-*.xlsx) with "Chi phí - Doanh thu" + "Thông tin vay" sheets
 * - A: Row1 has _DG/_SL/_TT suffixed headers (horizontal key-value)
 * - B: Has table headers like STT, Tên hàng, ĐVT, SL, ĐG, TT (vertical table)
 * - C: Unrecognized structure
 */
export function detectXlsxType(wb: WorkBook): XlsxDetectedType {
  const headers = getFirstRowHeaders(wb);

  // Check Type A first: Sheet1 has _DG/_SL/_TT suffix headers (takes priority over S)
  const hasSuffixHeaders = headers.some((h) =>
    TYPE_A_SUFFIXES.some((s) => h.endsWith(s)),
  );
  if (hasSuffixHeaders || hasPlaceholderSheet(wb)) return "A";

  // Check Type S (standard template with named sheets)
  if (isStandardTemplate(wb)) return "S";

  if (headers.length === 0) return "C";

  // Check Type B: scan first 10 rows for table header row
  const sheetName = wb.SheetNames[0];
  const ws = wb.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json<string[]>(ws, { header: 1, defval: "" });
  for (let i = 0; i < Math.min(rows.length, 10); i++) {
    const row = rows[i].map((c) => String(c).trim());
    if (countTableHeaderMatches(row) >= 3) return "B";
  }

  return "C";
}
