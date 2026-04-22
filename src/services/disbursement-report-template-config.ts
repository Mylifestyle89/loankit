/**
 * Disbursement report template registry and allowed override keys.
 * Shared between service and API validation layers.
 */

// Template paths and labels
export const DISBURSEMENT_TEMPLATES = {
  bcdx: {
    label: "Báo cáo đề xuất giải ngân",
    path: "report_assets/Disbursement templates/2268.09.PN BCDX giai ngan HMTD.docx",
  },
  giay_nhan_no: {
    label: "Giấy nhận nợ",
    path: "report_assets/Disbursement templates/2268.10.PN Giay nhan no HMTD.docx",
  },
  danh_muc_ho_so: {
    label: "Danh mục hồ sơ vay vốn",
    path: "report_assets/Disbursement templates/2899.01.CV Danh muc ho so vay von.docx",
  },
  in_unc: {
    label: "In UNC",
    path: "report_assets/Disbursement templates/in UNC.docx",
  },
  cam_ket_bo_sung_chung_tu: {
    label: "Cam kết bổ sung chứng từ",
    path: "report_assets/Disbursement templates/Cam ket bo sung chung tu.docx",
  },
} as const;

export type TemplateKey = keyof typeof DISBURSEMENT_TEMPLATES;

/** Server-side whitelist of allowed override keys per template (security: prevents key injection) */
export const ALLOWED_OVERRIDE_KEYS: Record<TemplateKey, string[]> = {
  bcdx: [
    "Mã CN", "Tên chi nhánh/PGD", "Tên gọi in hoa",
    "HĐTD.Hạn mức bảo lãnh", "GN.Số dư L/C", "GN.Số dư bảo lãnh",
    "HĐTD.Lãi suất quá hạn", "HĐTD.Lãi suất chậm trả",
    "Tổng giá trị TSBĐ", "Phạm vi bảo đảm", "Địa danh",
    // Common person fields (passed from unified form, ignored if not in template)
    "Loại giấy tờ tùy thân", "CMND", "Nơi cấp", "Ngày cấp",
  ],
  giay_nhan_no: [
    "Mã CN", "Tên chi nhánh/PGD",
    "Loại giấy tờ pháp lý", "Số ĐKKD", "Nơi cấp ĐKKD", "Ngày cấp ĐKKD",
    "Danh xưng", "Loại giấy tờ tùy thân", "CMND", "Ngày cấp", "Nơi cấp",
    "Giấy tờ ủy quyền", "GN.Lãi suất vay",
    "HĐTD.Lãi suất quá hạn", "HĐTD.Lãi suất chậm trả", "Địa danh",
  ],
  danh_muc_ho_so: ["Số điện thoại", "Tên người dùng"],
  in_unc: [],
  // Proper-case keys — server aliases "Nơi cấp"→"nơi cấp", "Ngày cấp"→"ngày cấp"
  cam_ket_bo_sung_chung_tu: [
    "Tên chi nhánh/PGD", "Loại giấy tờ tùy thân", "CMND",
    "Nơi cấp", "Ngày cấp",
    "Mã CN", "Địa danh", "HĐTD.Lãi suất quá hạn", "HĐTD.Lãi suất chậm trả",
  ],
};
