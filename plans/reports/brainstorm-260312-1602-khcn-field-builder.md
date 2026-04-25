# Brainstorm: Field Builder cho KHCN Module

**Date:** 2026-03-12
**Status:** Concluded — NOT implementing

## Question
Có nên xây dựng Field Builder (tương tự Airtable) để nhân viên tín dụng tự thêm/sửa field trong các tab KHCN?

## Analysis
- Khả thi về kỹ thuật: dùng JSON custom fields + FieldDefinition table
- 3 phương án đánh giá: JSON fields (best), EAV (overkill), Dynamic migration (rejected)
- Formula engine là rủi ro lớn nhất nếu implement

## Decision
**Không implement Field Builder trong KHCN module.**

### Rationale
1. Hệ thống đã có Field Manager + Template Manager cho admin customize
2. KHCN module tập trung quick-build bộ hồ sơ với field mẫu chuẩn
3. YAGNI — chưa có nhu cầu thực tế từ end users
4. Admin chỉnh sửa dựa trên feedback khi cần

### Revisit Trigger
Nếu admin nhận >10 field request/tháng → cân nhắc self-service Field Builder.
