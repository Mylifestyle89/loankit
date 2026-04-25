# Phase 2: Update DOCX Templates

## Overview
- **Priority:** P1
- **Status:** Pending
- **Effort:** 1h
- **Depends on:** Phase 1

Sửa 2 DOCX templates sang dùng docxtemplater loop syntax cho bảng chi phí/doanh thu.

## Related Files

- **Modify:** `report_assets/KHCN templates/Phương án sử dụng vốn/2268.01E PASDV vay von ngan han.docx`
- **Modify:** `report_assets/KHCN templates/Báo cáo đề xuất/2268.02B BCDXCV ngan han co TSBD.docx`

## Implementation Steps

### 1. Mở template 2268.01E (PA sử dụng vốn) trong Word

Tìm bảng chi phí trực tiếp. Thay thế các rows cố định bằng loop:

**Trước** (giả sử):
```
| STT | Hạng mục    | ĐVT | Số lượng | Đơn giá | Thành tiền |
|-----|-------------|-----|----------|---------|------------|
| 1   | Cây giống   | cây | [PA.Cây giống_SL] | [PA.Cây giống_DG] | [PA.Cây giống_TT] |
| 2   | Đạm         | kg  | [PA.Đạm_SL] | ... | ... |
| ... | ...         | ... | ... | ... | ... |
```

**Sau:**
```
| STT | Hạng mục    | ĐVT | Số lượng | Đơn giá | Thành tiền |
|-----|-------------|-----|----------|---------|------------|
| [#PA_CHIPHI] |
| [STT] | [Hạng mục] | [ĐVT] | [Số lượng] | [Đơn giá] | [Thành tiền] |
| [/PA_CHIPHI] |
|     | **Tổng CPTT** |   |   |   | [PA.Tổng chi phí trực tiếp] |
```

### 2. Thêm bảng doanh thu (nếu template có)

```
| STT | Mô tả | Số lượng | Đơn giá | Thành tiền |
|-----|-------|----------|---------|------------|
| [#PA_DOANHTHU] |
| [STT] | [Mô tả] | [Số lượng] | [Đơn giá] | [Thành tiền] |
| [/PA_DOANHTHU] |
|     | **Tổng doanh thu** |   |   | [PA.Tổng doanh thu dự kiến] |
```

### 3. Verify flat fields trong template

Đảm bảo các placeholder flat vẫn đúng:
- `[PA.Tên phương án]`
- `[PA.Số tiền vay]`, `[PA.Số tiền vay bằng chữ]`
- `[PA.Lãi suất vay]`, `[PA.Lãi vay]`
- `[PA.Vòng quay vốn]`, `[PA.Nhu cầu vốn vay]`
- `[PA.Vốn đối ứng]`, `[PA.Tỷ lệ vốn tự có]`
- `[PA.Tổng chi phí]`, `[PA.Lợi nhuận dự kiến]`

### 4. Cập nhật template 2268.02B (BCĐX)

BCĐX thường chỉ cần flat PA.* fields (tổng số), nhưng nếu có bảng chi phí chi tiết thì thêm loop tương tự.

### 5. Cập nhật khcn-template-registry.ts nếu cần

Nếu thêm template mới hoặc thay đổi path → update registry.

## Important Notes

- docxtemplater delimiter: `[` và `]` (đã config trong docx-engine)
- Loop syntax: `[#LOOP_NAME]...[/LOOP_NAME]` — mỗi row trong table
- `paragraphLoop: true` đã enabled → loop tag phải nằm riêng 1 paragraph/row
- Number formatting: `deepFormat` tự convert số → vi-VN format (1.000.000)

## Todo List

- [ ] Sửa 2268.01E: bảng chi phí → loop PA_CHIPHI
- [ ] Sửa 2268.01E: bảng doanh thu → loop PA_DOANHTHU (nếu có)
- [ ] Sửa 2268.01E: verify flat PA.* placeholders
- [ ] Sửa 2268.02B: thêm PA loop nếu cần
- [ ] Backup templates trước khi sửa

## Success Criteria

- Templates render đúng với docxtemplater loop syntax
- Không còn placeholder cũ kiểu `[PA.Cây giống_SL]`
- Test render với sample data → output DOCX có bảng chi phí đúng
