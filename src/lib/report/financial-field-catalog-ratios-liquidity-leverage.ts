/**
 * financial-field-catalog-ratios-liquidity-leverage.ts
 * Catalog fields nhóm I (Khả năng thanh toán) và nhóm II (Cơ cấu vốn).
 */

import type { FieldCatalogItem } from "@/lib/report/config-schema";

export const CATALOG_RATIOS_LIQUIDITY_LEVERAGE: FieldCatalogItem[] = [
  // ── I. Khả năng thanh toán ──────────────────────────────────────────────────
  {
    field_key: "B.financial.ratios.current_ratio",
    label_vi: "Hệ số khả năng thanh toán hiện hành (lần)",
    group: "B.financial.ratios",
    type: "number",
    required: true,
    examples: [],
    analysis_prompt: [
      "Phân tích hệ số khả năng thanh toán hiện hành (Tài sản ngắn hạn / Nợ ngắn hạn).",
      "So sánh giá trị năm hiện tại với năm trước: nêu mức tăng/giảm cụ thể.",
      "Ý nghĩa: phản ánh khả năng DN đáp ứng các khoản nợ ngắn hạn bằng tài sản lưu động.",
      "Ngưỡng tham khảo: trên 1 là đảm bảo khả năng thanh toán ngắn hạn.",
      "Tìm điểm tích cực: nếu > 1 hoặc đang cải thiện, nhấn mạnh DN có đủ khả năng thanh toán.",
      "Nếu < 1 hoặc giảm, nêu nguyên nhân khả thi và đề xuất giải pháp cụ thể để cải thiện.",
    ].join(" "),
  },
  {
    field_key: "B.financial.ratios.quick_ratio",
    label_vi: "Hệ số khả năng thanh toán nhanh (lần)",
    group: "B.financial.ratios",
    type: "number",
    required: true,
    examples: [],
    analysis_prompt: [
      "Phân tích hệ số khả năng thanh toán nhanh ((TSNH − Hàng tồn kho) / Nợ ngắn hạn).",
      "So sánh năm hiện tại vs năm trước, nêu biến động.",
      "Ý nghĩa: phản ánh khả năng thanh toán nợ ngắn hạn mà không cần bán hàng tồn kho.",
      "Ngưỡng tham khảo: >= 0.5 được xem là an toàn.",
      "Tìm điểm tích cực: nếu >= 0.5 hoặc cải thiện, nhấn mạnh DN có thanh khoản tốt.",
      "Nếu thấp, đề xuất giải pháp như thu hồi công nợ nhanh hơn hoặc giảm hàng tồn kho.",
    ].join(" "),
  },
  {
    field_key: "B.financial.ratios.cash_ratio",
    label_vi: "Hệ số khả năng thanh toán tức thời (lần)",
    group: "B.financial.ratios",
    type: "number",
    required: true,
    examples: [],
    analysis_prompt: [
      "Phân tích hệ số khả năng thanh toán tức thời (Tiền và tương đương tiền / Nợ ngắn hạn).",
      "So sánh năm hiện tại vs năm trước.",
      "Ý nghĩa: phản ánh khả năng thanh toán tức thời bằng tiền mặt đối với nợ ngắn hạn.",
      "Đánh giá xu hướng: lượng tiền mặt có đang cải thiện hay giảm đi.",
      "Nếu tích cực, nhấn mạnh DN duy trì lượng tiền mặt ổn định.",
      "Nếu giảm, nêu nguyên nhân (đầu tư, mở rộng SXKD) và đánh giá tính hợp lý.",
    ].join(" "),
  },
  {
    field_key: "B.financial.ratios.interest_coverage",
    label_vi: "Hệ số khả năng thanh toán lãi vay (lần)",
    group: "B.financial.ratios",
    type: "number",
    required: true,
    examples: [],
    analysis_prompt: [
      "Phân tích hệ số khả năng thanh toán lãi vay ((LNTT + Chi phí lãi vay) / Chi phí lãi vay).",
      "So sánh năm hiện tại vs năm trước.",
      "Ý nghĩa: phản ánh khả năng DN dùng thu nhập từ HĐKD để đáp ứng chi phí lãi vay.",
      "Ngưỡng tham khảo: > 1 là đảm bảo khả năng trả lãi.",
      "Hệ số càng cao, khả năng trả lãi càng vững chắc — đây là tín hiệu rất tốt cho người cho vay.",
      "Nếu < 1 hoặc giảm mạnh, nêu rõ rủi ro và đề xuất phương án (tái cơ cấu nợ, tăng doanh thu).",
    ].join(" "),
  },

  // ── II. Cơ cấu vốn ──────────────────────────────────────────────────────────
  {
    field_key: "B.financial.ratios.equity_ratio",
    label_vi: "Hệ số tự tài trợ (%)",
    group: "B.financial.ratios",
    type: "percent",
    required: true,
    examples: [],
    analysis_prompt: [
      "Phân tích hệ số tự tài trợ (Vốn chủ sở hữu / Tổng tài sản).",
      "So sánh năm hiện tại vs năm trước.",
      "Ý nghĩa: phản ánh khả năng tự bảo đảm tài chính và mức độ độc lập tài chính của DN.",
      "Ngưỡng tham khảo: >= 25% được xem là lành mạnh.",
      "Hệ số càng cao, DN càng ít phụ thuộc vào nợ — là điểm cộng lớn cho quyết định cho vay.",
      "Nếu < 25%, đánh giá nguyên nhân và khả năng bổ sung vốn chủ sở hữu.",
    ].join(" "),
  },
  {
    field_key: "B.financial.ratios.debt_to_equity",
    label_vi: "Hệ số nợ trên vốn chủ sở hữu (lần)",
    group: "B.financial.ratios",
    type: "number",
    required: true,
    examples: [],
    analysis_prompt: [
      "Phân tích hệ số nợ trên vốn chủ sở hữu (Nợ phải trả / VCSH).",
      "So sánh năm hiện tại vs năm trước.",
      "Ý nghĩa: cho biết mỗi đồng vốn chủ sở hữu phải gánh bao nhiêu đồng nợ.",
      "Ngưỡng tham khảo: <= 3 lần là chấp nhận được.",
      "Hệ số thấp và ổn định cho thấy cấu trúc vốn lành mạnh, thuận lợi cho vay.",
      "Nếu cao hoặc tăng nhanh, nêu rủi ro đòn bẩy tài chính và đề xuất giải pháp giảm nợ.",
    ].join(" "),
  },
];
