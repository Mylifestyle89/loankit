/**
 * financial-field-catalog-summary.ts
 * Catalog field tổng kết phân tích tài chính (cross-group summary).
 */

import type { FieldCatalogItem } from "@/lib/report/config-schema";

export const CATALOG_FINANCIAL_SUMMARY: FieldCatalogItem[] = [
  {
    field_key: "B.financial.summary",
    label_vi: "Tổng kết phân tích tài chính",
    group: "B.financial",
    type: "text",
    required: true,
    examples: [],
    analysis_prompt: [
      "Tổng hợp lại toàn bộ phân tích các chỉ số tài chính ở trên.",
      "Kết luận ngắn gọn 3-5 câu về tình hình tài chính tổng thể của doanh nghiệp.",
      "Nhấn mạnh những điểm mạnh chính (thanh khoản, sinh lời, cơ cấu vốn).",
      "Đánh giá khả năng hoàn trả nợ vay dựa trên xu hướng các chỉ tiêu.",
      "Nếu có rủi ro cần lưu ý, nêu phương án xử lý để đảm bảo hoàn thành phương án kinh doanh.",
    ].join(" "),
  },
];
