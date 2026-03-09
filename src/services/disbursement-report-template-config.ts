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
} as const;

export type TemplateKey = keyof typeof DISBURSEMENT_TEMPLATES;

/** Server-side whitelist of allowed override keys per template (security: prevents key injection) */
export const ALLOWED_OVERRIDE_KEYS: Record<TemplateKey, string[]> = {
  bcdx: [
    "Mã CN", "Tên gọi in hoa", "HĐTD.Hạn mức bảo lãnh",
    "GN.Số dư L/C", "GN.Số dư bảo lãnh",
    "HĐTD.Lãi suất quá hạn", "HĐTD.Lãi suất chậm trả", "Địa danh",
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
};
