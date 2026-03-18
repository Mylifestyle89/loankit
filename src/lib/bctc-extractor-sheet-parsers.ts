/**
 * bctc-extractor-sheet-parsers.ts
 *
 * Parses CDKT / KQKD financial sheets and sub-tables (phải thu, tồn kho, phải trả)
 * from a Vietnamese BCTC Excel workbook.
 */

import * as XLSX from "xlsx";
import { FinancialRow, CodeMap, SubTable, SubTableRow } from "./bctc-extractor-types";
import { nh, toNum, findCol, findYearColumns } from "./bctc-extractor-helpers";

// ─── Financial Sheet Parser (CDKT / KQKD) ────────────────────────────────────

export type SheetParseResult = {
  rows: FinancialRow[];
  byCode: CodeMap;
  /** N-2 year values (if 3+ year columns available). Maps Mã số → value. */
  byCodeN2: Record<string, number | null>;
  yearLabels: { current: string; prior: string };
};

export function parseFinancialSheet(ws: XLSX.WorkSheet): SheetParseResult {
  const empty: SheetParseResult = {
    rows: [],
    byCode: {},
    byCodeN2: {},
    yearLabels: { current: "Kỳ này", prior: "Kỳ trước" },
  };

  const raw: unknown[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null });
  if (!raw.length) return empty;

  // Find the row that contains "Mã số" — scan up to row 25
  let headerIdx = -1;
  for (let i = 0; i < Math.min(25, raw.length); i++) {
    if (raw[i].some((c) => nh(c).includes("ma so"))) {
      headerIdx = i;
      break;
    }
  }
  if (headerIdx === -1) return empty;

  const hdr = raw[headerIdx];
  const maSoCol = findCol(hdr, ["ma so"]);
  const chiTieuCol = findCol(hdr, ["chi tieu", "khoan muc", "dien giai", "noi dung", "ten tai khoan"]);
  let currentCol = findCol(hdr, [
    "so ky nay",
    "cuoi nam",
    "cuoi ky",
    "so cuoi nam",
    "so cuoi ky",
    "ky nay",
    "nam nay",
  ]);
  let priorCol = findCol(hdr, [
    "so ky truoc",
    "dau nam",
    "dau ky",
    "so dau nam",
    "so dau ky",
    "ky truoc",
    "nam truoc",
  ]);

  // Fallback: detect year-based column headers (e.g. "31/12/2024", "Năm 2024")
  let currentLabel = "Kỳ này";
  let priorLabel = "Kỳ trước";
  let n2Col = -1;
  if (currentCol === -1) {
    const yearCols = findYearColumns(hdr);
    if (yearCols) {
      currentCol = yearCols.currentCol;
      priorCol = yearCols.priorCol;
      n2Col = yearCols.n2Col;
      currentLabel = yearCols.currentLabel;
      priorLabel = yearCols.priorLabel;
    }
  }

  if (maSoCol === -1 || currentCol === -1) return empty;

  // Try to infer year labels from rows above the header row (e.g. "31/12/2024")
  if (currentLabel === "Kỳ này") {
    for (let i = Math.max(0, headerIdx - 4); i <= headerIdx; i++) {
      const row = raw[i];
      if (currentCol < row.length && row[currentCol] != null) {
        const s = String(row[currentCol]);
        if (/\d{4}/.test(s)) currentLabel = s.trim();
      }
      if (priorCol !== -1 && priorCol < row.length && row[priorCol] != null) {
        const s = String(row[priorCol]);
        if (/\d{4}/.test(s)) priorLabel = s.trim();
      }
    }
  }

  const rows: FinancialRow[] = [];
  const byCode: CodeMap = {};
  const byCodeN2: Record<string, number | null> = {};

  for (let i = headerIdx + 1; i < raw.length; i++) {
    const row = raw[i];
    const maSoRaw = row[maSoCol];
    if (maSoRaw === null || maSoRaw === undefined) continue;

    const maSo = String(maSoRaw).trim();
    // Only accept purely numeric Mã số (100, 110, 01, 10, etc.)
    if (!/^\d+$/.test(maSo)) continue;

    const chiTieu =
      chiTieuCol >= 0 && row[chiTieuCol] != null ? String(row[chiTieuCol]).trim() : "";
    const current = toNum(row[currentCol]);
    const prior = priorCol >= 0 ? toNum(row[priorCol]) : null;

    rows.push({ maSo, chiTieu, current, prior });
    byCode[maSo] = { current, prior };
    if (n2Col >= 0) {
      byCodeN2[maSo] = toNum(row[n2Col]);
    }
  }

  return { rows, byCode, byCodeN2, yearLabels: { current: currentLabel, prior: priorLabel } };
}

// ─── Sub-table Parser ─────────────────────────────────────────────────────────

export function parseSubTable(ws: XLSX.WorkSheet | null): SubTable {
  if (!ws) return { headers: [], rows: [] };

  const raw: unknown[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null });

  // Header row = first row within first 15 that has ≥2 non-blank string cells
  let headerIdx = -1;
  for (let i = 0; i < Math.min(15, raw.length); i++) {
    const strCount = raw[i].filter((v) => typeof v === "string" && v.trim().length > 1).length;
    if (strCount >= 2) {
      headerIdx = i;
      break;
    }
  }
  if (headerIdx === -1) return { headers: [], rows: [] };

  const headers = raw[headerIdx].map((v) => (v != null ? String(v).trim() : ""));

  const rows: SubTableRow[] = [];
  for (let i = headerIdx + 1; i < raw.length; i++) {
    const row = raw[i];
    if (!row.some((v) => v !== null && v !== "")) continue; // skip blank rows
    const obj: SubTableRow = {};
    for (let j = 0; j < headers.length; j++) {
      const key = headers[j] || `col_${j}`;
      const v = j < row.length ? row[j] : null;
      obj[key] = typeof v === "number" ? v : v != null ? String(v) : null;
    }
    rows.push(obj);
  }

  return { headers, rows };
}
