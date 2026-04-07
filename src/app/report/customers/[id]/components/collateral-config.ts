/* ── Collateral type & field configuration ── */

export const COLLATERAL_TYPES = [
  { value: "qsd_dat", label: "Bất động sản" },
  { value: "dong_san", label: "Động sản (Phương tiện GT)" },
  { value: "tiet_kiem", label: "Cầm cố TTK / Giấy tờ có giá" },
  { value: "tai_san_khac", label: "Tài sản khác" },
] as const;

export type OwnerEntry = {
  name: string;
  id_type: string;
  cccd: string;
  cccd_place: string;
  cccd_date: string;
  cmnd_old: string;
  birth_year: string;
  address: string;
  current_address: string;
  phone: string;
};

export const EMPTY_OWNER: OwnerEntry = {
  name: "", id_type: "", cccd: "", cccd_place: "", cccd_date: "",
  cmnd_old: "", birth_year: "", address: "", current_address: "", phone: "",
};

export type AmendmentEntry = {
  name: string;   // Tên văn bản sửa đổi (VD: Hợp đồng sửa đổi Hợp đồng thế chấp...)
  number: string; // Số văn bản (VD: 3286/1)
  date: string;   // Ngày văn bản (dd/mm/yyyy)
};

export const EMPTY_AMENDMENT: AmendmentEntry = { name: "", number: "", date: "" };

export type CollateralItem = {
  id: string;
  collateral_type: string;
  name: string;
  total_value: number | null;
  obligation: number | null;
  properties: Record<string, string>;
};

/* ── Vietnamese label map for ALL property keys ── */
export const PROPERTY_LABELS: Record<string, string> = {
  // Giấy chứng nhận
  certificate_name: "Tên Giấy chứng nhận", serial: "Số seri",
  issuing_authority: "Cơ quan cấp", certificate_issue_date: "Ngày cấp GCN",
  registry_number: "Số vào sổ",
  // Đất
  land_address: "Địa chỉ đất", land_area: "Diện tích đất", land_area_words: "Diện tích bằng chữ",
  lot_number: "Số thửa", map_sheet: "Số tờ bản đồ",
  land_purpose: "Mục đích sử dụng", land_origin: "Nguồn gốc",
  land_use_term: "Thời hạn sử dụng đất", ownership_form: "Hình thức sở hữu (Đất)",
  notes: "Ghi chú",
  shared_area: "Sử dụng chung", private_area: "Sử dụng riêng",
  // Multi-land type values
  land_type_1: "Loại đất 1", land_area_1: "Diện tích 1", land_unit_price_1: "Đơn giá 1", land_value_1: "Thành tiền 1",
  land_type_2: "Loại đất 2", land_area_2: "Diện tích 2", land_unit_price_2: "Đơn giá 2", land_value_2: "Thành tiền 2",
  land_type_3: "Loại đất 3", land_area_3: "Diện tích 3", land_unit_price_3: "Đơn giá 3", land_value_3: "Thành tiền 3",
  // TS gắn liền với đất
  house_type: "Loại nhà ở", construction_area: "Diện tích XD",
  floor_area: "Diện tích sàn/Tổng DT sử dụng", house_structure: "Kết cấu nhà",
  house_ownership: "Hình thức sở hữu nhà", house_level: "Cấp nhà ở",
  floor_number: "Số tầng", year_built: "Năm hoàn thành XD",
  initial_construction_value: "Giá trị XD ban đầu",
  other_construction: "Công trình XD khác", other_construction_value: "GT công trình XD khác",
  surface_rights_doc: "Giấy tờ quyền bề mặt",
  house_appraisal_area: "DT định giá nhà", house_unit_price: "Đơn giá nhà",
  house_appraisal_value: "Thành tiền nhà",
  land_value: "Giá trị đất", house_value: "Giá trị nhà",
  // Hợp đồng bảo đảm
  mortgage_name: "Tên HĐ thế chấp", mortgage_contract: "Số HĐ thế chấp",
  mortgage_date: "Ngày ký HĐTC", guarantee_registry_place: "Nơi ĐKGD bảo đảm",
  // Định giá
  owner_borrower_relationship: "Quan hệ chủ TS - Bên vay",
  advantage_summary: "Khái quát lợi thế", insurance_status: "Mua bảo hiểm TSBĐ",
  asset_usage_status: "Tình trạng sử dụng TS", collateral_category: "TSBĐ chính thức/bổ sung",
  max_credit_ratio_land: "Tỷ lệ % tín dụng tối đa (QSD đất)",
  max_credit_ratio_attached: "Tỷ lệ % tín dụng tối đa (TS GLVĐ)",
  max_obligation: "NVBĐ tối đa", max_obligation_in_words: "NVBĐ tối đa bằng chữ",
  loan_to_value_ratio: "Tỷ lệ cho vay/GT TS",
  revaluation_period: "Thời hạn XĐ lại GT TS", appraisal_purpose: "Mục đích thẩm định TSBĐ",
  // Động sản - Phương tiện GT
  brand: "Nhãn hiệu", model_code: "Số loại", engine_number: "Số máy", chassis_number: "Số khung",
  color: "Màu sơn", license_plate: "Biển kiểm soát", seat_count: "Số chỗ ngồi",
  manufacture_year: "Năm sản xuất", registration_number: "Giấy đăng ký số",
  registration_date: "Ngày cấp ĐK", registration_place: "Nơi cấp ĐK",
  insurance_amount: "Số tiền bảo hiểm", insurance_renewal_date: "Thời điểm gia hạn BH",
  // Tiết kiệm / Giấy tờ có giá
  _subtype: "Loại TSBĐ", // "ttk" (thẻ tiết kiệm) | "gtcg" (giấy tờ có giá)
  paper_type: "Loại giấy tờ có giá", // "so_tiet_kiem" | "trai_phieu" | "chung_chi_tien_gui"
  issuer: "Tổ chức phát hành", term: "Kỳ hạn", balance: "Số dư",
  interest_rate: "Lãi suất", issue_date: "Ngày phát hành",
  maturity_date: "Ngày đến hạn", max_loan: "Mức vay tối đa",
  face_value: "Mệnh giá", paper_number: "Số giấy tờ",
  // Tài sản khác
  doc_type: "Loại giấy tờ", doc_date: "Ngày cấp", doc_place: "Nơi cấp",
  issuing_agency: "Cơ quan cấp", insurance: "Mua bảo hiểm TSBĐ",
  asset_status: "Hiện trạng tài sản", liquidity: "Tính thanh khoản", legality: "Tính pháp lý",
};

