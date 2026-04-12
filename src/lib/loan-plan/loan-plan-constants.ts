// Shared constants for loan plan UI
export const METHOD_OPTIONS = [
  { value: "tung_lan", label: "Từng lần ngắn hạn SXKD" },
  { value: "han_muc", label: "Hạn mức SXKD" },
  { value: "trung_dai", label: "Trung dài hạn SXKD" },
  { value: "tieu_dung", label: "Tiêu dùng" },
  { value: "cam_co", label: "Vay cầm cố" },
  { value: "the_loc_viet", label: "Thẻ tín dụng Lộc Việt" },
] as const;

export const METHOD_LABELS: Record<string, string> = {
  tung_lan: "Từng lần ngắn hạn SXKD",
  han_muc: "Hạn mức SXKD",
  trung_dai: "Trung dài hạn SXKD",
  tieu_dung: "Tiêu dùng",
  cam_co: "Vay cầm cố",
  the_loc_viet: "Thẻ tín dụng Lộc Việt",
};

/** Short labels for loan methods (used in tables, admin UI) */
export const METHOD_SHORT_LABELS: Record<string, string> = {
  tung_lan: "Từng lần",
  han_muc: "Hạn mức",
  trung_dai: "Trung dài hạn",
  tieu_dung: "Tiêu dùng",
  cam_co: "Cầm cố",
  the_loc_viet: "Thẻ Lộc Việt",
};

/** Income source type options for tiêu dùng loans */
export const INCOME_SOURCE_OPTIONS = [
  { value: "salary", label: "Lương" },
  { value: "rental", label: "Cho thuê nhà/mặt bằng" },
  { value: "agriculture", label: "Nông nghiệp" },
  { value: "business", label: "Kinh doanh" },
] as const;

export const INCOME_SOURCE_LABELS: Record<string, string> = {
  salary: "Lương",
  rental: "Cho thuê nhà/mặt bằng",
  agriculture: "Nông nghiệp",
  business: "Kinh doanh",
};

export const CATEGORY_LABELS: Record<string, string> = {
  nong_nghiep: "Nông nghiệp",
  kinh_doanh: "Kinh doanh",
  chan_nuoi: "Chăn nuôi",
  an_uong: "Ăn uống/Dịch vụ",
  xay_dung: "Xây dựng/Sửa nhà",
  han_muc: "Hạn mức nông sản",
};
