/**
 * bctc-extractor-types.ts
 *
 * Public types for the BCTC extractor module.
 */

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