/* ── Form field schemas per collateral type ── */
export const FORM_FIELDS: Record<string, { key: string; label: string }[]> = {
  qsd_dat: [
    { key: "certificate_name", label: "Tên Giấy chứng nhận" },
    { key: "serial", label: "Số seri" },
    { key: "certificate_issue_date", label: "Ngày cấp GCN" },
    { key: "issuing_authority", label: "Cơ quan cấp" },
    { key: "registry_number", label: "Số vào sổ" },
    { key: "land_address", label: "Địa chỉ đất" },
    { key: "land_area", label: "Diện tích đất" },
    { key: "land_area_words", label: "Diện tích bằng chữ" },
    { key: "lot_number", label: "Số thửa" },
    { key: "map_sheet", label: "Số tờ bản đồ" },
    { key: "land_purpose", label: "Mục đích sử dụng" },
    { key: "land_use_term", label: "Thời hạn sử dụng đất" },
    { key: "land_origin", label: "Nguồn gốc sử dụng đất" },
    { key: "ownership_form", label: "Hình thức sở hữu (Đất)" },
    { key: "shared_area", label: "Sử dụng chung" },
    { key: "private_area", label: "Sử dụng riêng" },
    { key: "house_type", label: "Loại nhà ở" },
    { key: "construction_area", label: "Diện tích XD" },
    { key: "floor_area", label: "Diện tích sàn/Tổng DT sử dụng" },
    { key: "house_structure", label: "Kết cấu nhà" },
    { key: "house_ownership", label: "Hình thức sở hữu nhà" },
    { key: "house_level", label: "Cấp nhà ở" },
    { key: "floor_number", label: "Số tầng" },
    { key: "house_value", label: "Giá trị nhà" },
    { key: "year_built", label: "Năm hoàn thành XD" },
    { key: "initial_construction_value", label: "Giá trị XD ban đầu" },
    { key: "other_construction", label: "Công trình XD khác" },
    { key: "other_construction_value", label: "GT công trình XD khác" },
    { key: "surface_rights_doc", label: "Giấy tờ quyền bề mặt" },
    { key: "asset_usage_status", label: "Tình trạng sử dụng TS" },
    { key: "mortgage_name", label: "Tên HĐ thế chấp" },
    { key: "mortgage_contract", label: "Số HĐ thế chấp" },
    { key: "mortgage_date", label: "Ngày ký HĐTC" },
    { key: "guarantee_registry_place", label: "Nơi ĐKGD bảo đảm" },
    { key: "notes", label: "Ghi chú" },
  ],
  dong_san: [
    { key: "brand", label: "Nhãn hiệu" },
    { key: "model_code", label: "Số loại" },
    { key: "engine_number", label: "Số máy" },
    { key: "chassis_number", label: "Số khung" },
    { key: "color", label: "Màu sơn" },
    { key: "license_plate", label: "Biển kiểm soát" },
    { key: "seat_count", label: "Số chỗ ngồi" },
    { key: "manufacture_year", label: "Năm sản xuất" },
    { key: "registration_number", label: "Giấy đăng ký số" },
    { key: "registration_date", label: "Ngày cấp ĐK" },
    { key: "registration_place", label: "Nơi cấp ĐK" },
    { key: "mortgage_name", label: "Tên HĐ thế chấp" },
    { key: "mortgage_contract", label: "Số HĐ thế chấp" },
    { key: "mortgage_date", label: "Ngày ký HĐTC" },
    { key: "guarantee_registry_place", label: "Nơi ĐKGD bảo đảm" },
    { key: "insurance_status", label: "Mua bảo hiểm TSBĐ" },
    { key: "insurance_amount", label: "Số tiền bảo hiểm" },
    { key: "insurance_renewal_date", label: "Thời điểm gia hạn BH" },
  ],
  tiet_kiem: [
    { key: "_subtype", label: "Loại TSBĐ" },
    { key: "paper_type", label: "Loại giấy tờ có giá" },
    { key: "serial", label: "Số seri" },
    { key: "paper_number", label: "Số giấy tờ" },
    { key: "issuer", label: "Tổ chức phát hành" },
    { key: "face_value", label: "Mệnh giá" },
    { key: "term", label: "Kỳ hạn" },
    { key: "balance", label: "Số dư" },
    { key: "interest_rate", label: "Lãi suất" },
    { key: "issue_date", label: "Ngày phát hành" },
    { key: "maturity_date", label: "Ngày đến hạn" },
    { key: "max_loan", label: "Mức vay tối đa" },
  ],
  tai_san_khac: [
    { key: "insurance", label: "Mua bảo hiểm TSBĐ" },
    { key: "asset_status", label: "Hiện trạng tài sản" },
    { key: "liquidity", label: "Tính thanh khoản" },
    { key: "legality", label: "Tính pháp lý" },
  ],
};

