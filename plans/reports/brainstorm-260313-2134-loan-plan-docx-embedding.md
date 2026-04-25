# Brainstorm: Nhúng Phương án vay vốn vào DOCX Template

## Problem
- `buildLoanPlanExtendedData` hardcode costNameMap cho nông nghiệp (13 items cố định)
- 6 category khác nhau, mỗi loại có cost/revenue items khác nhau
- Cần consistent approach cho mọi loại PA

## Decision: Loop-first Approach

### Data Structure
```
PA_CHIPHI = [{ STT, name, unit, qty, unitPrice, amount }]   // dynamic loop
PA_DOANHTHU = [{ STT, description, qty, unitPrice, amount }] // dynamic loop
PA.* = flat financials (tổng CPTT, lãi vay, lợi nhuận, vốn đối ứng, bằng chữ...)
```

### DOCX Template Pattern
- Cost table: `[#PA_CHIPHI][STT] [name] [unit] [qty] [unitPrice] [amount][/PA_CHIPHI]`
- Revenue table: `[#PA_DOANHTHU]...[/PA_DOANHTHU]`
- Flat fields: `[PA.Tổng chi phí trực tiếp]`, `[PA.Lợi nhuận dự kiến]`...

### Scope
- 2 templates cần sửa: 2268.01E (PA sử dụng vốn) + 2268.02B (Báo cáo đề xuất)
- Bỏ costNameMap hardcode, thay bằng universal loop
- Backward-compat: KHÔNG cần giữ, sửa luôn sang loop

### Alternatives Rejected
- **Hybrid (flat+loop)**: Duplicate logic, 2 patterns → vi phạm DRY
- **Config-driven**: Over-engineered cho 6 categories → vi phạm YAGNI

### Risks
- Template DOCX cần sửa tay (chỉ 2 file, 1 lần)
- Loop rỗng → docxtemplater tự ẩn, nullGetter trả ""
- Format số → deepFormat đã xử lý vi-VN
