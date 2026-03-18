/**
 * KHCN builder: savings (tiet_kiem) and other (tai_san_khac) collateral data.
 */
import { numberToVietnameseWords } from "@/lib/number-to-vietnamese-words";
import { fmtN } from "@/lib/report/format-number-vn";
import { type Data, emitIndexedFields, emitFlatFields } from "./khcn-builder-collateral-helpers";

// ── Helper: extract savings collateral fields ──

function extractSavingsFields(
  col: { name: string; total_value?: number | null; obligation?: number | null; properties_json: string },
) {
  const p = JSON.parse(col.properties_json || "{}");
  return {
    "Tên TSBĐ": col.name,
    "Số seri": p.serial ?? "",
    "Tổ chức phát hành": p.issuer ?? "",
    "Kỳ hạn": p.term ?? "",
    "Số dư": fmtN(p.balance),
    "Lãi suất": p.interest_rate ?? "",
    "Ngày phát hành": p.issue_date ?? "",
    "Ngày đến hạn": p.maturity_date ?? "",
    "Mức vay tối đa": fmtN(p.max_loan),
    "Giá trị tài sản": fmtN(col.total_value),
    "Nghĩa vụ bảo đảm": fmtN(col.obligation),
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

  // Indexed TK_1.*, TK_2.*... + flat TK.* from first (backward compat)
  const allFields = items.map((col) => extractSavingsFields(col));
  allFields.forEach((fields, i) => {
    emitIndexedFields(data, "TK", fields, i + 1);
  });
  if (allFields.length > 0) {
    emitFlatFields(data, "TK", allFields[0]);
  }

  const tkTotalValue = items.reduce((s, c) => s + (c.total_value ?? 0), 0);
  const tkTotalObl = items.reduce((s, c) => s + (c.obligation ?? 0), 0);
  data["TK.Tổng giá trị tất cả TS"] = fmtN(tkTotalValue);
  data["TK.Tổng GTTS bằng chữ"] = tkTotalValue ? numberToVietnameseWords(tkTotalValue) : "";
  data["TK.Tổng NVBĐ"] = fmtN(tkTotalObl);
  data["TK.Tổng NVBĐ bằng chữ"] = tkTotalObl ? numberToVietnameseWords(tkTotalObl) : "";
}

// ── Helper: extract other collateral fields ──

function extractOtherFields(
  col: { name: string; total_value?: number | null; obligation?: number | null; properties_json: string },
) {
  const p = JSON.parse(col.properties_json || "{}");
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