/* ── Field grouping keys for form sections ── */
export const QSD_CERT_KEYS = ["certificate_name", "serial", "certificate_issue_date", "issuing_authority", "registry_number"];
export const QSD_LAND_KEYS = ["land_address", "land_area", "land_area_words", "lot_number", "map_sheet", "land_purpose", "land_use_term", "land_origin", "ownership_form", "shared_area", "private_area"];
export const QSD_HOUSE_KEYS = ["house_type", "construction_area", "floor_area", "house_structure", "house_ownership", "house_level", "floor_number", "house_value", "year_built", "initial_construction_value", "other_construction", "other_construction_value", "surface_rights_doc", "asset_usage_status", "house_appraisal_area", "house_unit_price", "house_appraisal_value"];
export const QSD_CONTRACT_KEYS = ["mortgage_name", "mortgage_contract", "mortgage_date", "guarantee_registry_place"];

export const DS_VEHICLE_KEYS = ["brand", "model_code", "engine_number", "chassis_number", "color", "license_plate", "seat_count", "manufacture_year"];
export const DS_REG_KEYS = ["registration_number", "registration_date", "registration_place"];
export const DS_CONTRACT_KEYS = ["mortgage_name", "mortgage_contract", "mortgage_date", "guarantee_registry_place"];
export const DS_INSURANCE_KEYS = ["insurance_status", "insurance_amount", "insurance_renewal_date"];

