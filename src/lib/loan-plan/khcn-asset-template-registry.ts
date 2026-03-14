/**
 * KHCN asset (TSBĐ) template registry — organized by collateral type and ownership.
 * Common templates appear once; type-specific ones are grouped by sub-category.
 */
import { type KhcnDocTemplate } from "./khcn-template-registry";

const TS = "report_assets/KHCN templates/Hồ sơ tài sản";
const QSD_BV = `${TS}/Thế chấp QSD đất TS GLVĐ của bên vay`;
const QSD_BT3 = `${TS}/Thế chấp QSD đất TS GLVĐ của bên thứ 3`;
const GLVD_BV = `${TS}/Thế chấp Tài sản gắn liền với đất của bên vay`;
const GLVD_BT3 = `${TS}/Thế chấp Tài sản gắn liền với đất của bên thứ 3`;
const PTGT_BV = `${TS}/Thế chấp Phương tiện giao thông của bên vay`;
const PTGT_BT3 = `${TS}/Thế chấp Phương tiện giao thông của bên thứ 3`;

export const ASSET_TEMPLATES: KhcnDocTemplate[] = [
  // ══ Mẫu chung (dùng 1 bản đại diện) ══
  { path: `${QSD_BV}/2899.01.TSBD Danh muc ho so bao dam.docx`, name: "Danh mục hồ sơ bảo đảm", category: "tai_san", methods: [] },
  { path: `${QSD_BV}/2899.02.TSBD De nghi hach toan the chap.docx`, name: "Đề nghị hạch toán thế chấp", category: "tai_san", methods: [] },
  { path: `${QSD_BV}/2899.08.TSBD De nghi tang giam thay doi thong tin TSBD.docx`, name: "Đề nghị tăng giảm/thay đổi TT TSBĐ", category: "tai_san", methods: [] },
  { path: `${QSD_BV}/2268.08 Giay uy quyen vay von.docx`, name: "Giấy ủy quyền vay vốn", category: "tai_san", methods: [] },
  { path: `${TS}/2929.34.MB.BBXDL BB noi bo XD lai GT QSD dat va TS.docx`, name: "BB nội bộ XĐ lại GT QSD đất + TS", category: "tai_san", methods: [] },
  { path: `${TS}/2929.34.MB.BBXDL BB noi bo XD lai GT dong san.docx`, name: "BB nội bộ XĐ lại GT động sản", category: "tai_san", methods: [] },

  // ══ BĐS: Thế chấp QSD đất — Bên vay ══
  { path: `${QSD_BV}/2929.01.MB.HDBD HDTC QSD dat va TS GLVD cua ben vay.docx`, name: "HĐTC QSD đất + TS GLVĐ (bên vay)", category: "ts_qsd_bv", methods: [] },
  { path: `${QSD_BV}/2929.03.MB.HDBD HDTC QSD dat cua ben vay.docx`, name: "HĐTC QSD đất (bên vay)", category: "ts_qsd_bv", methods: [] },
  { path: `${QSD_BV}/2929.05.MB.HDBD HDTC QSD dat cua ben vay 2 chu so huu.docx`, name: "HĐTC QSD đất 2 chủ sở hữu (bên vay)", category: "ts_qsd_bv", methods: [] },
  { path: `${QSD_BV}/2929.28.MB.BCTD Bao cao tham dinh QSD dat va TS.docx`, name: "BC thẩm định QSD đất + TS", category: "ts_qsd_bv", methods: [] },
  { path: `${QSD_BV}/2929.30.MB.BBDG Bien ban xac dinh GTTS QSD dat va TS.docx`, name: "BB xác định GTTS QSD đất + TS", category: "ts_qsd_bv", methods: [] },
  { path: `${QSD_BV}/2929.33.MB.BBXDL Bien ban xac dinh lai GTTS QSD dat va TS.docx`, name: "BB xác định lại GTTS QSD đất + TS", category: "ts_qsd_bv", methods: [] },
  { path: `${QSD_BV}/2929.34.MB.BBXDL BB noi bo XD lai GT QSD dat va TS.docx`, name: "BB nội bộ XĐ lại GT QSD đất + TS", category: "ts_qsd_bv", methods: [] },
  { path: `${QSD_BV}/99.2022.01a Dang ky the chap QSD dat.docx`, name: "Đăng ký thế chấp QSD đất", category: "ts_qsd_bv", methods: [] },
  { path: `${QSD_BV}/99.2022.03a Xoa the chap QSD dat, TSGLVD.docx`, name: "Xóa thế chấp QSD đất, TS GLVĐ", category: "ts_qsd_bv", methods: [] },
  { path: `${QSD_BV}/HD sua doi bo sung HDTC dat.docx`, name: "HĐ sửa đổi bổ sung HĐTC đất", category: "ts_qsd_bv", methods: [] },

  // ══ BĐS: Thế chấp QSD đất — Bên thứ 3 ══
  { path: `${QSD_BT3}/2929.02.MB HDTC QSD dat va TS GLVD cua BT3.docx`, name: "HĐTC QSD đất + TS GLVĐ (BT3)", category: "ts_qsd_bt3", methods: [] },
  { path: `${QSD_BT3}/2929.04.MB.HDBD HDTC QSD dat cua ben thu ba.docx`, name: "HĐTC QSD đất (BT3)", category: "ts_qsd_bt3", methods: [] },
  { path: `${QSD_BT3}/2929.06.MB HDTC QSD dat cua BT3 2 chu the.docx`, name: "HĐTC QSD đất 2 chủ thể (BT3)", category: "ts_qsd_bt3", methods: [] },
  { path: `${QSD_BT3}/2929.28.MB.BCTD Bao cao tham dinh QSD dat va TS BT3.docx`, name: "BC thẩm định QSD đất + TS (BT3)", category: "ts_qsd_bt3", methods: [] },
  { path: `${QSD_BT3}/2929.30.MB.BBDG BB xac dinh GTTS QSD dat va TS BT3.docx`, name: "BB xác định GTTS QSD đất + TS (BT3)", category: "ts_qsd_bt3", methods: [] },
  { path: `${QSD_BT3}/2929.31.MB.BBDG Cam ket quyen so huu, su dung TS BT3.docx`, name: "Cam kết quyền sở hữu, SD TS (BT3)", category: "ts_qsd_bt3", methods: [] },
  { path: `${QSD_BT3}/2929.33.MB BB xac dinh lai GTTS nha dat BT3.docx`, name: "BB xác định lại GTTS nhà đất (BT3)", category: "ts_qsd_bt3", methods: [] },
  { path: `${QSD_BT3}/2929.34.MB.BBXDL BB noi bo XD lai GT QSD dat va TS BT3.docx`, name: "BB nội bộ XĐ lại GT QSD đất + TS (BT3)", category: "ts_qsd_bt3", methods: [] },
  { path: `${QSD_BT3}/99.2022.01a Dang ky the chap QSD dat BT3.docx`, name: "Đăng ký TC QSD đất (BT3)", category: "ts_qsd_bt3", methods: [] },
  { path: `${QSD_BT3}/99.2022.01a Dang ky the chap nha dat BT3.docx`, name: "Đăng ký TC nhà đất (BT3)", category: "ts_qsd_bt3", methods: [] },
  { path: `${QSD_BT3}/99.2022.03a Xoa the chap QSD dat, TSGLVD BT3.docx`, name: "Xóa TC QSD đất, TS GLVĐ (BT3)", category: "ts_qsd_bt3", methods: [] },
  { path: `${QSD_BT3}/Cam ket tai san cua ben thu 3.docx`, name: "Cam kết tài sản bên thứ 3", category: "ts_qsd_bt3", methods: [] },
  { path: `${QSD_BT3}/HD sua doi bo sung HDTC BT3 dat.docx`, name: "HĐ sửa đổi bổ sung HĐTC (BT3) đất", category: "ts_qsd_bt3", methods: [] },
  { path: `${QSD_BT3}/Thong bao tiep tuc the chap tai san.docx`, name: "Thông báo tiếp tục thế chấp TS", category: "ts_qsd_bt3", methods: [] },

  // ══ BĐS: Thế chấp TS gắn liền với đất — Bên vay ══
  { path: `${GLVD_BV}/01.2020.TT-BTP.Chung thuc HDTC 2 ben (dat).docx`, name: "Chứng thực HĐTC 2 bên (đất)", category: "ts_glvd_bv", methods: [] },
  { path: `${GLVD_BV}/2929.07.MB.HDBD HDTC TS GLVD cua ben vay.docx`, name: "HĐTC TS GLVĐ (bên vay)", category: "ts_glvd_bv", methods: [] },
  { path: `${GLVD_BV}/2929.28.MB.BCTD Bao cao tham dinh TS GLVD.docx`, name: "BC thẩm định TS GLVĐ", category: "ts_glvd_bv", methods: [] },
  { path: `${GLVD_BV}/2929.30.MB.BBDG Bien ban xac dinh GT TSGLVD.docx`, name: "BB xác định GT TS GLVĐ", category: "ts_glvd_bv", methods: [] },
  { path: `${GLVD_BV}/2929.33.MB.BBXDL Bien ban xac dinh lai GT TS GLVD.docx`, name: "BB xác định lại GT TS GLVĐ", category: "ts_glvd_bv", methods: [] },
  { path: `${GLVD_BV}/2929.34.MB.BBXDL BB noi bo XD lai GT TSGLVD.docx`, name: "BB nội bộ XĐ lại GT TS GLVĐ", category: "ts_glvd_bv", methods: [] },
  { path: `${GLVD_BV}/99.2022.01a Dang ky the chap TSGLVD.docx`, name: "Đăng ký TC TS GLVĐ", category: "ts_glvd_bv", methods: [] },
  { path: `${GLVD_BV}/99.2022.03a Xoa the chap QSD dat, TSGLVD.docx`, name: "Xóa TC QSD đất, TS GLVĐ", category: "ts_glvd_bv", methods: [] },
  { path: `${GLVD_BV}/HD sua doi bo sung HDTC dat.docx`, name: "HĐ sửa đổi bổ sung HĐTC đất", category: "ts_glvd_bv", methods: [] },
  { path: `${GLVD_BV}/Hop dong uy quyen QSD dat.docx`, name: "HĐ ủy quyền QSD đất", category: "ts_glvd_bv", methods: [] },

  // ══ BĐS: Thế chấp TS gắn liền với đất — Bên thứ 3 ══
  { path: `${GLVD_BT3}/01.2020.TT-BTP.Chung thuc HDTC 3 ben (dat).docx`, name: "Chứng thực HĐTC 3 bên (đất)", category: "ts_glvd_bt3", methods: [] },
  { path: `${GLVD_BT3}/2929.08.MB.HDBD HDTC TS GLVD cua ben thu ba.docx`, name: "HĐTC TS GLVĐ (BT3)", category: "ts_glvd_bt3", methods: [] },
  { path: `${GLVD_BT3}/2929.28.MB.BCTD Bao cao tham dinh TS GLVD BT3.docx`, name: "BC thẩm định TS GLVĐ (BT3)", category: "ts_glvd_bt3", methods: [] },
  { path: `${GLVD_BT3}/2929.30.MB.BBDG Bien ban xac dinh GT TSGLVD BT3.docx`, name: "BB xác định GT TS GLVĐ (BT3)", category: "ts_glvd_bt3", methods: [] },
  { path: `${GLVD_BT3}/2929.33.MB.BBXDL BB xac dinh lai GT TS GLVD BT3.docx`, name: "BB xác định lại GT TS GLVĐ (BT3)", category: "ts_glvd_bt3", methods: [] },
  { path: `${GLVD_BT3}/2929.34.MB.BBXDL BB noi bo XD lai GT TSGLVD BT3.docx`, name: "BB nội bộ XĐ lại GT TS GLVĐ (BT3)", category: "ts_glvd_bt3", methods: [] },
  { path: `${GLVD_BT3}/99.2022.01a Dang ky the chap TSGLVD BT3.docx`, name: "Đăng ký TC TS GLVĐ (BT3)", category: "ts_glvd_bt3", methods: [] },
  { path: `${GLVD_BT3}/99.2022.03a Xoa the chap QSD dat, TSGLVD BT3.docx`, name: "Xóa TC QSD đất, TS GLVĐ (BT3)", category: "ts_glvd_bt3", methods: [] },
  { path: `${GLVD_BT3}/HD sua doi bo sung HDTC BT3 dat.docx`, name: "HĐ sửa đổi bổ sung HĐTC (BT3) đất", category: "ts_glvd_bt3", methods: [] },
  { path: `${GLVD_BT3}/Hop dong uy quyen QSD dat.docx`, name: "HĐ ủy quyền QSD đất (BT3)", category: "ts_glvd_bt3", methods: [] },

  // ══ Động sản: PTGT — Bên vay ══
  { path: `${PTGT_BV}/2929.17.MB.HDBD HDTC phuong tien giao thong.docx`, name: "HĐTC phương tiện giao thông", category: "ts_ptgt_bv", methods: [] },
  { path: `${PTGT_BV}/2929.28.MB.BCTD Bao cao tham dinh TSBD la o to.docx`, name: "BC thẩm định TSBĐ ô tô", category: "ts_ptgt_bv", methods: [] },
  { path: `${PTGT_BV}/2929.29.MB.BBDG Bien ban xac dinh GTTS dong san.docx`, name: "BB xác định GTTS động sản", category: "ts_ptgt_bv", methods: [] },
  { path: `${PTGT_BV}/2929.33.MB.BBXDL Bien ban xac dinh lai GTTS dong san.docx`, name: "BB xác định lại GTTS động sản", category: "ts_ptgt_bv", methods: [] },
  { path: `${PTGT_BV}/2929.34.MB.BBXDL BB noi bo XD lai GT dong san.docx`, name: "BB nội bộ XĐ lại GT động sản", category: "ts_ptgt_bv", methods: [] },
  { path: `${PTGT_BV}/2929.41.MB.GBNTC Giay bien nhan the chap ca nhan.docx`, name: "Giấy biên nhận thế chấp cá nhân", category: "ts_ptgt_bv", methods: [] },
  { path: `${PTGT_BV}/99.2022.01d Dang ky the chap dong san.docx`, name: "Đăng ký TC động sản", category: "ts_ptgt_bv", methods: [] },
  { path: `${PTGT_BV}/99.2022.03d Xoa the chap dong san.docx`, name: "Xóa TC động sản", category: "ts_ptgt_bv", methods: [] },
  { path: `${PTGT_BV}/Hop dong sua doi bo sung HDTC 2 ben (xe).docx`, name: "HĐ sửa đổi bổ sung HĐTC 2 bên (xe)", category: "ts_ptgt_bv", methods: [] },

  // ══ Động sản: PTGT — Bên thứ 3 ══
  { path: `${PTGT_BT3}/01.2020.TT-BTP.Chung thuc HDTC 3 ben (xe).docx`, name: "Chứng thực HĐTC 3 bên (xe)", category: "ts_ptgt_bt3", methods: [] },
  { path: `${PTGT_BT3}/2929.17.MB HDTC phuong tien giao thong BT3.docx`, name: "HĐTC phương tiện GT (BT3)", category: "ts_ptgt_bt3", methods: [] },
  { path: `${PTGT_BT3}/2929.28.MB.BCTD BC tham dinh TSBD la o to BT3.docx`, name: "BC thẩm định TSBĐ ô tô (BT3)", category: "ts_ptgt_bt3", methods: [] },
  { path: `${PTGT_BT3}/2929.29.MB BB xac dinh GTTS dong san BT3.docx`, name: "BB xác định GTTS động sản (BT3)", category: "ts_ptgt_bt3", methods: [] },
  { path: `${PTGT_BT3}/2929.33.MB BB xac dinh lai GTTS dong san BT3.docx`, name: "BB xác định lại GTTS động sản (BT3)", category: "ts_ptgt_bt3", methods: [] },
  { path: `${PTGT_BT3}/2929.34.MB BB noi bo XD lai GT dong san BT3.docx`, name: "BB nội bộ XĐ lại GT động sản (BT3)", category: "ts_ptgt_bt3", methods: [] },
  { path: `${PTGT_BT3}/2929.41.MB Giay bien nhan the chap ca nhan BT3.docx`, name: "Giấy biên nhận TC cá nhân (BT3)", category: "ts_ptgt_bt3", methods: [] },
  { path: `${PTGT_BT3}/99.2022.01d Dang ky the chap dong san BT3.docx`, name: "Đăng ký TC động sản (BT3)", category: "ts_ptgt_bt3", methods: [] },
  { path: `${PTGT_BT3}/99.2022.03d Xoa the chap dong san BT3.docx`, name: "Xóa TC động sản (BT3)", category: "ts_ptgt_bt3", methods: [] },
  { path: `${PTGT_BT3}/Hop dong sua doi bo sung HDTC BT3 xe.docx`, name: "HĐ sửa đổi bổ sung HĐTC (BT3) xe", category: "ts_ptgt_bt3", methods: [] },
  { path: `${PTGT_BT3}/Thong bao tiep tuc the chap tai san.docx`, name: "Thông báo tiếp tục TC TS (BT3)", category: "ts_ptgt_bt3", methods: [] },
];

/** Sub-category labels for asset templates */
/** Keys identifying asset categories (used by UI to group into TSBĐ tab) */
export const ASSET_CATEGORY_KEYS = new Set([
  "tai_san", "ts_qsd_bv", "ts_qsd_bt3", "ts_glvd_bv", "ts_glvd_bt3", "ts_ptgt_bv", "ts_ptgt_bt3",
]);

export const ASSET_CATEGORY_LABELS: Record<string, string> = {
  tai_san: "Mẫu chung TSBĐ",
  ts_qsd_bv: "TC QSD đất — Bên vay",
  ts_qsd_bt3: "TC QSD đất — Bên thứ 3",
  ts_glvd_bv: "TC TS gắn liền với đất — Bên vay",
  ts_glvd_bt3: "TC TS gắn liền với đất — Bên thứ 3",
  ts_ptgt_bv: "TC Phương tiện GT — Bên vay",
  ts_ptgt_bt3: "TC Phương tiện GT — Bên thứ 3",
};
