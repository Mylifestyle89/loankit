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

/**
 * 19 financial ratios grouped into 4 categories.
 * Each ratio is a YearPair for year-over-year comparison (Năm N vs Năm N-1).
 */
export type CstcData = {
  // Group 1: Thanh toán (Liquidity) — 4 chỉ tiêu chính + 1 legacy
  hsTtTongQuat: YearPair;        // Tổng tài sản / Nợ phải trả (legacy)
  hsTtNganHan: YearPair;         // TSNH / Nợ ngắn hạn
  hsTtNhanh: YearPair;           // (TSNH − HTK) / Nợ ngắn hạn
  hsTtTienMat: YearPair;         // Tiền / Nợ ngắn hạn
  hsTtLaiVay: YearPair;          // (LNTT + Lãi vay) / Lãi vay
  // Group 2: Cơ cấu vốn (Capital structure) — 2 chính + 1 legacy
  heSoNo: YearPair;              // Nợ / Tổng tài sản (legacy)
  hsTuTaiTro: YearPair;          // VCSH / Tổng tài sản
  heSoNoVcsh: YearPair;          // Nợ phải trả / VCSH
  // Group 3: Hoạt động (Activity) — 5 chính + 2 legacy
  vqVld: YearPair;               // DT thuần / TSNH bình quân
  vqHtk: YearPair;               // GVHB / HTK bình quân
  soNgayHtk: YearPair;           // 365 / Vòng quay HTK (legacy)
  vqPhaiThu: YearPair;           // DT thuần / Phải thu bình quân
  soNgayThu: YearPair;           // 365 / Vòng quay phải thu (legacy)
  vqTscd: YearPair;              // DT thuần / TSCĐ bình quân
  vqTongTs: YearPair;            // DT thuần / Tổng TS bình quân
  // Group 4: Sinh lời (Profitability) — 4 chính + 1 legacy
  tyLeGop: YearPair;             // LN gộp / DT thuần (legacy)
  ros: YearPair;                 // LNST / DT thuần
  roa: YearPair;                 // LNST / Tổng TS bình quân
  roe: YearPair;                 // LNST / VCSH bình quân
  bep: YearPair;                 // (LNTT + Lãi vay) / Tổng TS
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

/**
 * Scan a header row for columns containing year values (e.g. "31/12/2024", "Năm 2024").
 * Returns up to 3 most recent year columns: current, prior, and optionally n2 (N-2).
 */
function findYearColumns(row: unknown[]): {
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

// ─── Financial Sheet Parser (CDKT / KQKD) ────────────────────────────────────

type SheetParseResult = {
  rows: FinancialRow[];
  byCode: CodeMap;
  /** N-2 year values (if 3+ year columns available). Maps Mã số → value. */
  byCodeN2: Record<string, number | null>;
  yearLabels: { current: string; prior: string };
};

function parseFinancialSheet(ws: XLSX.WorkSheet): SheetParseResult {
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
  const chiTieuCol = findCol(hdr, ["chi tieu", "khoan muc", "dien giai", "noi dung"]);
  let currentCol = findCol(hdr, [
    "so ky nay",
    "cuoi nam",
    "cuoi ky",
    "so cuoi nam",
    "so cuoi ky",
    "ky nay",
  ]);
  let priorCol = findCol(hdr, [
    "so ky truoc",
    "dau nam",
    "dau ky",
    "so dau nam",
    "so dau ky",
    "ky truoc",
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

/** Subtract two nullable numbers. */
function sub(a: number | null, b: number | null): number | null {
  if (a === null || b === null) return null;
  return a - b;
}

/** Add two nullable numbers. */
function add(a: number | null, b: number | null): number | null {
  if (a === null || b === null) return null;
  return a + b;
}

/** Build a YearPair from two computed values. */
function yp(current: number | null, prior: number | null): YearPair {
  return { current, prior };
}

function computeCstc(
  cdkt: CodeMap,
  kqkd: CodeMap,
  cdktN2?: Record<string, number | null>,
  kqkdN2?: Record<string, number | null>,
): CstcData {
  const c = (map: CodeMap, code: string): YearPair =>
    map[code] ?? { current: null, prior: null };
  /** Get N-2 value for a code from CDKT or KQKD N-2 maps. */
  const n2 = (map: Record<string, number | null> | undefined, code: string): number | null =>
    map?.[code] ?? null;

  // ── CĐKT items ──
  const tsng = c(cdkt, "270");   // Tổng tài sản
  const tsnh = c(cdkt, "100");   // Tài sản ngắn hạn
  const no = c(cdkt, "300");     // Nợ phải trả
  const noNH = c(cdkt, "310");   // Nợ ngắn hạn
  const htk = c(cdkt, "140");    // Hàng tồn kho
  const tien = c(cdkt, "110");   // Tiền và tương đương tiền
  const phaiThu = c(cdkt, "130"); // Phải thu ngắn hạn
  const vcsh = c(cdkt, "400");   // Vốn chủ sở hữu
  const tscd = c(cdkt, "220");   // Tài sản cố định

  // ── KQKD items ──
  const dtThuan = c(kqkd, "10"); // Doanh thu thuần
  const gvhb = c(kqkd, "11");   // Giá vốn hàng bán
  const lnGop = c(kqkd, "20");  // Lợi nhuận gộp
  const lntt = c(kqkd, "50");   // Tổng LNTT
  const lnst = c(kqkd, "60");   // LNST
  const laiVay = c(kqkd, "23"); // Chi phí lãi vay

  // ── Group 1: Thanh toán (Liquidity) ──

  // Thanh toán tổng quát = Tổng TS / Nợ phải trả
  const hsTtTongQuat = yp(
    div(tsng.current, no.current),
    div(tsng.prior, no.prior),
  );

  // Thanh toán hiện hành = TSNH / Nợ NH
  const hsTtNganHan = yp(
    div(tsnh.current, noNH.current),
    div(tsnh.prior, noNH.prior),
  );

  // Thanh toán nhanh = (TSNH - HTK) / Nợ NH
  const hsTtNhanh = yp(
    div(sub(tsnh.current, htk.current), noNH.current),
    div(sub(tsnh.prior, htk.prior), noNH.prior),
  );

  // Thanh toán tức thời = Tiền / Nợ NH
  const hsTtTienMat = yp(
    div(tien.current, noNH.current),
    div(tien.prior, noNH.prior),
  );

  // Thanh toán lãi vay = (LNTT + Lãi vay) / Lãi vay
  const hsTtLaiVay = yp(
    div(add(lntt.current, laiVay.current), laiVay.current),
    div(add(lntt.prior, laiVay.prior), laiVay.prior),
  );

  // ── Group 2: Cơ cấu vốn (Capital structure) ──

  // Hệ số nợ = Nợ / Tổng TS
  const heSoNo = yp(
    div(no.current, tsng.current),
    div(no.prior, tsng.prior),
  );

  // Tự tài trợ = VCSH / Tổng TS
  const hsTuTaiTro = yp(
    div(vcsh.current, tsng.current),
    div(vcsh.prior, tsng.prior),
  );

  // Nợ / VCSH
  const heSoNoVcsh = yp(
    div(no.current, vcsh.current),
    div(no.prior, vcsh.prior),
  );

  // ── Group 3: Hoạt động (Activity) ──
  // Năm N: dùng avg(current, prior) làm bình quân
  // Năm N-1: dùng avg(prior, N-2) nếu có N-2, fallback prior point-in-time

  // N-2 values for prior year averages
  const tsnhN2 = n2(cdktN2, "100");
  const htkN2 = n2(cdktN2, "140");
  const phaiThuN2 = n2(cdktN2, "130");
  const tscdN2 = n2(cdktN2, "220");
  const tsngN2 = n2(cdktN2, "270");
  const vcshN2 = n2(cdktN2, "400");

  // Vòng quay VLĐ = DT thuần / TSNH bình quân
  const vqVldCur = div(dtThuan.current, avg(tsnh.current, tsnh.prior));
  const vqVldPri = div(dtThuan.prior, avg(tsnh.prior, tsnhN2));
  const vqVld = yp(vqVldCur, vqVldPri);

  // Vòng quay HTK = GVHB / HTK bình quân
  const vqHtkCur = div(gvhb.current, avg(htk.current, htk.prior));
  const vqHtkPri = div(gvhb.prior, avg(htk.prior, htkN2));
  const vqHtk = yp(vqHtkCur, vqHtkPri);

  // Số ngày HTK = 365 / Vòng quay HTK
  const soNgayHtk = yp(div(365, vqHtkCur), div(365, vqHtkPri));

  // Vòng quay phải thu = DT thuần / Phải thu bình quân
  const vqPhaiThuCur = div(dtThuan.current, avg(phaiThu.current, phaiThu.prior));
  const vqPhaiThuPri = div(dtThuan.prior, avg(phaiThu.prior, phaiThuN2));
  const vqPhaiThu = yp(vqPhaiThuCur, vqPhaiThuPri);

  // Số ngày thu tiền = 365 / Vòng quay phải thu
  const soNgayThu = yp(div(365, vqPhaiThuCur), div(365, vqPhaiThuPri));

  // Vòng quay TSCĐ = DT thuần / TSCĐ bình quân
  const vqTscdCur = div(dtThuan.current, avg(tscd.current, tscd.prior));
  const vqTscdPri = div(dtThuan.prior, avg(tscd.prior, tscdN2));
  const vqTscd = yp(vqTscdCur, vqTscdPri);

  // Vòng quay tổng TS = DT thuần / Tổng TS bình quân
  const vqTongTsCur = div(dtThuan.current, avg(tsng.current, tsng.prior));
  const vqTongTsPri = div(dtThuan.prior, avg(tsng.prior, tsngN2));
  const vqTongTs = yp(vqTongTsCur, vqTongTsPri);

  // ── Group 4: Sinh lời (Profitability) ──

  // Tỷ lệ gộp = LN gộp / DT thuần
  const tyLeGop = yp(
    div(lnGop.current, dtThuan.current),
    div(lnGop.prior, dtThuan.prior),
  );

  // ROS = LNST / DT thuần
  const ros = yp(
    div(lnst.current, dtThuan.current),
    div(lnst.prior, dtThuan.prior),
  );

  // ROA = LNST / Tổng TS bình quân
  const roa = yp(
    div(lnst.current, avg(tsng.current, tsng.prior)),
    div(lnst.prior, avg(tsng.prior, tsngN2)),
  );

  // ROE = LNST / VCSH bình quân
  const roe = yp(
    div(lnst.current, avg(vcsh.current, vcsh.prior)),
    div(lnst.prior, avg(vcsh.prior, vcshN2)),
  );

  // BEP = (LNTT + Lãi vay) / Tổng TS
  const bep = yp(
    div(add(lntt.current, laiVay.current), tsng.current),
    div(add(lntt.prior, laiVay.prior), tsng.prior),
  );

  return {
    hsTtTongQuat, hsTtNganHan, hsTtNhanh, hsTtTienMat, hsTtLaiVay,
    heSoNo, hsTuTaiTro, heSoNoVcsh,
    vqVld, vqHtk, soNgayHtk, vqPhaiThu, soNgayThu, vqTscd, vqTongTs,
    tyLeGop, ros, roa, roe, bep,
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
