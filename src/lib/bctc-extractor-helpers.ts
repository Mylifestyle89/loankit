/**
 * bctc-extractor-helpers.ts
 *
 * Internal helper functions for BCTC sheet parsing:
 * string normalisation, numeric coercion, arithmetic, sheet/column finders.
 */

import * as XLSX from "xlsx";

// ─── Internal Helpers ─────────────────────────────────────────────────────────

/**
 * Normalise a string for comparison:
 *   - lowercase
 *   - NFD decompose → strip combining diacritics (handles all tonal Vietnamese)
 *   - đ/Đ → d
 *   - collapse whitespace
 */
export function nh(s: unknown): string {
  if (s === null || s === undefined) return "";
  return String(s)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\u0111/g, "d") // đ → d
    .replace(/\s+/g, " ")
    .trim();
}

export function toNum(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  if (typeof v === "string") {
    const n = parseFloat(v.replace(/[,\s]/g, ""));
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

export function div(a: number | null, b: number | null): number | null {
  if (a === null || b === null || b === 0) return null;
  return a / b;
}

export function avg(a: number | null, b: number | null): number | null {
  if (a === null && b === null) return null;
  if (a === null) return b;
  if (b === null) return a;
  return (a + b) / 2;
}

/** Find the first sheet whose name contains any of the given normalised keywords. */
export function findSheet(wb: XLSX.WorkBook, keys: string[]): XLSX.WorkSheet | null {
  const normKeys = keys.map(nh);
  for (const name of wb.SheetNames) {
    const n = nh(name);
    if (normKeys.some((k) => n.includes(k))) return wb.Sheets[name] ?? null;
  }
  return null;
}

/** Find the column index in a header row whose cell matches any keyword. */
export function findCol(row: unknown[], keys: string[]): number {
  const normKeys = keys.map(nh);
  for (let i = 0; i < row.length; i++) {
    const c = nh(row[i]);
    if (normKeys.some((k) => c.includes(k))) return i;
  }
  return -1;
}

/**
 * Scan a header row for columns containing year values (e.g. "31/12/2024", "Năm 2024").
 * Returns up to 3 most recent year columns: current, prior, and optionally n2 (N-2).
 */
export function findYearColumns(row: unknown[]): {
  currentCol: number;
  priorCol: number;
  n2Col: number;
  currentLabel: string;
  priorLabel: string;
} | null {
  const yearCols: { col: number; year: number; label: string }[] = [];
  for (let i = 0; i < row.length; i++) {
    const s = String(row[i] ?? "").trim();
    if (!s) continue;
    // Skip cells with multiple years (e.g. "So sánh 2024/2023") — those are comparison columns
    const allYears = s.match(/\d{4}/g);
    if (!allYears || allYears.length !== 1) continue;
    yearCols.push({ col: i, year: parseInt(allYears[0]), label: s });
  }
  if (yearCols.length < 2) return null;
  // Sort by year descending — pick the most recent
  yearCols.sort((a, b) => b.year - a.year);
  return {
    currentCol: yearCols[0].col,
    priorCol: yearCols[1].col,
    n2Col: yearCols.length >= 3 ? yearCols[2].col : -1,
    currentLabel: yearCols[0].label,
    priorLabel: yearCols[1].label,
  };
}
