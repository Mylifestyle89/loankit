/**
 * KHCN disbursement template registry.
 * Maps template keys to file paths for individual customer disbursement documents.
 */

export const KHCN_DISBURSEMENT_TEMPLATES = {
  bcdxgn: {
    label: "BCĐXGN kiểm GNN hạn mức SXKD",
    path: "report_assets/KHCN templates/Hợp đồng tín dụng/2268.07 BCDXGN kiem GNN han muc SXKD.docx",
  },
  unc: {
    label: "In UNC",
    path: "report_assets/KHCN templates/Chứng từ giải ngân/in UNC.docx",
  },
  unc_a4: {
    label: "Ủy nhiệm chi A4 (599)",
    path: "report_assets/KHCN templates/Chứng từ giải ngân/599 Uy nhiem chi A4.docx",
  },
  danh_muc_gn: {
    label: "Danh mục hồ sơ vay vốn giải ngân",
    path: "report_assets/KHCN templates/Danh mục hồ sơ/2899.01.CV Danh muc ho so vay von giải ngân.docx",
  },
  bang_ke_mua_hang: {
    label: "Bảng kê mua hàng",
    path: "report_assets/KHCN templates/Chứng từ giải ngân/Bang ke mua hang.docx",
  },
} as const;

export type KhcnDisbursementTemplateKey = keyof typeof KHCN_DISBURSEMENT_TEMPLATES;
