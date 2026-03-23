// ─── Constants for FinancialAnalysisModal ─────────────────────────────────────

import type { CstcData } from "@/lib/bctc-extractor";

export const ACCEPTED_MIME = new Set([
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-excel",
]);
export const ACCEPTED_EXT = new Set(["xlsx", "xls"]);
export const MAX_FILE_BYTES = 20 * 1024 * 1024; // 20 MB

export const CSTC_GROUPS: Array<{
  label: string;
  keys: (keyof CstcData)[];
  thresholds?: Partial<Record<keyof CstcData, string>>;
}> = [
  {
    label: "Thanh toán",
    keys: ["hsTtTongQuat", "hsTtNganHan", "hsTtNhanh", "hsTtTienMat", "hsTtLaiVay"],
    thresholds: { hsTtNganHan: "> 1 tốt", hsTtNhanh: "> 0.5 tốt", hsTtLaiVay: "> 1 tốt" },
  },
  {
    label: "Cơ cấu vốn",
    keys: ["heSoNo", "hsTuTaiTro", "heSoNoVcsh"],
    thresholds: { heSoNo: "< 0.6 tốt", hsTuTaiTro: "> 0.25 tốt", heSoNoVcsh: "< 3 tốt" },
  },
  {
    label: "Hoạt động",
    keys: ["vqVld", "vqHtk", "soNgayHtk", "vqPhaiThu", "soNgayThu", "vqTscd", "vqTongTs"],
  },
  {
    label: "Sinh lời",
    keys: ["tyLeGop", "ros", "roa", "roe", "bep"],
    thresholds: { roa: "> 5% tốt", roe: "> 10% tốt" },
  },
];

export const CSTC_LABELS: Record<keyof CstcData, string> = {
  hsTtTongQuat: "HS thanh toán tổng quát",
  hsTtNganHan: "HS thanh toán hiện hành",
  hsTtNhanh: "HS thanh toán nhanh",
  hsTtTienMat: "HS thanh toán tức thời",
  hsTtLaiVay: "HS thanh toán lãi vay",
  heSoNo: "Hệ số nợ",
  hsTuTaiTro: "HS tự tài trợ",
  heSoNoVcsh: "Nợ / VCSH",
  vqVld: "Vòng quay VLĐ",
  vqHtk: "Vòng quay HTK",
  soNgayHtk: "Số ngày tồn kho",
  vqPhaiThu: "Vòng quay phải thu",
  soNgayThu: "Số ngày thu tiền BQ",
  vqTscd: "Vòng quay TSCĐ",
  vqTongTs: "Vòng quay tổng TS",
  tyLeGop: "Tỷ suất LN gộp",
  ros: "ROS",
  roa: "ROA",
  roe: "ROE",
  bep: "BEP",
};

export const STEP_LABELS = ["Upload BCTC", "Xem dữ liệu", "Thông tin định tính", "Kết quả AI"];
