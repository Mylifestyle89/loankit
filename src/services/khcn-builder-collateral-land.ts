/**
 * KHCN builder: land collateral (qsd_dat / sổ đỏ) data.
 */
import { decryptCollateralOwners } from "@/lib/field-encryption";
import { numberToVietnameseWords } from "@/lib/number-to-vietnamese-words";
import { fmtN } from "@/lib/report/format-number-vn";
import { type Data, parseOwners, buildOwnerFields, emitIndexedFields, emitFlatFields } from "./khcn-builder-collateral-helpers";

// ── Helper: extract land collateral fields from properties JSON ──

function extractLandFields(
  col: { name: string; total_value?: number | null; obligation?: number | null; properties_json: string },
  index: number,
) {
  const p = decryptCollateralOwners(JSON.parse(col.properties_json || "{}")) as Record<string, any>;

  const owners = parseOwners(p._owners);
  const o1 = owners[0] ?? {};

  return {
    STT: index + 1,
    "Tên TSBĐ": col.name,
    "Tên Giấy chứng nhận": p.certificate_name ?? "",
    "Tên giấy chứng nhận": p.certificate_name ?? "", // lowercase alias
    "Số seri": p.serial ?? p.serial_number ?? "",
    "Cấp ngày": p.certificate_issue_date ?? p.issued_date ?? "",
    "Cơ quan cấp": p.issuing_authority ?? "",
    "Số vào sổ": p.registry_number ?? "",
    "Địa chỉ đất": p.land_address ?? "",
    "Số thửa": p.lot_number ?? "",
    "Số tờ bản đồ": p.map_sheet ?? "",
    "Diện tích đất": p.land_area ?? "",
    "DTĐ bằng chữ": p.land_area
      ? numberToVietnameseWords(parseFloat(String(p.land_area).replace(/,/g, ".")), "mét vuông")
      : "",
    "Mục đích sử dụng": p.land_purpose ?? "",
    "Thời hạn sử dụng": p.land_use_term ?? p.usage_term ?? "",
    "Nguồn gốc": p.land_origin ?? p.origin ?? "",
    "Hình thức sở hữu": p.ownership_form ?? "",
    // Owner: first from _owners array, fallback to flat field
    "Tên chủ sở hữu TS": o1.name ?? p.owner_name ?? "",
    "Tên chủ sở hữu TS in hoa": (o1.name ?? p.owner_name ?? "").toUpperCase(),
    // House/building on land
    "Kết cấu nhà": p.house_structure ?? "",
    "Số tầng": p.floor_number ?? p.floors ?? "",
    "Diện tích XD": p.construction_area ?? "",
    "Diện tích sàn": p.floor_area ?? "",
    "Cấp nhà ở": p.house_level ?? p.house_grade ?? "",
    "Loại nhà ở": p.house_type ?? "",
    "Hình thức sở hữu nhà": p.house_ownership ?? "",
    "Thời hạn sở hữu": p.ownership_term ?? "",
    "Năm hoàn thành xây dựng": p.year_built ?? "",
    "Sử dụng chung": p.shared_area ?? "",
    "Sử dụng riêng": p.private_area ?? "",
    "Khái quát về lợi thế": p.advantage_summary ?? p.advantage ?? "",
    "Thời hạn XĐ lại GTTS": p.revaluation_deadline ?? p.revaluation_period ?? "",
    "Ghi chú": p.notes ?? "",
    "Mua bảo hiểm TSBĐ": p.insurance_status ?? p.insurance ?? "",
    "Tình trạng sử dụng TS": p.asset_usage_status ?? p.asset_condition ?? "",
    "Giấy tờ về quyền bề mặt": p.surface_rights_doc ?? "",
    // Thẩm định & khấu hao
    "Mục đích thẩm định TSBĐ": p.appraisal_purpose ?? "",
    "TSBĐ chính thức/bổ sung": p.collateral_category ?? "",
    "Hình thức sở hữu TSBĐ": p.collateral_ownership_form ?? "",
    "Mối quan hệ giữa chủ sở hữu TS với bên vay": p.owner_relationship ?? "",
    "Thời gian đã sử dụng": p.used_duration ?? "",
    "Thời gian sử dụng còn lại": p.remaining_duration ?? "",
    "Thời gian khấu hao": p.depreciation_period ?? "",
    "Tỷ lệ khấu hao": p.depreciation_rate ?? "",
    "Giá trị khấu hao hàng năm": fmtN(p.annual_depreciation),
    "Giá trị còn lại": fmtN(p.residual_value),
    // Xóa thế chấp (HĐTC cũ)
    "Số HĐTC cũ": p.old_mortgage_number ?? "",
    "Tên HĐTC cũ": p.old_mortgage_name ?? "",
    "Ngày ký HĐTC cũ": p.old_mortgage_date ?? "",
    "Ngày giao/nhận": p.handover_date ?? "",
    // Valuation
    "Tổng giá trị TS": fmtN(col.total_value),
    "TGTTS bằng chữ": col.total_value ? numberToVietnameseWords(col.total_value) : "",
    "Nghĩa vụ bảo đảm": fmtN(col.obligation),
    "Nghĩa vụ bảo đảm tối đa": fmtN(col.obligation),
    "NVBĐ bằng chữ": col.obligation ? numberToVietnameseWords(col.obligation) : "",
    "NVBĐTĐ bằng chữ": col.obligation ? numberToVietnameseWords(col.obligation) : "",
    // Land valuation slots (multi-land-type)
    "Loại đất 1": p.land_type_1 ?? "", "DT đất 1": fmtN(p.land_area_1), "Đơn giá đất 1": fmtN(p.land_unit_price_1), "Thành tiền đất 1": fmtN(p.land_value_1),
    "Loại đất 2": p.land_type_2 ?? "", "DT đất 2": fmtN(p.land_area_2), "Đơn giá đất 2": fmtN(p.land_unit_price_2), "Thành tiền đất 2": fmtN(p.land_value_2),
    "Loại đất 3": p.land_type_3 ?? "", "DT đất 3": fmtN(p.land_area_3), "Đơn giá đất 3": fmtN(p.land_unit_price_3), "Thành tiền đất 3": fmtN(p.land_value_3),
    "Giá trị đất": fmtN(p.land_value),
    "DT định giá nhà": fmtN(p.house_appraisal_area),
    "Đơn giá nhà": fmtN(p.house_unit_price),
    "Thành tiền nhà": fmtN(p.house_appraisal_value),
    "Giá trị nhà": fmtN(p.house_value),
    "Giá trị XD ban đầu": fmtN(p.initial_construction_value),
    "Công trình XD khác": p.other_construction ?? "",
    "GT công trình XD khác": fmtN(p.other_construction_value),
    "Giấy tờ quyền bề mặt": p.surface_rights_doc ?? "",
    // Văn bản sửa đổi — loop array (stored as _amendments JSON)
    ...(() => {
      try {
        const list: Array<{ name: string; number?: string; date: string }> = JSON.parse(p._amendments ?? "[]");
        const result: Record<string, unknown> = {};
        list.forEach((a, i) => {
          result[`Văn bản sửa đổi ${i + 1}`] = a.name ?? "";
          result[`Số văn bản sửa đổi ${i + 1}`] = a.number ?? "";
          result[`Ngày sửa đổi ${i + 1}`] = a.date ?? "";
        });
        // Flat first-entry aliases
        result["SĐ.Văn bản sửa đổi"] = list[0]?.name ?? "";
        result["SĐ.Số văn bản sửa đổi"] = list[0]?.number ?? "";
        result["SĐ.Ngày sửa đổi"] = list[0]?.date ?? "";
        // Combined string for template: "Hợp đồng sửa đổi... số 3286/1 ngày 21/3/2024"
        if (list.length > 0) {
          result["Văn bản sửa đổi, bổ sung"] = list
            .map((a) => {
              let s = a.name ?? "";
              if (a.number) s += ` số ${a.number}`;
              if (a.date) s += ` ngày ${a.date}`;
              return s;
            })
            .join("; ");
        }
        return result;
      } catch { return {}; }
    })(),
    // HĐ thế chấp
    "BBXĐ giá trị tài sản số": p.valuation_report_number ?? "",
    "Tên HĐ thế chấp": p.mortgage_name ?? "",
    "TÊN HĐ THẾ CHẤP": (p.mortgage_name ?? "").toUpperCase(),
    "Số HĐ thế chấp": p.mortgage_contract ?? "",
    "Ngày ký HĐTC": p.mortgage_date ?? "",
    "Ngày HĐTC": p.mortgage_date ?? "", // alias
    // Fallback: only use legacy p.amendment_number if _amendments was empty
    ...(!p._amendments && p.amendment_number
      ? { "Văn bản sửa đổi, bổ sung": `Văn bản sửa đổi, bổ sung số ${p.amendment_number} ngày ${p.amendment_date ?? ""}` }
      : {}),
    "HĐ sửa đổi bổ sung số": p.amendment_number ?? "",
    "Ngày ký HĐ SĐBS": p.amendment_date ?? "",
    "Ngày định giá lại TS": p.revaluation_date ?? "",
    "Nơi đăng ký giao dịch BĐ": p.guarantee_registry_place ?? "",
    // Owner detail fields (ĐSH prefix — for BT3 templates)
    ...buildOwnerFields(owners),
    // BT3 templates: [SĐ.Người đại diện], [SĐ.Năm sinh], etc. = first owner
    "Người đại diện": o1.name ?? "",
    "Loại giấy tờ tùy thân": o1.id_type ?? "",
    "Năm sinh": o1.birth_year ?? "",
    "Nơi thường trú": o1.address ?? "",
    "Địa chỉ": (o1.current_address || o1.address) ?? "",
    // BT3 templates also use [SĐ.CMND], [SĐ.Ngày cấp], [SĐ.Nơi cấp], [SĐ.Số điện thoại]
    "CMND": o1.cccd ?? "",
    "CCCD": o1.cccd ?? "",
    "Ngày cấp": o1.cccd_date ?? "",
    "Nơi cấp": o1.cccd_place ?? "",
    "Số điện thoại": o1.phone ?? "",
    "CMND cũ": o1.cmnd_old ?? "",
  };
}

