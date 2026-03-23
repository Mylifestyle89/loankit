import type { CstcData } from "@/lib/bctc-extractor";

// Step titles for the 4-step financial analysis wizard
export const STEP_TITLES = ["Upload BCTC", "Xem dữ liệu", "Thông tin bổ sung", "Phân tích AI"];

// Vietnamese labels for each CSTC (Chỉ số Tài chính) metric key
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
  soNgayThu: "Số ngày thu tiền",
  vqTscd: "Vòng quay TSCĐ",
  vqTongTs: "Vòng quay tổng TS",
  tyLeGop: "Tỷ suất LN gộp",
  ros: "ROS",
  roa: "ROA",
  roe: "ROE",
  bep: "BEP",
};

// Format a numeric value as Vietnamese locale integer string
export function fmt(v: number | null): string {
  if (v === null) return "—";
  return Math.round(v).toLocaleString("vi-VN");
}

// Format a numeric ratio to 2 decimal places
export function fmtRatio(v: number | null): string {
  if (v === null) return "—";
  return v.toFixed(2);
}
