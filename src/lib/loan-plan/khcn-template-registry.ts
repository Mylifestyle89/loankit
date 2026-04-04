/**
 * Registry mapping KHCN DOCX templates to loan methods and document categories.
 * Each template has: file path, display name, category, and which loan methods it applies to.
 */

import { ASSET_TEMPLATES, ASSET_CATEGORY_LABELS, ASSET_CATEGORY_KEYS as _ASSET_KEYS } from "./khcn-asset-template-registry";
import { CAMCO_TEMPLATES, CAMCO_ASSET_TEMPLATES, CAMCO_ASSET_CATEGORY_KEYS, CAMCO_ASSET_CATEGORY_LABELS } from "./khcn-camco-template-registry";

/** Merged asset category keys (BĐS + động sản + cầm cố) */
export const ASSET_CATEGORY_KEYS = new Set([..._ASSET_KEYS, ...CAMCO_ASSET_CATEGORY_KEYS]);

export type KhcnDocTemplate = {
  path: string; // relative to project root
  name: string;
  category: string;
  /** Which loan methods this template applies to. Empty = all methods. */
  methods: string[];
  /** Skip multi-asset section cloning — template uses loop arrays instead */
  noClone?: boolean;
};

const BASE = "report_assets/KHCN templates";

/** All KHCN DOCX templates with their loan method applicability */
export const KHCN_TEMPLATES: KhcnDocTemplate[] = [
  // Danh mục hồ sơ — all methods
  { path: `${BASE}/Danh mục hồ sơ/Bia HS.docx`, name: "Bìa hồ sơ", category: "danh_muc", methods: [] },
  { path: `${BASE}/Danh mục hồ sơ/2899.01.CV Danh muc ho so vay von.docx`, name: "Danh mục hồ sơ vay vốn", category: "danh_muc", methods: [] },
  { path: `${BASE}/Danh mục hồ sơ/2899.01.CV Danh muc ho so vay von(1).docx`, name: "Danh mục hồ sơ vay vốn (mẫu 2)", category: "danh_muc", methods: [] },
  { path: `${BASE}/Danh mục hồ sơ/2899.01.CV Danh muc ho so vay von(2).docx`, name: "Danh mục hồ sơ vay vốn (mẫu 3)", category: "danh_muc", methods: [] },

  // Giấy tờ pháp lý — all methods
  { path: `${BASE}/Giấy tờ pháp lý/3333.02C Thu thap TT KH ca nhan khong DKKD.docx`, name: "Thu thập TT KH cá nhân", category: "phap_ly", methods: [] },
  { path: `${BASE}/Giấy tờ pháp lý/1255 Cam ket khong co tai khoan.docx`, name: "Cam kết không có tài khoản", category: "phap_ly", methods: [] },
  { path: `${BASE}/Giấy tờ pháp lý/711.01 SMS nhac no vay.docx`, name: "SMS nhắc nợ vay", category: "phap_ly", methods: [] },
  { path: `${BASE}/Giấy tờ pháp lý/Cam ket tai san cua ben thu 3.docx`, name: "Cam kết tài sản bên thứ 3", category: "phap_ly", methods: [] },
  { path: `${BASE}/Danh mục hồ sơ/4288.02 Phieu de nghi tra cuu tai Don vi theo lo.docx`, name: "Phiếu đề nghị tra cứu TTTD (4288.02)", category: "phap_ly", methods: [] },

  // Hợp đồng tín dụng — method-specific
  { path: `${BASE}/Hợp đồng tín dụng/2268.06E HDTD vay tung lan co TSBD.docx`, name: "HĐTD vay từng lần có TSBĐ (2268.06E)", category: "hop_dong", methods: ["tung_lan", "tieu_dung"] },
  { path: `${BASE}/Hợp đồng tín dụng/2268.06E HDTD vay tung lan co TSBD trung dai han.docx`, name: "HĐTD trung dài hạn có TSBĐ (2268.06E)", category: "hop_dong", methods: ["trung_dai"] },
  { path: `${BASE}/Hợp đồng tín dụng/2268.06A HDTD vay theo Han muc co TSBD.docx`, name: "HĐTD vay theo hạn mức có TSBĐ (2268.06A)", category: "hop_dong", methods: ["han_muc"] },
  { path: `${BASE}/Hợp đồng tín dụng/2268.07 BCDXGN kiem GNN han muc SXKD.docx`, name: "BCĐXGN kiểm GNN hạn mức SXKD (2268.07)", category: "hop_dong", methods: ["han_muc"] },
  { path: `${BASE}/Hợp đồng tín dụng/2268.06 Phu luc nhan tien vay.docx`, name: "Phụ lục nhận tiền vay (2268.06)", category: "hop_dong", methods: [] },

  // Phương án sử dụng vốn — SXKD methods only (not tiêu dùng)
  { path: `${BASE}/Phương án sử dụng vốn/2268.01E PASDV vay von ngan han.docx`, name: "PA sử dụng vốn ngắn hạn (2268.01E)", category: "phuong_an", methods: ["tung_lan"] },
  { path: `${BASE}/Phương án sử dụng vốn/2268.01E PASDV vay von ngan han hạn mức.docx`, name: "PA sử dụng vốn ngắn hạn hạn mức (2268.01E)", category: "phuong_an", methods: ["han_muc"] },
  { path: `${BASE}/Phương án sử dụng vốn/2268.01G PASDV vay trung, dai han co TSBD.docx`, name: "PA sử dụng vốn trung dài hạn (2268.01G)", category: "phuong_an", methods: ["trung_dai"] },

  // Báo cáo đề xuất
  { path: `${BASE}/Báo cáo đề xuất/2268.02B BCDXCV ngan han co TSBD cat tuong.docx`, name: "BCĐX ngắn hạn từng lần", category: "bao_cao", methods: ["tung_lan"] },
  { path: `${BASE}/Báo cáo đề xuất/2268.02B BCDXCV ngan han HMTD.docx`, name: "BCĐX ngắn hạn - HMTD", category: "bao_cao", methods: ["han_muc"] },
  { path: `${BASE}/Báo cáo đề xuất/2268.02C BCDXCV trung, dai han nha kinh.docx`, name: "BCĐX trung dài hạn - Nhà kính", category: "bao_cao", methods: ["trung_dai"] },

  // Biên bản kiểm tra — SXKD methods
  { path: `${BASE}/Biên bản kiểm tra/2268.11A BB kiem tra SDVV tung lan.docx`, name: "BB kiểm tra SDVV từng lần (2268.11A)", category: "kiem_tra", methods: ["tung_lan", "han_muc", "trung_dai"] },
  { path: `${BASE}/Biên bản kiểm tra/2268.11B BB kiem tra HDKD tung lan.docx`, name: "BB kiểm tra HĐKD từng lần (2268.11B)", category: "kiem_tra", methods: ["tung_lan", "han_muc"] },

  // Hồ sơ tài sản — imported from asset registry
  ...ASSET_TEMPLATES,

  // Cầm cố Thẻ tiết kiệm — imported from camco registry
  ...CAMCO_TEMPLATES,
  ...CAMCO_ASSET_TEMPLATES,

  // Chứng từ giải ngân — exclude cam_co (has own UNC templates)
  { path: `${BASE}/Chứng từ giải ngân/599 Uy nhiem chi A4.docx`, name: "Ủy nhiệm chi A4 (599)", category: "giai_ngan", methods: ["tung_lan", "han_muc", "trung_dai", "tieu_dung"] },
  { path: `${BASE}/Chứng từ giải ngân/in UNC.docx`, name: "In UNC", category: "giai_ngan", methods: ["tung_lan", "han_muc", "trung_dai", "tieu_dung"] },
  { path: `${BASE}/Chứng từ giải ngân/Hop dong cung ung vat tu.docx`, name: "HĐ cung ứng vật tư", category: "giai_ngan", methods: ["tung_lan", "han_muc"] },
  { path: `${BASE}/Chứng từ giải ngân/Bien ban giao nhan hang hoa.docx`, name: "BB giao nhận hàng hóa", category: "giai_ngan", methods: ["tung_lan", "han_muc"] },
  { path: `${BASE}/Chứng từ giải ngân/HĐ thi công nhà kính - BB nghiệm thu.docx`, name: "HĐ thi công nhà kính & BB nghiệm thu", category: "giai_ngan", methods: ["trung_dai"] },
];

/** Category display labels */
export const DOC_CATEGORY_LABELS: Record<string, string> = {
  danh_muc: "Danh mục hồ sơ",
  phap_ly: "Giấy tờ pháp lý",
  hop_dong: "Hợp đồng tín dụng",
  phuong_an: "Phương án sử dụng vốn",
  bao_cao: "Báo cáo đề xuất",
  kiem_tra: "Biên bản kiểm tra",
  giai_ngan: "Chứng từ giải ngân",
  ...ASSET_CATEGORY_LABELS,
  ...CAMCO_ASSET_CATEGORY_LABELS,
};

/** Filter templates by loan method. Empty methods[] = applies to all. */
export function getTemplatesForMethod(method: string): KhcnDocTemplate[] {
  return KHCN_TEMPLATES.filter(
    (t) => t.methods.length === 0 || t.methods.includes(method),
  );
}

/** Group templates by category */
export function groupByCategory(templates: KhcnDocTemplate[]): Record<string, KhcnDocTemplate[]> {
  return templates.reduce<Record<string, KhcnDocTemplate[]>>((acc, t) => {
    (acc[t.category] ??= []).push(t);
    return acc;
  }, {});
}
