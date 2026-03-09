/**
 * financial-field-catalog.ts
 *
 * Static catalog of 15 financial ratio fields + 1 summary field used for
 * AI-powered financial analysis from a LENDER's perspective.
 *
 * Each entry carries an `analysis_prompt` that instructs AI to:
 *   1. Compare Year N vs Year N-1 (tăng/giảm, xu hướng)
 *   2. Prioritise positive findings (cơ sở cho vay được)
 *   3. If risks exist, propose concrete mitigation strategies
 *
 * Architecture: This file is imported by fs-store.ts to seed FrameworkState
 * and by the financial-analysis service to drive AI prompts.
 */

import type { FieldCatalogItem } from "@/lib/report/config-schema";

// ─── Catalog Definition ──────────────────────────────────────────────────────

export const FINANCIAL_FIELD_CATALOG: FieldCatalogItem[] = [
  // ═══════════════════════════════════════════════════════════════════════════
  // NHÓM CĐKT: PHÂN TÍCH BẢNG CÂN ĐỐI KẾ TOÁN (Balance Sheet Analysis)
  // ═══════════════════════════════════════════════════════════════════════════
  {
    field_key: "B.financial.cdkt.assets_current",
    label_vi: "Phân tích Tài sản ngắn hạn",
    group: "B.financial.cdkt",
    type: "text",
    required: true,
    examples: [],
    analysis_prompt: [
      "Phân tích tình hình Tài sản ngắn hạn (mã số 100) trong Bảng cân đối kế toán.",
      "Từ bảng CĐKT đã cung cấp, hãy:",
      "1. So sánh tổng TSNH năm hiện tại vs năm trước: nêu mức tăng/giảm tuyệt đối (triệu/tỷ đồng) và tỷ lệ %.",
      "2. Phân tích từng thành phần chính:",
      "   - Tiền và tương đương tiền (mã số 110): xu hướng tăng/giảm, tỷ trọng trong TSNH.",
      "   - Phải thu khách hàng (mã số 130-131): xu hướng, đánh giá chất lượng công nợ phải thu.",
      "   - Hàng tồn kho (mã số 140): xu hướng tăng/giảm, tỷ trọng HTK/TSNH — có hợp lý với ngành không?",
      "   - TSNH khác (mã số 150): nếu có biến động đáng kể.",
      "3. Tỷ trọng TSNH trong Tổng tài sản (mã số 270): cơ cấu có phù hợp đặc thù ngành không?",
      "4. Từ góc nhìn người cho vay: TSNH có đủ đảm bảo nghĩa vụ nợ ngắn hạn không?",
      "Ưu tiên tìm điểm tích cực; nếu có rủi ro (HTK cao, phải thu khó đòi), đề xuất giải pháp cụ thể.",
    ].join(" "),
  },
  {
    field_key: "B.financial.cdkt.assets_noncurrent",
    label_vi: "Phân tích Tài sản dài hạn",
    group: "B.financial.cdkt",
    type: "text",
    required: true,
    examples: [],
    analysis_prompt: [
      "Phân tích tình hình Tài sản dài hạn (mã số 200) trong Bảng cân đối kế toán.",
      "1. So sánh tổng TSDH năm hiện tại vs năm trước: mức tăng/giảm tuyệt đối và %.",
      "2. Phân tích thành phần chính:",
      "   - Tài sản cố định (mã số 220): xu hướng đầu tư TSCĐ, nguyên giá vs khấu hao lũy kế.",
      "   - Đầu tư tài chính dài hạn (mã số 250, nếu có): quy mô và xu hướng.",
      "   - TSDH khác (mã số 260, nếu có).",
      "3. Tỷ trọng TSDH trong Tổng tài sản: cơ cấu có phù hợp đặc thù ngành?",
      "4. Đánh giá năng lực sản xuất kinh doanh dựa trên quy mô TSCĐ.",
      "Nêu điểm tích cực về năng lực cơ sở vật chất; nếu TSCĐ giảm do khấu hao, đánh giá tính hợp lý.",
    ].join(" "),
  },
  {
    field_key: "B.financial.cdkt.liabilities",
    label_vi: "Phân tích Nợ phải trả",
    group: "B.financial.cdkt",
    type: "text",
    required: true,
    examples: [],
    analysis_prompt: [
      "Phân tích tình hình Nợ phải trả (mã số 300) trong Bảng cân đối kế toán.",
      "1. So sánh tổng Nợ phải trả năm hiện tại vs năm trước: tăng/giảm tuyệt đối và %.",
      "2. Phân tích cơ cấu nợ:",
      "   - Nợ ngắn hạn (mã số 310): vay ngắn hạn ngân hàng, phải trả người bán, thuế phải nộp...",
      "   - Nợ dài hạn (mã số 330): vay dài hạn, nếu có.",
      "3. Tỷ lệ Nợ/Tổng tài sản và Nợ/VCSH: đòn bẩy tài chính ở mức nào?",
      "4. Mức độ phụ thuộc vay nợ: xu hướng tăng hay giảm?",
      "5. Từ góc nhìn người cho vay: mức nợ có an toàn không? TSNH có đủ đảm bảo Nợ NH không?",
      "Nếu nợ tăng, phân biệt: do mở rộng SXKD (tích cực) hay do thua lỗ/mất cân đối (tiêu cực).",
      "Đề xuất giải pháp nếu đòn bẩy quá cao.",
    ].join(" "),
  },
  {
    field_key: "B.financial.cdkt.equity",
    label_vi: "Phân tích Vốn chủ sở hữu",
    group: "B.financial.cdkt",
    type: "text",
    required: true,
    examples: [],
    analysis_prompt: [
      "Phân tích tình hình Vốn chủ sở hữu (mã số 400) trong Bảng cân đối kế toán.",
      "1. So sánh VCSH năm hiện tại vs năm trước: tăng/giảm tuyệt đối và %.",
      "2. Phân tích cơ cấu VCSH:",
      "   - Vốn đầu tư của chủ sở hữu / Vốn điều lệ (mã số 411): ổn định hay thay đổi?",
      "   - Lợi nhuận sau thuế chưa phân phối (mã số 421): xu hướng tích lũy.",
      "3. Hệ số tự tài trợ (VCSH/Tổng TS): DN có phụ thuộc vay nợ quá mức không?",
      "4. Tăng trưởng VCSH chủ yếu từ đâu: bổ sung vốn hay tích lũy lợi nhuận?",
      "5. Khả năng tài chính nội tại: VCSH dày = nền tảng vững chắc cho hoạt động vay vốn.",
      "Ưu tiên điểm tích cực về sự tăng trưởng VCSH và khả năng tự tài trợ.",
    ].join(" "),
  },
  {
    field_key: "B.financial.cdkt.summary",
    label_vi: "Tổng kết phân tích Bảng CĐKT",
    group: "B.financial.cdkt",
    type: "text",
    required: true,
    examples: [],
    analysis_prompt: [
      "Tổng kết phân tích Bảng cân đối kế toán.",
      "Dựa trên toàn bộ dữ liệu CĐKT đã phân tích, viết tóm tắt 4-6 câu bao gồm:",
      "1. Quy mô tổng tài sản và xu hướng tăng trưởng.",
      "2. Cơ cấu tài sản (TSNH vs TSDH) và nguồn vốn (Nợ vs VCSH): có cân đối hợp lý không?",
      "3. Điểm mạnh và điểm yếu chính trong cấu trúc tài chính.",
      "4. Kết luận từ góc nhìn người cho vay: bảng CĐKT có tạo cơ sở tốt để cho vay không?",
    ].join(" "),
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // NHÓM KQKD: PHÂN TÍCH BÁO CÁO KẾT QUẢ KINH DOANH (Income Statement Analysis)
  // ═══════════════════════════════════════════════════════════════════════════
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

  // ═══════════════════════════════════════════════════════════════════════════
  // NHÓM I: KHẢ NĂNG THANH TOÁN (Liquidity Ratios)
  // ═══════════════════════════════════════════════════════════════════════════
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

  // ═══════════════════════════════════════════════════════════════════════════
  // NHÓM II: CƠ CẤU VỐN (Capital Structure / Leverage)
  // ═══════════════════════════════════════════════════════════════════════════
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

  // ═══════════════════════════════════════════════════════════════════════════
  // NHÓM III: KHẢ NĂNG HOẠT ĐỘNG (Activity / Efficiency)
  // ═══════════════════════════════════════════════════════════════════════════
  {
    field_key: "B.financial.ratios.working_capital_turnover",
    label_vi: "Vòng quay vốn lưu động (vòng)",
    group: "B.financial.ratios",
    type: "number",
    required: true,
    examples: [],
    analysis_prompt: [
      "Phân tích vòng quay vốn lưu động (Doanh thu thuần / TSNH bình quân).",
      "So sánh năm hiện tại vs năm trước.",
      "Ý nghĩa: phản ánh hiệu suất sử dụng tài sản lưu động — 1 đơn vị TSNH tạo ra bao nhiêu doanh thu.",
      "Chỉ tiêu càng cao, tài sản ngắn hạn vận động nhanh, góp phần nâng cao lợi nhuận.",
      "Tìm điểm tích cực: tăng vòng quay = DN sử dụng vốn hiệu quả hơn.",
      "Nếu giảm, phân tích nguyên nhân (TSNH tăng nhanh hơn DT) và đề xuất hướng tối ưu.",
    ].join(" "),
  },
  {
    field_key: "B.financial.ratios.inventory_turnover",
    label_vi: "Vòng quay hàng tồn kho (vòng)",
    group: "B.financial.ratios",
    type: "number",
    required: true,
    examples: [],
    analysis_prompt: [
      "Phân tích vòng quay hàng tồn kho (Giá vốn hàng bán / HTK bình quân).",
      "So sánh năm hiện tại vs năm trước.",
      "Ý nghĩa: phản ánh tốc độ luân chuyển hàng tồn kho để tạo ra doanh thu.",
      "Chỉ tiêu càng cao, hàng tồn kho vận động nhanh — góp phần tăng DT và lợi nhuận.",
      "Nếu thấp hoặc giảm, cần phân biệt: do tồn đọng hay do DN tích trữ nguyên vật liệu chiến lược.",
      "Đề xuất giải pháp nếu tồn đọng: đẩy mạnh bán hàng, thanh lý hàng chậm luân chuyển.",
    ].join(" "),
  },
  {
    field_key: "B.financial.ratios.receivables_turnover",
    label_vi: "Vòng quay khoản phải thu (vòng)",
    group: "B.financial.ratios",
    type: "number",
    required: true,
    examples: [],
    analysis_prompt: [
      "Phân tích vòng quay khoản phải thu (Doanh thu thuần / Phải thu bình quân).",
      "So sánh năm hiện tại vs năm trước.",
      "Ý nghĩa: phản ánh tốc độ chuyển đổi khoản phải thu thành tiền mặt.",
      "Chỉ tiêu càng cao, DN thu hồi tiền hàng kịp thời, ít bị chiếm dụng vốn.",
      "Tìm điểm tích cực: vòng quay cao hoặc tăng = thu hồi công nợ hiệu quả.",
      "Nếu giảm, đề xuất: siết chặt chính sách tín dụng thương mại, đẩy mạnh thu hồi công nợ.",
    ].join(" "),
  },
  {
    field_key: "B.financial.ratios.fixed_asset_turnover",
    label_vi: "Vòng quay tài sản cố định (vòng)",
    group: "B.financial.ratios",
    type: "number",
    required: true,
    examples: [],
    analysis_prompt: [
      "Phân tích vòng quay tài sản cố định (Doanh thu thuần / TSCĐ bình quân).",
      "So sánh năm hiện tại vs năm trước.",
      "Ý nghĩa: đo lường khả năng DN tạo ra doanh thu từ việc đầu tư vào TSCĐ.",
      "Tỷ số càng cao, hiệu quả sử dụng TSCĐ càng lớn — DN tận dụng tốt cơ sở vật chất.",
      "Nếu tăng: DN đang khai thác hiệu quả tài sản cố định hiện có.",
      "Nếu giảm: có thể do đầu tư TSCĐ mới chưa đạt công suất — đánh giá triển vọng dài hạn.",
    ].join(" "),
  },
  {
    field_key: "B.financial.ratios.total_asset_turnover",
    label_vi: "Vòng quay tổng tài sản (vòng)",
    group: "B.financial.ratios",
    type: "number",
    required: true,
    examples: [],
    analysis_prompt: [
      "Phân tích vòng quay tổng tài sản (Doanh thu thuần / Tổng TS bình quân).",
      "So sánh năm hiện tại vs năm trước.",
      "Ý nghĩa: đo lường khả năng DN tạo ra doanh thu từ việc đầu tư vào tổng tài sản.",
      "Tỷ số càng cao, hiệu quả sử dụng tài sản cho HĐKD càng tốt.",
      "Tìm điểm tích cực: vòng quay ổn định hoặc tăng cho thấy DN vận hành hiệu quả.",
      "Nếu giảm, phân tích: do tài sản tăng nhanh (mở rộng) hay do doanh thu giảm.",
    ].join(" "),
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // NHÓM IV: KHẢ NĂNG SINH LỜI (Profitability)
  // ═══════════════════════════════════════════════════════════════════════════
  {
    field_key: "B.financial.ratios.ros",
    label_vi: "Tỷ suất lợi nhuận biên – ROS",
    group: "B.financial.ratios",
    type: "percent",
    required: true,
    examples: [],
    analysis_prompt: [
      "Phân tích tỷ suất lợi nhuận biên ROS (Lợi nhuận sau thuế / Doanh thu thuần).",
      "So sánh năm hiện tại vs năm trước.",
      "Ý nghĩa: cứ 1 đồng doanh thu tạo ra bao nhiêu đồng lợi nhuận sau thuế.",
      "Đây là tỷ lệ quan trọng nhất đánh giá khả năng sinh lời chung của DN.",
      "ROS dương và ổn định/tăng là tín hiệu rất tốt cho khả năng trả nợ.",
      "Nếu giảm, phân tích nguyên nhân (chi phí tăng, giá bán giảm) và đề xuất giải pháp kiểm soát chi phí.",
    ].join(" "),
  },
  {
    field_key: "B.financial.ratios.roa",
    label_vi: "Khả năng sinh lời của tài sản – ROA",
    group: "B.financial.ratios",
    type: "percent",
    required: true,
    examples: [],
    analysis_prompt: [
      "Phân tích khả năng sinh lời của tài sản ROA (LNST / Tổng TS bình quân).",
      "So sánh năm hiện tại vs năm trước.",
      "Ý nghĩa: cứ 1 đồng tài sản bình quân tạo ra bao nhiêu đồng lợi nhuận sau thuế.",
      "ROA cao cho thấy DN sử dụng tài sản hiệu quả để tạo lợi nhuận.",
      "Tìm điểm tích cực: ROA dương và cải thiện = DN kinh doanh có lãi, tài sản sinh lợi tốt.",
      "Nếu thấp hoặc giảm, đề xuất: tối ưu hóa tài sản, cắt giảm tài sản không hiệu quả.",
    ].join(" "),
  },
  {
    field_key: "B.financial.ratios.roe",
    label_vi: "Khả năng sinh lời của vốn chủ sở hữu – ROE",
    group: "B.financial.ratios",
    type: "percent",
    required: true,
    examples: [],
    analysis_prompt: [
      "Phân tích khả năng sinh lời của VCSH – ROE (LNST / VCSH bình quân).",
      "So sánh năm hiện tại vs năm trước.",
      "Ý nghĩa: cứ 1 đồng vốn chủ sở hữu đầu tư vào SXKD tạo ra bao nhiêu đồng LNST.",
      "QUAN TRỌNG khi đánh giá ROE từ góc nhìn cho vay:",
      "- ROE tăng + LN tăng + VCSH ổn/tăng = tín hiệu rất tốt (DN kinh doanh hiệu quả hơn).",
      "- ROE tăng nhưng do VCSH giảm (lỗ vốn) = tín hiệu xấu — cần cảnh báo.",
      "- ROE giảm nhưng cả LN và VCSH đều tăng (VCSH tăng nhanh hơn LN) = bình thường, DN đang tích lũy vốn.",
      "Nếu ROE thấp, đề xuất: tối ưu chi phí, tăng hiệu quả sử dụng đòn bẩy tài chính hợp lý.",
    ].join(" "),
  },
  {
    field_key: "B.financial.ratios.bep",
    label_vi: "Tỷ số sinh lời cơ sở – BEP",
    group: "B.financial.ratios",
    type: "percent",
    required: true,
    examples: [],
    analysis_prompt: [
      "Phân tích tỷ số sinh lời cơ sở BEP ((LNTT + Chi phí lãi vay) / Tổng tài sản).",
      "So sánh năm hiện tại vs năm trước.",
      "Ý nghĩa: phản ánh khả năng tạo lợi nhuận trước khi trả lãi và thuế trên tổng tài sản.",
      "BEP phải lớn hơn lãi suất vay vốn để đảm bảo DN có khả năng trả lãi vay.",
      "Tìm điểm tích cực: BEP > lãi suất vay = DN kinh doanh đủ lãi để chi trả chi phí tài chính.",
      "Nếu BEP thấp hoặc giảm, đề xuất: tối ưu hóa hoạt động SXKD để nâng cao hiệu quả sinh lời.",
    ].join(" "),
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // TỔNG KẾT (Summary)
  // ═══════════════════════════════════════════════════════════════════════════
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