// ── Collateral type-specific: SĐ (Sổ đỏ / QSD đất) ──

export function buildLandCollateralData(
  collaterals: Array<{
    collateral_type: string; name: string;
    total_value?: number | null; obligation?: number | null;
    properties_json: string;
  }>,
  data: Data,
) {
  const lands = collaterals.filter((c) => c.collateral_type === "qsd_dat");

  // Pre-compute all land fields once (avoids repeated JSON.parse + extractLandFields)
  // Add "SĐ." prefixed aliases so [SĐ.Số seri] resolves inside [#TSBD_CHI_TIET] loops
  const allLandFields = lands.map((col, i) => {
    const fields = extractLandFields(col, i);
    const withPrefix: Record<string, unknown> = { ...fields };
    for (const [key, val] of Object.entries(fields)) {
      if (!key.startsWith("SĐ.")) withPrefix[`SĐ.${key}`] = val;
    }
    return withPrefix;
  });

  // Loop arrays for templates: [#TSBD_CHI_TIET], [#TSBĐ_CHI_TIET], [#SĐ]
  data["TSBD_CHI_TIET"] = allLandFields;
  data["TSBĐ_CHI_TIET"] = allLandFields; // Vietnamese diacritics alias
  data["SĐ"] = allLandFields;

  // Valuation breakdown loop — [#DINH_GIA]...[/DINH_GIA] for land types + house
  const valuationRows: Array<Record<string, unknown>> = [];
  for (const f of allLandFields) {
    const ff = f as Record<string, unknown>;
    for (let i = 1; i <= 3; i++) {
      const type = ff[`Loại đất ${i}`];
      if (!type) break;
      valuationRows.push({
        STT: valuationRows.length + 1,
        "Loại": type,
        "Số seri": ff["Số seri"] ?? "",
        "Diện tích": ff[`DT đất ${i}`] ?? "",
        "Đơn giá": ff[`Đơn giá đất ${i}`] ?? "",
        "Giá trị": ff[`Thành tiền đất ${i}`] ?? "",
      });
    }
    // House/attached asset row — use appraisal fields if available
    const houseArea = ff["DT định giá nhà"] || ff["Diện tích sàn"];
    const housePrice = ff["Đơn giá nhà"];
    const houseValue = ff["Thành tiền nhà"] || ff["Giá trị nhà"];
    if (houseValue || houseArea) {
      valuationRows.push({
        STT: valuationRows.length + 1,
        "Loại": "TS gắn liền với đất",
        "Số seri": ff["Số seri"] ?? "",
        "Diện tích": houseArea ?? "",
        "Đơn giá": housePrice ?? "",
        "Giá trị": houseValue ?? "",
      });
    }
  }
  data["DINH_GIA"] = valuationRows;

  // Consolidated valuation table — multi-row per GCN: up to 3 land types + house row
  // Each GCN emits rows for land types + attached asset, grouped under same STT
  const tsbdDinhGia: Array<Record<string, unknown>> = [];
  lands.forEach((col, i) => {
    const f = allLandFields[i] as Record<string, unknown>;
    const stt = i + 1;
    // Emit up to 3 land-type rows per GCN
    for (let j = 1; j <= 3; j++) {
      const landType = f[`Loại đất ${j}`];
      if (!landType) break;
      tsbdDinhGia.push({
        STT: stt,
        "Tên TSBĐ": col.name,
        "Số seri": f["Số seri"],
        "Diện tích đất": f[`DT đất ${j}`] ?? "",
        "Đơn giá": f[`Đơn giá đất ${j}`] ?? "",
        "Giá trị": f[`Thành tiền đất ${j}`] ?? "",
        "Loại": landType,
        "Tổng giá trị TS": "",
      });
    }
    // Emit house/attached asset row if exists
    const houseValue = f["Thành tiền nhà"] || f["Giá trị nhà"];
    const houseArea = f["DT định giá nhà"] || f["Diện tích sàn"];
    if (houseValue || houseArea) {
      tsbdDinhGia.push({
        STT: stt,
        "Tên TSBĐ": col.name,
        "Số seri": f["Số seri"],
        "Diện tích đất": houseArea ?? "",
        "Đơn giá": f["Đơn giá nhà"] ?? "",
        "Giá trị": houseValue ?? "",
        "Loại": "TS gắn liền với đất",
        "Tổng giá trị TS": "",
      });
    }
    // Mark last row of this GCN with total value
    if (tsbdDinhGia.length > 0) {
      const lastRow = tsbdDinhGia[tsbdDinhGia.length - 1];
      lastRow["Tổng giá trị TS"] = fmtN(col.total_value);
      lastRow["TGTTS bằng chữ"] = col.total_value ? numberToVietnameseWords(col.total_value) : "";
      lastRow["Nghĩa vụ bảo đảm tối đa"] = fmtN(col.obligation);
      lastRow["NVBĐ bằng chữ"] = col.obligation ? numberToVietnameseWords(col.obligation) : "";
    }
  });
  data["TSBD_DINH_GIA"] = tsbdDinhGia;

  // Indexed SĐ_1.*, SĐ_2.*... for multi-asset clone rendering
  allLandFields.forEach((fields, i) => {
    emitIndexedFields(data, "SĐ", fields, i + 1);
  });

  // Flat SĐ.* fields from first land collateral (backward compat)
  if (allLandFields.length > 0) {
    emitFlatFields(data, "SĐ", allLandFields[0]);
    // Emit ĐSH loop array at top level for [#ĐSH]...[/ĐSH] templates
    if (allLandFields[0]["ĐSH"]) {
      data["ĐSH"] = allLandFields[0]["ĐSH"];
    }
  }

  // Sum totals for land collaterals
  const landTotalValue = lands.reduce((s, c) => s + (c.total_value ?? 0), 0);
  const landTotalObligation = lands.reduce((s, c) => s + (c.obligation ?? 0), 0);
  data["SĐ.Tổng giá trị tất cả TS"] = fmtN(landTotalValue);
  data["SĐ.Tổng GTTS bằng chữ"] = landTotalValue ? numberToVietnameseWords(landTotalValue) : "";
  data["SĐ.Tổng NVBĐ"] = fmtN(landTotalObligation);
  data["SĐ.Tổng NVBĐ bằng chữ"] = landTotalObligation ? numberToVietnameseWords(landTotalObligation) : "";
}
