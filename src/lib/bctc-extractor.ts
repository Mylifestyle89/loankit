/**
 * bctc-extractor.ts
 *
 * Parses a standard Vietnamese "Báo Cáo Tài Chính" Excel workbook and extracts:
 *   1. CDKT  – Balance sheet rows + code-indexed map
 *   2. KQKD  – Income statement rows + code-indexed map
 *   3. CSTC  – 19 financial ratios (YearPair) computed from CDKT + KQKD
 *   4. Sub-tables – CT PHAI THU, TON KHO, CT PHAI TRA
 *
 * Each ratio in CSTC is a YearPair { current, prior } to support year-over-year
 * comparison (Năm N vs Năm N-1).
 *
 * Sheet name matching is fuzzy (normalised Vietnamese, case-insensitive).
 * Column detection finds "Mã số", "Chỉ tiêu", "Số kỳ này", "Số kỳ trước" by
 * scanning header rows — tolerant of merged cells and multi-row headers.
 */

import * as XLSX from "xlsx";
import { BctcExtractResult, CodeMap } from "./bctc-extractor-types";
import { findSheet } from "./bctc-extractor-helpers";
import { parseFinancialSheet, SheetParseResult, parseSubTable } from "./bctc-extractor-sheet-parsers";
import { computeCstc } from "./bctc-extractor-cstc-computation";

// Re-export all public types for backward compatibility
export type {
  YearPair,
  FinancialRow,
  CodeMap,
  SubTableRow,
  SubTable,
  CstcData,
  BctcExtractResult,
} from "./bctc-extractor-types";

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Parse a BAO CAO TAI CHINH Excel workbook from a Buffer and return structured
 * financial data including balance sheet, income statement, ratios, and sub-tables.
 *
 * @throws Will throw if `buffer` is not a valid Excel file.
 */
export function extractBctc(buffer: Buffer): BctcExtractResult {
  const wb = XLSX.read(buffer, { type: "buffer" });

  const emptyResult: SheetParseResult = {
    rows: [],
    byCode: {},
    byCodeN2: {},
    yearLabels: { current: "Kỳ này", prior: "Kỳ trước" },
  };

  const cdktWs = findSheet(wb, ["cdkt", "can doi ke toan", "balance sheet"]);
  const kqkdWs = findSheet(wb, ["bckqkd", "kqkd", "ket qua kinh doanh", "income"]);
  const phaiThuWs = findSheet(wb, ["ct phai thu", "phai thu kh", "cong no phai thu"]);
  const tonKhoWs = findSheet(wb, ["ton kho", "hang ton kho", "inventory"]);
  const phaiTraWs = findSheet(wb, ["ct phai tra", "phai tra ncc", "cong no phai tra"]);

  let cdktResult = cdktWs ? parseFinancialSheet(cdktWs) : emptyResult;
  let kqkdResult = kqkdWs ? parseFinancialSheet(kqkdWs) : emptyResult;

  // Fallback: DL-IPCAS sheet contains combined CDKT + KQKD data with Mã số codes.
  // Use it when dedicated sheets return no data (e.g. CĐKT lacks Mã số column).
  if (cdktResult.rows.length === 0 || kqkdResult.rows.length === 0) {
    const dlIpcasWs = findSheet(wb, ["dl-ipcas", "dl ipcas", "du lieu ipcas"]);
    if (dlIpcasWs) {
      const combined = parseFinancialSheet(dlIpcasWs);
      if (combined.rows.length > 0) {
        // Split by code range: CDKT uses 100-999, KQKD uses 01-99
        const cdktRows = combined.rows.filter((r) => parseInt(r.maSo) >= 100);
        const kqkdRows = combined.rows.filter((r) => parseInt(r.maSo) < 100);
        const cdktByCode: CodeMap = {};
        const kqkdByCode: CodeMap = {};
        for (const r of cdktRows) cdktByCode[r.maSo] = { current: r.current, prior: r.prior };
        for (const r of kqkdRows) kqkdByCode[r.maSo] = { current: r.current, prior: r.prior };

        // Split N-2 data by code range too
        const cdktN2: Record<string, number | null> = {};
        const kqkdN2: Record<string, number | null> = {};
        for (const [code, val] of Object.entries(combined.byCodeN2)) {
          if (parseInt(code) >= 100) cdktN2[code] = val;
          else kqkdN2[code] = val;
        }

        if (cdktResult.rows.length === 0 && cdktRows.length > 0) {
          cdktResult = { rows: cdktRows, byCode: cdktByCode, byCodeN2: cdktN2, yearLabels: combined.yearLabels };
        }
        if (kqkdResult.rows.length === 0 && kqkdRows.length > 0) {
          kqkdResult = { rows: kqkdRows, byCode: kqkdByCode, byCodeN2: kqkdN2, yearLabels: combined.yearLabels };
        }
      }
    }
  }

  // Prefer year labels from CDKT; fall back to KQKD; fall back to defaults
  const yearLabels =
    cdktResult.yearLabels.current !== "Kỳ này"
      ? cdktResult.yearLabels
      : kqkdResult.yearLabels;

  return {
    cdkt: { rows: cdktResult.rows, byCode: cdktResult.byCode },
    kqkd: { rows: kqkdResult.rows, byCode: kqkdResult.byCode },
    cstc: computeCstc(
      cdktResult.byCode,
      kqkdResult.byCode,
      Object.keys(cdktResult.byCodeN2).length > 0 ? cdktResult.byCodeN2 : undefined,
      Object.keys(kqkdResult.byCodeN2).length > 0 ? kqkdResult.byCodeN2 : undefined,
    ),
    subTables: {
      phaiThu: parseSubTable(phaiThuWs),
      tonKho: parseSubTable(tonKhoWs),
      phaiTra: parseSubTable(phaiTraWs),
    },
    yearLabels,
  };
}
