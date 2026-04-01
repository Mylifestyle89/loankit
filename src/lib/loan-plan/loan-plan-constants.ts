// Shared constants for loan plan UI
export const METHOD_OPTIONS = [
  { value: "tung_lan", label: "Từng lần ngắn hạn SXKD" },
  { value: "han_muc", label: "Hạn mức SXKD" },
  { value: "trung_dai", label: "Trung dài hạn SXKD" },
  { value: "tieu_dung", label: "Tiêu dùng" },
  { value: "cam_co", label: "Vay cầm cố" },
] as const;

export const METHOD_LABELS: Record<string, string> = {
  tung_lan: "Từng lần ngắn hạn SXKD",
  han_muc: "Hạn mức SXKD",
  trung_dai: "Trung dài hạn SXKD",
  tieu_dung: "Tiêu dùng",
  cam_co: "Vay cầm cố",
};

export const CATEGORY_LABELS: Record<string, string> = {
  nong_nghiep: "Nông nghiệp",
  kinh_doanh: "Kinh doanh",
  chan_nuoi: "Chăn nuôi",
  an_uong: "Ăn uống/Dịch vụ",
  xay_dung: "Xây dựng/Sửa nhà",
  han_muc: "Hạn mức nông sản",
};
