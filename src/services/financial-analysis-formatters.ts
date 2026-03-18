/**
 * financial-analysis-formatters.ts
 *
 * Formatting utilities for BCTC data: numbers, ratios, financial rows, CSTC table.
 * Used by financial-analysis.service.ts to build the AI prompt.
 */

import type {
  BctcExtractResult,
  CstcData,
  FinancialRow,
  SubTable,
} from "@/lib/bctc-extractor";

// ─── Constants ────────────────────────────────────────────────────────────────

export const CSTC_LABELS: Record<keyof CstcData, string> = {
  // Group 1: Thanh toán
  hsTtTongQuat: "Hệ số thanh toán tổng quát (Tổng TS / Nợ phải trả)",
  hsTtNganHan: "Hệ số khả năng thanh toán hiện hành (TSNH / Nợ NH)",
  hsTtNhanh: "Hệ số khả năng thanh toán nhanh ((TSNH − HTK) / Nợ NH)",
  hsTtTienMat: "Hệ số khả năng thanh toán tức thời (Tiền / Nợ NH)",
  hsTtLaiVay: "Hệ số khả năng thanh toán lãi vay ((LNTT + Lãi vay) / Lãi vay)",
  // Group 2: Cơ cấu vốn
  heSoNo: "Hệ số nợ (Nợ / Tổng TS)",
  hsTuTaiTro: "Hệ số tự tài trợ (VCSH / Tổng TS)",
  heSoNoVcsh: "Hệ số nợ trên vốn chủ sở hữu (Nợ / VCSH)",
  // Group 3: Hoạt động
  vqVld: "Vòng quay vốn lưu động (DT thuần / TSNH BQ)",
  vqHtk: "Vòng quay hàng tồn kho (GVHB / HTK BQ)",
  soNgayHtk: "Số ngày tồn kho (365 / Vòng quay HTK)",
  vqPhaiThu: "Vòng quay khoản phải thu (DT thuần / Phải thu BQ)",
  soNgayThu: "Số ngày thu tiền BQ (365 / Vòng quay phải thu)",
  vqTscd: "Vòng quay tài sản cố định (DT thuần / TSCĐ BQ)",
  vqTongTs: "Vòng quay tổng tài sản (DT thuần / Tổng TS BQ)",
  // Group 4: Sinh lời
  tyLeGop: "Tỷ suất lợi nhuận gộp (LN gộp / DT thuần)",
  ros: "ROS – Tỷ suất lợi nhuận biên (LNST / DT thuần)",
  roa: "ROA – Khả năng sinh lời tài sản (LNST / Tổng TS BQ)",
  roe: "ROE – Khả năng sinh lời VCSH (LNST / VCSH BQ)",
  bep: "BEP – Tỷ số sinh lời cơ sở ((LNTT + Lãi vay) / Tổng TS)",
};

// ─── Number Formatters ────────────────────────────────────────────────────────

export function fmtNum(v: number | null): string {
  if (v === null) return "N/A";
  const abs = Math.abs(v);
  const s = Math.round(abs).toLocaleString("en-US").replace(/,/g, ".");
  return v < 0 ? `(${s})` : s;
}

export function fmtRatio(v: number | null): string {
  if (v === null) return "N/A";
  return v.toFixed(2);
}

// ─── Table Formatters ─────────────────────────────────────────────────────────

export function formatFinancialRows(
  title: string,
  rows: FinancialRow[],
  currentLabel: string,
  priorLabel: string,
): string {
  if (!rows.length) return "";

  const lines = [
    `=== ${title} ===`,
    `| Chỉ tiêu | Mã số | ${currentLabel} | ${priorLabel} |`,
    `|---|---|---|---|`,
  ];
  for (const r of rows) {
    lines.push(`| ${r.chiTieu} | ${r.maSo} | ${fmtNum(r.current)} | ${fmtNum(r.prior)} |`);
  }
  return lines.join("\n");
}

export function formatCstc(cstc: CstcData): string {
  const lines = [
    "=== CHỈ SỐ TÀI CHÍNH (Năm hiện tại vs Năm trước) ===",
    "| Chỉ tiêu | Năm N | Năm N-1 | Biến động |",
    "|---|---|---|---|",
  ];
  for (const [key, label] of Object.entries(CSTC_LABELS)) {
    const pair = cstc[key as keyof CstcData];
    const cur = fmtRatio(pair.current);
    const pri = fmtRatio(pair.prior);
    let delta = "N/A";
    if (pair.current !== null && pair.prior !== null) {
      const d = pair.current - pair.prior;
      delta = (d >= 0 ? "+" : "") + d.toFixed(2);
    }
    lines.push(`| ${label} | ${cur} | ${pri} | ${delta} |`);
  }
  return lines.join("\n");
}

export function formatSubTable(title: string, subTable: SubTable): string {
  if (!subTable.rows.length) return "";

  const lines = [
    `=== ${title} ===`,
    `| ${subTable.headers.join(" | ")} |`,
    `|${subTable.headers.map(() => "---").join("|")}|`,
  ];
  for (const row of subTable.rows) {
    const cells = subTable.headers.map((h) => {
      const v = row[h];
      if (v === null || v === undefined) return "";
      if (typeof v === "number") return fmtNum(v);
      return String(v);
    });
    lines.push(`| ${cells.join(" | ")} |`);
  }
  return lines.join("\n");
}

export function formatBctcData(data: BctcExtractResult): string {
  const { yearLabels } = data;
  const sections: string[] = [];

  sections.push(
    formatFinancialRows(
      "BẢNG CÂN ĐỐI KẾ TOÁN (CDKT)",
      data.cdkt.rows,
      yearLabels.current,
      yearLabels.prior,
    ),
  );
  sections.push(
    formatFinancialRows(
      "BÁO CÁO KẾT QUẢ KINH DOANH (KQKD)",
      data.kqkd.rows,
      yearLabels.current,
      yearLabels.prior,
    ),
  );
  sections.push(formatCstc(data.cstc));
  sections.push(formatSubTable("CHI TIẾT PHẢI THU KHÁCH HÀNG", data.subTables.phaiThu));
  sections.push(formatSubTable("CHI TIẾT HÀNG TỒN KHO", data.subTables.tonKho));
  sections.push(formatSubTable("CHI TIẾT PHẢI TRẢ NHÀ CUNG CẤP", data.subTables.phaiTra));

  return sections.filter(Boolean).join("\n\n");
}
