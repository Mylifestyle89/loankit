/**
 * bctc-extractor.ts
 *
 * Parses a standard Vietnamese "Báo Cáo Tài Chính" Excel workbook and extracts:
 *   1. CDKT  – Balance sheet rows + code-indexed map
 *   2. KQKD  – Income statement rows + code-indexed map
 *   3. CSTC  – 14 financial ratios computed from CDKT + KQKD
 *   4. Sub-tables – CT PHAI THU, TON KHO, CT PHAI TRA
 *
 * Sheet name matching is fuzzy (normalised Vietnamese, case-insensitive).
 * Column detection finds "Mã số", "Chỉ tiêu", "Số kỳ này", "Số kỳ trước" by
 * scanning header rows — tolerant of merged cells and multi-row headers.
 */

import * as XLSX from "xlsx";

// ─── Public Types ─────────────────────────────────────────────────────────────

/** A numeric value pair for current period and prior period. */
export type YearPair = { current: number | null; prior: number | null };

/** One row from CDKT or KQKD sheet. */
export type FinancialRow = {
  maSo: string;
  chiTieu: string;
  current: number | null;
  prior: number | null;
};

/** Maps Mã số string → YearPair for O(1) CSTC lookup. */
export type CodeMap = Record<string, YearPair>;

/** One row from a sub-table (phải thu / tồn kho / phải trả). */
export type SubTableRow = Record<string, string | number | null>;

export type SubTable = {
  headers: string[];
  rows: SubTableRow[];
};

/** 14 financial ratios grouped into 4 categories. */
export type CstcData = {
  // Group 1: Thanh toán (Liquidity)
  hsTtTongQuat: number | null;   // Tổng tài sản / Nợ phải trả
  hsTtNganHan: number | null;    // TSNH / Nợ ngắn hạn
  hsTtNhanh: number | null;      // (TSNH − HTK) / Nợ ngắn hạn
  hsTtTienMat: number | null;    // Tiền / Nợ ngắn hạn
  // Group 2: Cơ cấu vốn (Capital structure)
  heSoNo: number | null;         // Nợ / Tổng tài sản
  hsTuTaiTro: number | null;     // VCSH / Tổng tài sản
  // Group 3: Hoạt động (Activity)
  vqHtk: number | null;          // GVHB / HTK bình quân
  soNgayHtk: number | null;      // 365 / Vòng quay HTK
  vqPhaiThu: number | null;      // DT thuần / Phải thu bình quân
  soNgayThu: number | null;      // 365 / Vòng quay phải thu
  vqTongTs: number | null;       // DT thuần / Tổng TS bình quân
  // Group 4: Sinh lời (Profitability)
  tyLeGop: number | null;        // LN gộp / DT thuần
  ros: number | null;            // LNST / DT thuần
  roa: number | null;            // LNST / Tổng TS bình quân
  roe: number | null;            // LNST / VCSH bình quân
};

export type BctcExtractResult = {
  cdkt: { rows: FinancialRow[]; byCode: CodeMap };
  kqkd: { rows: FinancialRow[]; byCode: CodeMap };
  cstc: CstcData;
  subTables: {
    phaiThu: SubTable;
    tonKho: SubTable;
    phaiTra: SubTable;
  };
  /** Human-readable labels for "Kỳ này" / "Kỳ trước", e.g. "31/12/2024". */
  yearLabels: { current: string; prior: string };
};

// ─── Internal Helpers ─────────────────────────────────────────────────────────

/**
 * Normalise a string for comparison:
 *   - lowercase
 *   - NFD decompose → strip combining diacritics (handles all tonal Vietnamese)
 *   - đ/Đ → d
 *   - collapse whitespace
 */
function nh(s: unknown): string {
  if (s === null || s === undefined) return "";
  return String(s)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\u0111/g, "d") // đ → d
    .replace(/\s+/g, " ")
    .trim();
}

