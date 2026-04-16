/**
 * KHCN builder: savings (tiet_kiem) and other (tai_san_khac) collateral data.
 */
import { decryptCollateralOwners } from "@/lib/field-encryption";
import { numberToVietnameseWords } from "@/lib/number-to-vietnamese-words";
import { fmtN } from "@/lib/report/format-number-vn";
import { type Data, emitIndexedFields, emitFlatFields } from "./khcn-builder-collateral-helpers";

// ── Helper: map paper type label ──

function mapPaperTypeLabel(subtype: string, paperType: string): string {
  if (subtype !== "gtcg") return "Sổ tiết kiệm";
  if (paperType === "trai_phieu") return "Trái phiếu";
  if (paperType === "chung_chi_tien_gui") return "Chứng chỉ tiền gửi";
  return "Sổ tiết kiệm";
}

// ── Helper: extract savings collateral fields ──

function extractSavingsFields(
  col: { name: string; total_value?: number | null; obligation?: number | null; properties_json: string },
) {
  const p = decryptCollateralOwners(JSON.parse(col.properties_json || "{}")) as Record<string, any>;
  const isGtcg = p._subtype === "gtcg";
  return {
    "Tên TSBĐ": col.name,
    "Loại TSBĐ": isGtcg ? "Giấy tờ có giá" : "Thẻ tiết kiệm",
    "Số seri": p.serial ?? "",
    "Số giấy tờ": p.paper_number ?? "",
    "Loại giấy tờ có giá": mapPaperTypeLabel(p._subtype, p.paper_type),
    "Tổ chức phát hành": p.issuer ?? "",
    "Mệnh giá": fmtN(p.face_value),
    "Kỳ hạn": p.term ?? "",
    "Số dư": fmtN(p.balance),
    "Lãi suất": p.interest_rate ?? "",
    "Lãi suất gửi": p.interest_rate ?? "",
    "Ngày phát hành": p.issue_date ?? "",
    "Ngày đến hạn": p.maturity_date ?? "",
    "Mức vay tối đa": fmtN(p.max_loan),
    "Giá trị tài sản": fmtN(col.total_value),
    "Số dư đồng": fmtN(p.balance || p.face_value),
    "GTTS bằng chữ": col.total_value ? numberToVietnameseWords(col.total_value) : "",
    "Nghĩa vụ bảo đảm": fmtN(col.obligation),
    "NVBĐ bằng chữ": col.obligation ? numberToVietnameseWords(col.obligation) : "",
  };
}

// ── Collateral type-specific: TK (Tiết kiệm) ──