/* ── Tiết kiệm / GTCG subtype & paper type options ── */
export const TK_SUBTYPES = [
  { value: "ttk", label: "Thẻ tiết kiệm" },
  { value: "gtcg", label: "Giấy tờ có giá" },
] as const;

export const GTCG_PAPER_TYPES = [
  { value: "so_tiet_kiem", label: "Sổ tiết kiệm" },
  { value: "trai_phieu", label: "Trái phiếu" },
  { value: "chung_chi_tien_gui", label: "Chứng chỉ tiền gửi" },
] as const;

/** Fields visible only for GTCG subtype */
export const GTCG_ONLY_KEYS = new Set(["paper_type", "paper_number", "face_value"]);

/* ── Rounding options for land/house valuation ── */
export const ROUNDING_OPTIONS = [
  { value: "0", label: "Không làm tròn" },
  { value: "1000", label: "Hàng nghìn" },
  { value: "1000000", label: "Hàng triệu" },
] as const;

/** Round down to nearest precision (e.g. 4.714.600 → 4.000.000 at hàng triệu) */
export function roundDown(value: number, precision: number): number {
  if (!precision || precision <= 0) return value;
  return Math.floor(value / precision) * precision;
}

/* ── Formatting helpers ── */

export function fmtNumber(v: string): string {
  const cleaned = v.replace(/\s/g, "").replace(/,/g, ".");
  const n = Number(cleaned.replace(/\./g, ""));
  if (isNaN(n)) return v;
  return new Intl.NumberFormat("vi-VN").format(n);
}

/** Format decimal: phân cách hàng ngàn phần nguyên, giữ phần thập phân */
export function fmtDecimal(v: string): string {
  const cleaned = v.replace(/\s/g, "").replace(/,/g, ".");
  const dotIdx = cleaned.lastIndexOf(".");
  const intPart = dotIdx >= 0 ? cleaned.slice(0, dotIdx) : cleaned;
  const decPart = dotIdx >= 0 ? cleaned.slice(dotIdx).replace(".", ",") : "";
  const n = Number(intPart.replace(/\./g, ""));
  if (isNaN(n)) return v;
  return new Intl.NumberFormat("vi-VN").format(n) + decPart;
}

export function fmtDate(v: string): string {
  if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(v)) return v;
  const iso = v.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[3]}/${iso[2]}/${iso[1]}`;
  const d = new Date(v);
  if (!isNaN(d.getTime())) {
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    return `${dd}/${mm}/${d.getFullYear()}`;
  }
  return v;
}

export const NUMBER_KEYS = new Set([
  "land_value", "house_value", "max_obligation", "balance", "max_loan",
  "max_credit_ratio_land", "max_credit_ratio_attached", "construction_area",
  "face_value",
  "land_area_1", "land_unit_price_1", "land_value_1",
  "land_area_2", "land_unit_price_2", "land_value_2",
  "land_area_3", "land_unit_price_3", "land_value_3", "insurance_amount",
  "initial_construction_value", "other_construction_value",
  "house_appraisal_area", "house_unit_price", "house_appraisal_value",
]);

/** Number fields that allow decimal input (diện tích, tỷ lệ %) */
export const DECIMAL_KEYS = new Set([
  "construction_area", "floor_area", "land_area", "shared_area", "private_area", "house_appraisal_area",
  "land_area_1", "land_area_2", "land_area_3",
  "max_credit_ratio_land", "max_credit_ratio_attached", "loan_to_value_ratio",
  "interest_rate",
]);

export const DATE_KEYS = new Set([
  "mortgage_date", "certificate_issue_date", "issue_date", "maturity_date",
  "doc_date", "registration_date", "insurance_renewal_date", "old_mortgage_date",
]);

export function formatValue(key: string, value: string): string {
  if (!value) return "";
  if (DATE_KEYS.has(key)) return fmtDate(value);
  if (NUMBER_KEYS.has(key)) return fmtNumber(value);
  if (/^\d[\d.]*$/.test(value.trim()) && Number(value.replace(/\./g, "")) > 999) {
    return fmtNumber(value);
  }
  return value;
}
