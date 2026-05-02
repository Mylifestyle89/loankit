/**
 * financial-field-catalog-kqkd.ts
 * Catalog fields cho nhóm KQKD (Báo cáo kết quả kinh doanh — Income Statement Analysis).
 */

import type { FieldCatalogItem } from "@/lib/report/config-schema";

export const CATALOG_KQKD: FieldCatalogItem[] = [
  {
    field_key: "B.financial.kqkd.revenue",
    label_vi: "Phân tích Doanh thu và Giá vốn",
    group: "B.financial.kqkd",
    type: "text",
    required: true,
    examples: [],
    analysis_prompt: [
      "Phân tích Doanh thu và Giá vốn hàng bán trong Báo cáo kết quả kinh doanh (KQKD).",
      "Từ bảng KQKD đã cung cấp, hãy:",
      "1. Doanh thu bán hàng (mã số 01) và Doanh thu thuần (mã số 10): so sánh năm N vs N-1, tỷ lệ tăng trưởng %.",
      "2. Giá vốn hàng bán (mã số 11): tốc độ tăng GVHB so với tốc độ tăng DT — có dấu hiệu áp lực chi phí không?",
      "3. Lợi nhuận gộp (mã số 20): tăng/giảm bao nhiêu?",
      "4. Biên lợi nhuận gộp (LN gộp / DT thuần): cải thiện hay xấu đi so với năm trước?",
      "5. Nếu biên gộp giảm, nêu nguyên nhân khả thi (giá nguyên vật liệu, cơ cấu sản phẩm, cạnh tranh).",
      "Ưu tiên điểm tích cực về tăng trưởng doanh thu; nếu biên gộp giảm, đề xuất giải pháp cải thiện.",
    ].join(" "),
  },
  {
    field_key: "B.financial.kqkd.expenses",
    label_vi: "Phân tích Chi phí hoạt động",
    group: "B.financial.kqkd",
    type: "text",
    required: true,
    examples: [],
    analysis_prompt: [
      "Phân tích Chi phí hoạt động trong Báo cáo kết quả kinh doanh (KQKD).",
      "1. Chi phí tài chính (mã số 21) và Chi phí lãi vay (mã số 23): xu hướng tăng/giảm, gánh nặng lãi vay.",
      "   - Lãi vay giảm = tín hiệu quản lý nợ tốt. Lãi vay tăng = cần đánh giá kỹ.",
      "2. Chi phí bán hàng (mã số 24, nếu có): tỷ lệ CP bán hàng/DT — hợp lý không?",
      "3. Chi phí quản lý doanh nghiệp (mã số 25): xu hướng, tỷ lệ CP QLDN/DT.",
      "4. So sánh tổng chi phí (CP tài chính + CP bán hàng + CP QLDN) với doanh thu: DN kiểm soát chi phí tốt không?",
      "5. Tốc độ tăng chi phí so với tốc độ tăng doanh thu: chi phí tăng chậm hơn DT = quản lý hiệu quả.",
      "Tìm điểm tích cực về kiểm soát chi phí; nếu chi phí cao, giải thích lý do và triển vọng cải thiện.",
    ].join(" "),
  },
  {
    field_key: "B.financial.kqkd.profit",
    label_vi: "Phân tích Lợi nhuận",
    group: "B.financial.kqkd",
    type: "text",
    required: true,
    examples: [],
    analysis_prompt: [
      "Phân tích Lợi nhuận trong Báo cáo kết quả kinh doanh (KQKD).",
      "1. Lợi nhuận thuần từ hoạt động kinh doanh (mã số 30): xu hướng tăng/giảm.",
      "2. Thu nhập khác (mã số 31) và Chi phí khác (mã số 32): nếu có, đánh giá tính bất thường.",
      "3. Lợi nhuận trước thuế — LNTT (mã số 50): tăng/giảm bao nhiêu, tỷ lệ %.",
      "4. Lợi nhuận sau thuế — LNST (mã số 60): kết quả cuối cùng, tỷ lệ tăng trưởng %.",
      "5. Chất lượng lợi nhuận: LN chủ yếu từ hoạt động kinh doanh cốt lõi hay từ thu nhập khác/bất thường?",
      "6. LNST có đủ dồi dào để đáp ứng nghĩa vụ trả nợ vay không?",
      "7. Xu hướng lợi nhuận 2 năm: đang cải thiện (tín hiệu tốt) hay suy giảm (cần lưu ý)?",
      "Kết luận về khả năng sinh lời bền vững và năng lực tự trả nợ của doanh nghiệp.",
    ].join(" "),
  },
  {
    field_key: "B.financial.kqkd.summary",
    label_vi: "Tổng kết phân tích KQKD",
    group: "B.financial.kqkd",
    type: "text",
    required: true,
    examples: [],
    analysis_prompt: [
      "Tổng kết phân tích Báo cáo kết quả kinh doanh.",
      "Viết tóm tắt 4-6 câu bao gồm:",
      "1. Tình hình kinh doanh tổng thể: doanh thu tăng trưởng, ổn định, hay suy giảm?",
      "2. Chất lượng lợi nhuận: thực chất từ hoạt động kinh doanh cốt lõi, có bền vững không?",
      "3. Hiệu quả kiểm soát chi phí: DN có quản lý tốt chi phí so với doanh thu không?",
      "4. Kết luận từ góc nhìn người cho vay: kết quả KQKD có tạo đủ dòng tiền và lợi nhuận để trả nợ không?",
    ].join(" "),
  },
];