function toNum(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  if (typeof v === "string") {
    const n = parseFloat(v.replace(/[,\s]/g, ""));
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function div(a: number | null, b: number | null): number | null {
  if (a === null || b === null || b === 0) return null;
  return a / b;
}

function avg(a: number | null, b: number | null): number | null {
  if (a === null && b === null) return null;
  if (a === null) return b;
  if (b === null) return a;
  return (a + b) / 2;
}

/** Find the first sheet whose name contains any of the given normalised keywords. */
function findSheet(wb: XLSX.WorkBook, keys: string[]): XLSX.WorkSheet | null {
  const normKeys = keys.map(nh);
  for (const name of wb.SheetNames) {
    const n = nh(name);
    if (normKeys.some((k) => n.includes(k))) return wb.Sheets[name] ?? null;
  }
  return null;
}

/** Find the column index in a header row whose cell matches any keyword. */
function findCol(row: unknown[], keys: string[]): number {
  const normKeys = keys.map(nh);
  for (let i = 0; i < row.length; i++) {
    const c = nh(row[i]);
    if (normKeys.some((k) => c.includes(k))) return i;
  }
  return -1;
}

// ─── Financial Sheet Parser (CDKT / KQKD) ────────────────────────────────────

type SheetParseResult = {
  rows: FinancialRow[];
  byCode: CodeMap;
  yearLabels: { current: string; prior: string };
};

function parseFinancialSheet(ws: XLSX.WorkSheet): SheetParseResult {
  const empty: SheetParseResult = {
    rows: [],
    byCode: {},
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
  const chiTieuCol = findCol(hdr, ["chi tieu", "khoan muc", "dien giai", "noi dung"]);
  const currentCol = findCol(hdr, [
    "so ky nay",
    "cuoi nam",
    "cuoi ky",
    "so cuoi nam",
    "so cuoi ky",
    "ky nay",
  ]);
  const priorCol = findCol(hdr, [
    "so ky truoc",
    "dau nam",
    "dau ky",
    "so dau nam",
    "so dau ky",
    "ky truoc",
  ]);

  if (maSoCol === -1 || currentCol === -1) return empty;

  // Try to infer year labels from rows above the header row (e.g. "31/12/2024")
  let currentLabel = "Kỳ này";
  let priorLabel = "Kỳ trước";
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

  const rows: FinancialRow[] = [];
  const byCode: CodeMap = {};

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
  }

  return { rows, byCode, yearLabels: { current: currentLabel, prior: priorLabel } };
}

// ─── Sub-table Parser ─────────────────────────────────────────────────────────

function parseSubTable(ws: XLSX.WorkSheet | null): SubTable {
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

// ─── CSTC Ratio Computation ───────────────────────────────────────────────────

function computeCstc(cdkt: CodeMap, kqkd: CodeMap): CstcData {
  const c = (map: CodeMap, code: string): YearPair =>
    map[code] ?? { current: null, prior: null };

  const tsng = c(cdkt, "270");
  const tsnh = c(cdkt, "100");
  const no = c(cdkt, "300");
  const noNH = c(cdkt, "310");
  const htk = c(cdkt, "140");
  const tien = c(cdkt, "110");
  const phaiThu = c(cdkt, "130");
  const vcsh = c(cdkt, "400");

  const dtThuan = c(kqkd, "10");
  const gvhb = c(kqkd, "11");
  const lnGop = c(kqkd, "20");
  const lnst = c(kqkd, "60");

  const vqHtk = div(gvhb.current, avg(htk.current, htk.prior));
  const vqPhaiThu = div(dtThuan.current, avg(phaiThu.current, phaiThu.prior));
  const vqTongTs = div(dtThuan.current, avg(tsng.current, tsng.prior));

  const tsnhMinusHtk =
    tsnh.current !== null && htk.current !== null ? tsnh.current - htk.current : null;

  return {
    hsTtTongQuat: div(tsng.current, no.current),
    hsTtNganHan: div(tsnh.current, noNH.current),
    hsTtNhanh: div(tsnhMinusHtk, noNH.current),
    hsTtTienMat: div(tien.current, noNH.current),

    heSoNo: div(no.current, tsng.current),
    hsTuTaiTro: div(vcsh.current, tsng.current),

    vqHtk,
    soNgayHtk: div(365, vqHtk),
    vqPhaiThu,
    soNgayThu: div(365, vqPhaiThu),
    vqTongTs,

    tyLeGop: div(lnGop.current, dtThuan.current),
    ros: div(lnst.current, dtThuan.current),
    roa: div(lnst.current, avg(tsng.current, tsng.prior)),
    roe: div(lnst.current, avg(vcsh.current, vcsh.prior)),
  };
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Parse a BAO CAO TAI CHINH Excel workbook from a Buffer and return structured
 * financial data including balance sheet, income statement, ratios, and sub-tables.
 *
 * @throws Will throw if `buffer` is not a valid Excel file.
 */
export function extractBctc(buffer: Buffer): BctcExtractResult {
  const wb = XLSX.read(buffer, { type: "buffer" });

  const cdktWs = findSheet(wb, ["cdkt", "can doi ke toan", "balance sheet"]);
  const kqkdWs = findSheet(wb, ["bckqkd", "kqkd", "ket qua kinh doanh", "income"]);
  const phaiThuWs = findSheet(wb, ["ct phai thu", "phai thu kh", "cong no phai thu"]);
  const tonKhoWs = findSheet(wb, ["ton kho", "hang ton kho", "inventory"]);
  const phaiTraWs = findSheet(wb, ["ct phai tra", "phai tra ncc", "cong no phai tra"]);

  const cdktResult = cdktWs
    ? parseFinancialSheet(cdktWs)
    : { rows: [], byCode: {}, yearLabels: { current: "Kỳ này", prior: "Kỳ trước" } };

  const kqkdResult = kqkdWs
    ? parseFinancialSheet(kqkdWs)
    : { rows: [], byCode: {}, yearLabels: { current: "Kỳ này", prior: "Kỳ trước" } };

  // Prefer year labels from CDKT; fall back to KQKD; fall back to defaults
  const yearLabels =
    cdktResult.yearLabels.current !== "Kỳ này"
      ? cdktResult.yearLabels
      : kqkdResult.yearLabels;

  return {
    cdkt: { rows: cdktResult.rows, byCode: cdktResult.byCode },
    kqkd: { rows: kqkdResult.rows, byCode: kqkdResult.byCode },
    cstc: computeCstc(cdktResult.byCode, kqkdResult.byCode),
    subTables: {
      phaiThu: parseSubTable(phaiThuWs),
      tonKho: parseSubTable(tonKhoWs),
      phaiTra: parseSubTable(phaiTraWs),
    },
    yearLabels,
  };
}
