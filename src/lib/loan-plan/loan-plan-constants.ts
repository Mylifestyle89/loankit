// Shared constants for loan plan UI
export const METHOD_OPTIONS = [
  { value: "tung_lan", label: "Vay từng lần" },
  { value: "han_muc", label: "Hạn mức" },
  { value: "trung_dai", label: "Trung/dài hạn" },
  { value: "tieu_dung", label: "Tiêu dùng" },
] as const;

export const METHOD_LABELS: Record<string, string> = {
  tung_lan: "Từng lần",
  han_muc: "Hạn mức",
  trung_dai: "Trung/dài hạn",
  tieu_dung: "Tiêu dùng",
};

export const CATEGORY_LABELS: Record<string, string> = {
  nong_nghiep: "Nông nghiệp",
  kinh_doanh: "Kinh doanh",
  chan_nuoi: "Chăn nuôi",
  an_uong: "Ăn uống/Dịch vụ",
  xay_dung: "Xây dựng/Sửa nhà",
  han_muc: "Hạn mức nông sản",
};
