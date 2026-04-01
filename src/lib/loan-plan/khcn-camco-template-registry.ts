/**
 * KHCN cầm cố (pledge) template registry — templates for "Cầm cố Thẻ tiết kiệm do Agribank phát hành 4470".
 * Includes both loan docs and TSBĐ docs specific to pledge loans.
 */
import { type KhcnDocTemplate } from "./khcn-template-registry";

const CC = "report_assets/KHCN templates/Cầm cố Thẻ tiết kiệm do Agribank phát hành 4470";

/** Loan document templates for cầm cố method */
export const CAMCO_TEMPLATES: KhcnDocTemplate[] = [
  // Danh mục hồ sơ
  { path: `${CC}/2899.01.CV Danh muc ho so vay von TTK.docx`, name: "Danh mục hồ sơ vay vốn TTK", category: "danh_muc", methods: ["cam_co"] },

  // Hợp đồng tín dụng
  { path: `${CC}/1.Mau so 01A.HDTD kiem HDCC BCDXCV gia tri nho TSBD cua Agribank 30.12.docx`, name: "HĐTD kiểm HĐCC BCĐXCV ≤ giá trị nhỏ TSBĐ (01A)", category: "hop_dong", methods: ["cam_co"] },
  { path: `${CC}/2.Mau so 01B. HDTD CC co tai san la CCTG STK tren gia tri nho 24.12.docx`, name: "HĐTD CC có TS là CCTG/STK > giá trị nhỏ (01B)", category: "hop_dong", methods: ["cam_co"] },

  // Báo cáo đề xuất
  { path: `${CC}/5. Mau so 2B BCDXCV CCTG SDTG tren 100 trieu.docx`, name: "BCĐXCV CCTG SĐTG > 100 triệu (2B)", category: "bao_cao", methods: ["cam_co"] },
  { path: `${CC}/868.07 BC de xuat GN kiem GNN vay CCGTCG.docx`, name: "BC đề xuất GN kiểm GNN vay CCGTCG (868.07)", category: "bao_cao", methods: ["cam_co"] },

  // Biên bản kiểm tra
  { path: `${CC}/2268.11A BB kiem tra SDVV tung lan.docx`, name: "BB kiểm tra SDVV (2268.11A)", category: "kiem_tra", methods: ["cam_co"] },

  // Giấy tờ pháp lý
  { path: `${CC}/Cam ket ve viec bo sung chung tu chung minh muc dich su dung von.docx`, name: "Cam kết bổ sung chứng từ chứng minh MĐSDV", category: "phap_ly", methods: ["cam_co"] },

  // Chứng từ giải ngân
  { path: `${CC}/599 Uy nhiem chi A4.docx`, name: "Ủy nhiệm chi A4 (599)", category: "giai_ngan", methods: ["cam_co"] },
  { path: `${CC}/Bang ke mua hang.docx`, name: "Bảng kê mua hàng", category: "giai_ngan", methods: ["cam_co"] },
];

/** TSBĐ templates specific to cầm cố (pledge collateral) */
export const CAMCO_ASSET_TEMPLATES: KhcnDocTemplate[] = [
  { path: `${CC}/2899.01.TSBD Danh muc ho so bao dam TTK.docx`, name: "Danh mục hồ sơ bảo đảm TTK", category: "ts_camco", methods: ["cam_co"] },
];

/** Category keys for cầm cố assets (used by UI to group into TSBĐ tab) */
export const CAMCO_ASSET_CATEGORY_KEYS = new Set(["ts_camco"]);

/** Category labels for cầm cố */
export const CAMCO_ASSET_CATEGORY_LABELS: Record<string, string> = {
  ts_camco: "CC Thẻ tiết kiệm Agribank",
};
