/**
 * KHCN builder: movable collateral (dong_san / động sản) data.
 */
import { decryptCollateralOwners } from "@/lib/field-encryption";
import { numberToVietnameseWords } from "@/lib/number-to-vietnamese-words";
import { fmtN } from "@/lib/report/format-number-vn";
import { type Data, parseOwners, buildOwnerFields, emitIndexedFields, emitFlatFields } from "./khcn-builder-collateral-helpers";

// ── Helper: extract movable collateral fields ──

/** Add `ĐS.{key}` alias for every key in obj — for templates using prefixed
 *  placeholders like [ĐS.Nhãn hiệu] inside [#ĐS] loop. Without aliases,
 *  docxtemplater (no angularParser) falls back to top-level scope and shows
 *  same value across all loop iterations. */
function withDsAliases<T extends Record<string, unknown>>(obj: T): T & Record<string, unknown> {
  const out: Record<string, unknown> = { ...obj };
  for (const [k, v] of Object.entries(obj)) {
    if (k === "STT") continue;
    out[`ĐS.${k}`] = v;
  }
  return out as T & Record<string, unknown>;
}

function extractMovableFields(
  col: { name: string; total_value?: number | null; obligation?: number | null; properties_json: string },
  index: number,
) {
  const p = decryptCollateralOwners(JSON.parse(col.properties_json || "{}")) as Record<string, any>;
  const owners = parseOwners(p._owners);
  const o1 = owners[0] ?? {};
  const fields = {
    STT: index + 1,
    "Tên TSBĐ": col.name,
    "Nhãn hiệu": p.brand ?? p.nhan_hieu ?? "",
    "Số loại": p.model_code ?? p.so_loai ?? "",
    "Biển kiểm soát": p.license_plate ?? p.bien_ks ?? "",
    "Số khung": p.chassis_number ?? p.so_khung ?? "",
    "Số máy": p.engine_number ?? p.so_may ?? "",
    "Màu sơn": p.color ?? p.mau_son ?? "",
    "Năm sản xuất": p.manufacture_year ?? p.year ?? p.nam_sx ?? "",
    "Số chỗ ngồi": p.seat_count ?? p.seats ?? p.so_cho ?? "",
    "Giấy đăng ký số": p.registration_number ?? p.giay_dk ?? "",
    "Ngày cấp ĐK": p.registration_date ?? p.cap_ngay ?? "",
    "Cấp ngày": p.registration_date ?? p.cap_ngay ?? "", // alias for template [ĐS.Cấp ngày]
    "Nơi cấp ĐK": p.registration_place ?? p.co_quan_cap ?? "",
    "Cơ quan cấp": p.registration_place ?? p.co_quan_cap ?? "", // alias for template [ĐS.Cơ quan cấp]
    "Giá trị tài sản": fmtN(col.total_value),
    "GTTS bằng chữ": col.total_value ? numberToVietnameseWords(col.total_value) : "",
    "Nghĩa vụ bảo đảm": fmtN(col.obligation),
    "Nghĩa vụ bảo đảm tối đa": fmtN(col.obligation),
    "NVBĐ bằng chữ": col.obligation ? numberToVietnameseWords(col.obligation) : "",
    "Số HĐ thế chấp": p.mortgage_contract ?? p.mortgage_contract_number ?? "",
    "Tên HĐ thế chấp": p.mortgage_name ?? p.mortgage_contract_name ?? "",
    "Ngày ký HĐTC": p.mortgage_date ?? "",
    "Văn bản sửa đổi, bổ sung": (() => {
      try {
        const list: Array<{ name: string; date: string }> = JSON.parse(p._amendments ?? "[]");
        if (list.length > 0) return list.map((a) => `${a.name}${a.date ? ` ngày ${a.date}` : ""}`).join("; ");
      } catch { /* fallback */ }
      return p.amendment_number ? `Văn bản sửa đổi, bổ sung số ${p.amendment_number} ngày ${p.amendment_date ?? ""}` : "";
    })(),
    "Nơi ĐKGD bảo đảm": p.guarantee_registry_place ?? "",
    "Mua bảo hiểm TSBĐ": p.insurance_status ?? p.insurance ?? "",
    "Số tiền bảo hiểm": fmtN(p.insurance_amount),
    "Thời điểm gia hạn BH": p.insurance_renewal_date ?? "",
    // Common collateral metadata (shared with QSDĐ template — same field names)
    "Tình trạng sử dụng TS": p.asset_usage_status ?? p.asset_condition ?? "",
    "Tên chủ sở hữu TS": o1.name ?? p.owner_name ?? "",
    "Khái quát về lợi thế": p.advantage_summary ?? p.advantage ?? "",
    "Thời hạn sử dụng": p.usage_term ?? p.remaining_life ?? p.thoi_han_su_dung ?? "",
    ...buildOwnerFields(owners),
  };
  return withDsAliases(fields);
}

// ── Collateral type-specific: ĐS (Động sản) ──

export function buildMovableCollateralData(
  collaterals: Array<{
    collateral_type: string; name: string;
    total_value?: number | null; obligation?: number | null;
    properties_json: string;
  }>,
  data: Data,
) {
  const vehicles = collaterals.filter((c) => c.collateral_type === "dong_san");

  // Pre-compute all movable fields once (avoids repeated JSON.parse)
  const allFields = vehicles.map((col, i) => extractMovableFields(col, i));

  // Loop arrays for templates: [#DS_CHI_TIET], [#ĐS]
  data["DS_CHI_TIET"] = allFields;
  data["ĐS"] = allFields;
  allFields.forEach((fields, i) => {
    emitIndexedFields(data, "ĐS", fields, i + 1);
  });

  // Flat ĐS.* fields from first vehicle (backward compat)
  if (allFields.length > 0) {
    emitFlatFields(data, "ĐS", allFields[0]);
    // Emit ĐSH loop array at top level for [#ĐSH]...[/ĐSH] templates
    const movableFirst = allFields[0] as Record<string, unknown>;
    if (movableFirst["ĐSH"]) {
      data["ĐSH"] = movableFirst["ĐSH"];
    }
  }

  // Sum totals for movable collaterals
  const movTotalValue = vehicles.reduce((s, c) => s + (c.total_value ?? 0), 0);
  const movTotalObl = vehicles.reduce((s, c) => s + (c.obligation ?? 0), 0);
  data["ĐS.Tổng giá trị tất cả TS"] = fmtN(movTotalValue);
  data["ĐS.Tổng GTTS bằng chữ"] = movTotalValue ? numberToVietnameseWords(movTotalValue) : "";
  data["ĐS.Tổng NVBĐ"] = fmtN(movTotalObl);
  data["ĐS.Tổng NVBĐ bằng chữ"] = movTotalObl ? numberToVietnameseWords(movTotalObl) : "";
}