export function buildSavingsCollateralData(
  collaterals: Array<{
    collateral_type: string; name: string;
    total_value?: number | null; obligation?: number | null;
    properties_json: string;
  }>,
  data: Data,
) {
  const items = collaterals.filter((c) => c.collateral_type === "tiet_kiem");
  // Parse properties_json once per item — reused for flat fields, totals, and loop rows
  const parsed = items.map((col) => ({
    col,
    props: decryptCollateralOwners(JSON.parse(col.properties_json || "{}")) as Record<string, any> as Record<string, string>,
  }));

  // Indexed TK_1.*, TK_2.*, STK_1.*, STK_2.*... + flat TK.*, STK.* from first
  const allFields = parsed.map(({ col }) => extractSavingsFields(col));
  allFields.forEach((fields, i) => {
    emitIndexedFields(data, "TK", fields, i + 1);
    emitIndexedFields(data, "STK", fields, i + 1);
  });
  if (allFields.length > 0) {
    emitFlatFields(data, "TK", allFields[0]);
    emitFlatFields(data, "STK", allFields[0]);
  }

  const tkTotalValue = items.reduce((s, c) => s + (c.total_value ?? 0), 0);
  const tkTotalObl = items.reduce((s, c) => s + (c.obligation ?? 0), 0);
  data["TK.Tổng giá trị tất cả TS"] = fmtN(tkTotalValue);
  data["TK.Tổng GTTS bằng chữ"] = tkTotalValue ? numberToVietnameseWords(tkTotalValue) : "";
  data["TK.Tổng NVBĐ"] = fmtN(tkTotalObl);
  data["TK.Tổng NVBĐ bằng chữ"] = tkTotalObl ? numberToVietnameseWords(tkTotalObl) : "";

  // "Thu nhập từ gốc lãi" = sum of balance (or face_value for GTCG) across all items
  const tkGocLai = parsed.reduce((s, { props: p }) =>
    s + (parseFloat(p.balance) || parseFloat(p.face_value) || 0), 0);
  data["Thu nhập từ gốc lãi CCTG, SDTG"] = fmtN(tkGocLai);
  data["TNTGL bằng chữ"] = tkGocLai ? numberToVietnameseWords(tkGocLai) : "";

  // Loop arrays for [#STK]...[/STK] and [#TK_CHI_TIET]...[/TK_CHI_TIET]
  // Duplicate keys are intentional — DOCX templates use varying placeholder names
  const stkLoopRows = parsed.map(({ col, props: p }, i) => {
    const label = mapPaperTypeLabel(p._subtype, p.paper_type);
    const serial = p.serial ?? "";
    const rate = p.interest_rate ?? "";
    const issuer = p.issuer ?? "";
    const balOrFace = fmtN(p.balance || p.face_value);
    return {
      STT: i + 1,
      "Loại giấy tờ có giá": label,
      "Số seri": serial, "Số Sêri": serial,
      "Số dư/ mệnh giá": balOrFace, "Số dư đồng": balOrFace,
      "Số dư": fmtN(p.balance), "Mệnh giá": fmtN(p.face_value),
      "Giá trị TSBĐ": fmtN(col.total_value),
      "Lãi suất của CCTG": rate, "Lãi suất gửi": rate, "Lãi suất": rate,
      "Ngày phát hành": p.issue_date ?? "", "Ngày đến hạn": p.maturity_date ?? "",
      "Tổ chức phát hành": issuer, "Tổ chức/ Đơn vị phát hành": issuer,
      "Tên TSBĐ": col.name, "Kỳ hạn": p.term ?? "",
      "Nghĩa vụ bảo đảm": fmtN(col.obligation),
    };
  });
  data.STK = stkLoopRows;
  data.TK_CHI_TIET = stkLoopRows;
}

// ── Helper: extract other collateral fields ──

function extractOtherFields(
  col: { name: string; total_value?: number | null; obligation?: number | null; properties_json: string },
) {
  const p = decryptCollateralOwners(JSON.parse(col.properties_json || "{}")) as Record<string, any>;
  return {
    "Tên TSBĐ": col.name,
    "Mua bảo hiểm TSBĐ": p.insurance ?? "",
    "Hiện trạng tài sản": p.asset_status ?? "",
    "Tính thanh khoản": p.liquidity ?? "",
    "Tính pháp lý": p.legality ?? "",
    "Giá trị tài sản": fmtN(col.total_value),
    "Nghĩa vụ bảo đảm": fmtN(col.obligation),
  };
}

// ── Collateral type-specific: TSK (Tài sản khác) ──

export function buildOtherCollateralData(
  collaterals: Array<{
    collateral_type: string; name: string;
    total_value?: number | null; obligation?: number | null;
    properties_json: string;
  }>,
  data: Data,
) {
  const items = collaterals.filter((c) => c.collateral_type === "tai_san_khac");

  // Indexed TSK_1.*, TSK_2.*... + flat TSK.* from first (backward compat)
  const allFields = items.map((col) => extractOtherFields(col));
  allFields.forEach((fields, i) => {
    emitIndexedFields(data, "TSK", fields, i + 1);
  });
  if (allFields.length > 0) {
    emitFlatFields(data, "TSK", allFields[0]);
  }

  const tskTotalValue = items.reduce((s, c) => s + (c.total_value ?? 0), 0);
  const tskTotalObl = items.reduce((s, c) => s + (c.obligation ?? 0), 0);
  data["TSK.Tổng giá trị tất cả TS"] = fmtN(tskTotalValue);
  data["TSK.Tổng GTTS bằng chữ"] = tskTotalValue ? numberToVietnameseWords(tskTotalValue) : "";
  data["TSK.Tổng NVBĐ"] = fmtN(tskTotalObl);
  data["TSK.Tổng NVBĐ bằng chữ"] = tskTotalObl ? numberToVietnameseWords(tskTotalObl) : "";
}
