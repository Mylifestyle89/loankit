/**
 * Label + number-field config for the DOCX import review modal.
 * Extracted from the modal so it can be shared between the review UI and
 * the submit handler (which needs the same key lists to build payloads).
 */

export const CUSTOMER_LABELS: Record<string, string> = {
  customer_name: "Họ tên",
  customer_code: "Mã KH",
  cccd: "Số CCCD",
  cccd_old: "CMND cũ (9 số)",
  cccd_issued_date: "Ngày cấp CCCD",
  cccd_issued_place: "Nơi cấp",
  date_of_birth: "Ngày sinh",
  gender: "Giới tính",
  phone: "Số ĐT",
  email: "Email",
  address: "Địa chỉ",
  bank_account: "Số TK nhận",
  bank_name: "NH TK nhận",
  marital_status: "Tình trạng HN",
  spouse_name: "Họ tên vợ/chồng",
  spouse_cccd: "CCCD vợ/chồng",
};

export const CO_BORROWER_LABELS: Record<string, string> = {
  full_name: "Họ tên",
  id_number: "CCCD",
  id_old: "CMND cũ",
  id_issued_date: "Ngày cấp",
  id_issued_place: "Nơi cấp",
  birth_year: "Năm sinh",
  phone: "SĐT",
  current_address: "Địa chỉ hiện tại",
  permanent_address: "Thường trú",
  relationship: "Quan hệ",
};

export const LOAN_LABELS: Record<string, string> = {
  contract_number: "Số hợp đồng",
  loan_amount: "Số tiền vay",
  interest_rate: "Lãi suất (%)",
  purpose: "Mục đích vay",
  start_date: "Ngày bắt đầu",
  end_date: "Ngày kết thúc",
  loan_method: "Phương thức vay",
  lending_method: "PT cho vay",
  principal_schedule: "Kỳ trả gốc",
  interest_schedule: "Kỳ trả lãi",
  total_capital_need: "Tổng nhu cầu vốn",
  equity_amount: "Vốn đối ứng",
  expected_revenue: "Doanh thu dự kiến",
  expected_profit: "Lợi nhuận dự kiến",
};

/** Common collateral fields shown for every type. */
export const COLLATERAL_COMMON_LABELS: Record<string, string> = {
  name: "Tên TSBĐ",
  type: "Loại TSBĐ",
  total_value: "Tổng giá trị",
  obligation: "Nghĩa vụ bảo đảm",
};

/** Extra fields shown only when collateral.type === "qsd_dat". */
export const COLLATERAL_LAND_LABELS: Record<string, string> = {
  certificate_serial: "Số GCN",
  land_address: "Địa chỉ thửa đất",
  land_area: "Diện tích (m²)",
  land_type_1: "Loại đất chính",
  land_unit_price_1: "Đơn giá chính (VNĐ/m²)",
  land_type_2: "Loại đất phụ",
  land_unit_price_2: "Đơn giá phụ (VNĐ/m²)",
  lot_number: "Số thửa",
  sheet_number: "Tờ bản đồ",
};

/** Extra fields shown only when collateral.type === "dong_san". */
export const COLLATERAL_MOVABLE_LABELS: Record<string, string> = {
  registration_number: "Biển số/Đăng ký",
  brand: "Hãng",
  model: "Model",
  year: "Năm SX",
  chassis_number: "Số khung",
  engine_number: "Số máy",
};

/** Extra fields shown only when collateral.type === "tiet_kiem". */
export const COLLATERAL_SAVINGS_LABELS: Record<string, string> = {
  savings_book_number: "Số sổ TK",
  deposit_bank_name: "Ngân hàng",
  deposit_amount: "Số tiền gửi",
  deposit_date: "Ngày gửi",
};

/** Extra fields shown only when collateral.type === "tai_san_khac". */
export const COLLATERAL_OTHER_LABELS: Record<string, string> = {
  description: "Mô tả",
};

/** Keys that should be displayed/edited as formatted vi-VN numbers. */
export const NUMBER_FIELD_KEYS: ReadonlySet<string> = new Set([
  // loan
  "loan_amount",
  "interest_rate",
  "total_capital_need",
  "equity_amount",
  "expected_revenue",
  "expected_profit",
  // collateral common
  "total_value",
  "obligation",
  // collateral land
  "land_unit_price_1",
  "land_unit_price_2",
  // collateral savings
  "deposit_amount",
]);

/** Pick the extra label map for a given collateral type. */
export function getCollateralTypeLabels(type: string | undefined): Record<string, string> {
  switch (type) {
    case "dong_san":
      return COLLATERAL_MOVABLE_LABELS;
    case "tiet_kiem":
      return COLLATERAL_SAVINGS_LABELS;
    case "tai_san_khac":
      return COLLATERAL_OTHER_LABELS;
    case "qsd_dat":
    default:
      return COLLATERAL_LAND_LABELS;
  }
}
