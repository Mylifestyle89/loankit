# Brainstorm: Generic PAKD Table Parser

**Date:** 2026-04-02
**Status:** Concluded — Feasible

## Problem Statement
Hiện tại app chỉ parse tốt TEMPLATE Type S (hoa lyly). Cần mở rộng để parse các file PAKD hạn mức khác (thiết bị y tế, mùi nệm, v.v.) mà cán bộ tín dụng tự tạo, format không chuẩn hóa.

## Constraints
- Dưới 10 mẫu file, format tương tự nhau (bảng dọc: STT, Tên, SL, ĐG, TT)
- Mỗi cán bộ tự tạo file → column order/names khác nhau
- Accuracy 80-90% chấp nhận được, user chỉnh sửa trên app
- Cần parse cả cost + revenue + summary metadata

## Phân tích cấu trúc file

### File 1: TEMPLATE-hoa-lyly-han-muc.xlsx (Type S)
- 3 sheets: "Chi phí - Doanh thu", "Thông tin vay", "Tài sản mua sắm"
- 7 cột: STT, Khoản mục, ĐVT, Đơn giá, SL/sào, SL thực tế, Thành tiền
- Revenue: bảng riêng row 30+, cùng format
- Meta: sheet "Thông tin vay" key-value

### File 2: PAKD thiết bị y tế.xlsx
- 1 sheet, 6 cột: STT, Nội dung, ĐVT, SL, Đơn giá, Thành tiền
- Cost: rows 1-32. Summary: rows 33-42. Revenue: rows 43-71. Lợi nhuận: row 72
- Revenue = cùng sản phẩm, giá bán cao hơn giá vốn
- Meta (lãi vay 8.5%, thuế) nằm trong summary section

### File 3: PAKD mùi nệm.xlsx
- Sheet2, 5 cột: STT, Sản phẩm, Đơn giá, SL, Thành tiền
- Cost: rows 1-13. Summary: rows 17-22. Revenue: rows 23-29. Lợi nhuận: row 30
- Revenue = sản phẩm KHÁC cost (dịch vụ bọc trần, ghế da, cách âm)
- Column order ngược: Đơn giá trước SL

### Common Pattern
1. Cost items table: STT + Tên + (ĐVT) + SL + ĐG + TT
2. Summary markers: "Tổng chi phí", "CP trực tiếp", "CP gián tiếp", "Lãi vay", "Thuế"
3. Revenue section: marked by "Doanh thu" or "II"
4. Profit: "Lợi nhuận" or "III"

### Differences
- Column count: 5-7
- Column names vary
- Column ORDER varies (ĐG↔SL)
- Section boundaries not explicit
- Revenue structure varies (same vs different products)

## Evaluated Approaches

### A. Nâng cấp Type B Parser (RECOMMENDED)
- Thêm smart column mapping (fuzzy match, order-independent)
- Thêm section splitter (regex markers cho Vietnamese)
- Thêm summary extractor (lãi vay, thuế, vốn tự có)
- **Pros:** Ít code mới, tận dụng hạ tầng, đủ dùng cho <10 mẫu
- **Cons:** Không xử lý file quá exotic

### B. AI-powered parser (LLM)
- Dùng Gemini/Claude parse Excel → JSON
- **Pros:** Xử lý mọi format
- **Cons:** Over-kill, tốn API, chậm, unpredictable output

### C. Template builder UI
- User tự define column mapping trên UI
- **Pros:** Flexible
- **Cons:** Phức tạp UX, cán bộ không rành tech

## Final Recommendation
**Phương án A: Nâng cấp Type B → "Type B+" với Smart Section Detection**

### Implementation Steps
1. Smart Column Mapping: fuzzy match tên cột bất kể thứ tự
2. Section Splitter: scan marker rows (Tổng chi phí, Doanh thu, Lợi nhuận, I/II/III)
3. Summary Extractor: parse lãi vay, thuế, vốn tự có từ summary rows
4. Revenue Items Extraction: từ revenue section
5. Fallback: nếu không detect được section → toàn bộ = cost items, revenue empty

### Success Criteria
- Parse được ≥ 80% cost items chính xác từ 3 file mẫu
- Detect được section boundaries (cost/revenue/summary)
- Extract được meta (lãi vay, thuế) từ summary section
- Warning system cho các rows/columns không parse được

### Risks
- Column order khác nhau → mitigate: fuzzy match tên, không dựa vào index
- Marker row dùng từ khác → mitigate: regex pattern rộng
- File không có section rõ → mitigate: fallback toàn bộ = cost items
- Thiếu thông tin vay → mitigate: pre-fill từ summary, còn lại user nhập
