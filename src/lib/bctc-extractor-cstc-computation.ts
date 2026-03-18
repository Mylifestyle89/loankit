/**
 * bctc-extractor-cstc-computation.ts
 *
 * Computes 19 financial ratios (CSTC) from CDKT and KQKD code maps.
 * Ratios are returned as YearPair { current, prior } for year-over-year comparison.
 */

import { YearPair, CstcData, CodeMap } from "./bctc-extractor-types";
import { div, avg } from "./bctc-extractor-helpers";

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

export function computeCstc(
  cdkt: CodeMap,
  kqkd: CodeMap,
  cdktN2?: Record<string, number | null>,
  kqkdN2?: Record<string, number | null>,
): CstcData {
  const nil: YearPair = { current: null, prior: null };
  /** Look up a code, with optional fallback code (TT200 → TT133 compat). */
  const c = (map: CodeMap, code: string, fallback?: string): YearPair => {
    const v = map[code];
    if (v && (v.current !== null || v.prior !== null)) return v;
    return fallback ? (map[fallback] ?? nil) : (v ?? nil);
  };
  /** Get N-2 value for a code from CDKT or KQKD N-2 maps. */
  const n2 = (map: Record<string, number | null> | undefined, code: string, fallback?: string): number | null =>
    map?.[code] ?? (fallback ? (map?.[fallback] ?? null) : null);

  // ── CĐKT items ──
  // TT200 uses 270 for Tổng TS, TT133 uses 250; similarly 220 vs 210 for TSCĐ
  const tsng = c(cdkt, "270", "250");   // Tổng tài sản
  const tsnh = c(cdkt, "100");          // Tài sản ngắn hạn
  const no = c(cdkt, "300");            // Nợ phải trả
  const noNH = c(cdkt, "310");          // Nợ ngắn hạn
  const htk = c(cdkt, "140");           // Hàng tồn kho
  const tien = c(cdkt, "110");          // Tiền và tương đương tiền
  const phaiThu = c(cdkt, "130");       // Phải thu ngắn hạn
  const vcsh = c(cdkt, "400");          // Vốn chủ sở hữu
  const tscd = c(cdkt, "220", "210");   // Tài sản cố định (TT200: 220, TT133: 210)

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
  const tscdN2 = n2(cdktN2, "220", "210");
  const tsngN2 = n2(cdktN2, "270", "250");
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
