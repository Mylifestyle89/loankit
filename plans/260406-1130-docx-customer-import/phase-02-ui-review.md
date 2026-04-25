# Phase 2: UI — Upload + Review + Confirm

## Overview
- Priority: HIGH
- Status: ⬜ Pending
- Upload DOCX files → hiện bảng review AI results → confirm → tạo customer

## Related Files
- `src/components/customers/customer-new-form.tsx` — Form tạo KH hiện có
- `src/app/report/customers/new/page.tsx` — Trang tạo KH mới
- `src/app/report/customers/[id]/components/document-scanner-dialog.tsx` — OCR upload UI pattern

## Implementation Steps

### Step 1: Thêm nút "Import từ DOCX" trên trang danh sách KH

File: `src/components/customers/customer-list-view.tsx`

Bên cạnh nút "Thêm khách hàng" hiện có, thêm nút "Import từ DOCX":
- Click → mở modal upload

### Step 2: Tạo modal import

File: `src/components/customers/customer-docx-import-modal.tsx`

**Layout:**
```
┌─────────────────────────────────────────┐
│ Import thông tin từ hồ sơ DOCX          │
│                                         │
│ [Drop zone: Kéo thả file .docx]        │
│                                         │
│ ─── Kết quả trích xuất ───             │
│                                         │
│ Thông tin khách hàng                    │
│ ┌─────────────┬──────────────────────┐  │
│ │ Họ tên      │ Nguyễn Hoàng Quân   │  │
│ │ CCCD        │ 079084037475        │  │
│ │ Địa chỉ     │ 588/35 Huỳnh...     │  │
│ │ ...         │ ...                  │  │
│ └─────────────┴──────────────────────┘  │
│                                         │
│ Khoản vay                               │
│ ┌─────────────┬──────────────────────┐  │
│ │ Số HĐ       │ 5400LAV...          │  │
│ │ Số tiền vay  │ 4.400.000.000       │  │
│ │ ...         │ ...                  │  │
│ └─────────────┴──────────────────────┘  │
│                                         │
│ Tài sản bảo đảm                        │
│ ┌─────────────┬──────────────────────┐  │
│ │ Tên TSBĐ    │ QSDĐ số...          │  │
│ │ ...         │ ...                  │  │
│ └─────────────┴──────────────────────┘  │
│                                         │
│ [Hủy]              [Tạo khách hàng →]  │
└─────────────────────────────────────────┘
```

**Features:**
- Editable fields: user có thể sửa kết quả AI trước khi confirm
- Duplicate check: nếu CCCD đã tồn tại → cảnh báo + link đến KH hiện có
- Loading state: spinner khi AI đang extract

### Step 3: Submit → tạo Customer + Loan + Collateral

Gọi API tạo customer → nếu có loan data → tạo loan → nếu có collateral → tạo collateral.
Redirect đến trang chi tiết KH vừa tạo.

## Todo
- [ ] Thêm nút Import DOCX trên customer list
- [ ] Tạo modal component với drop zone
- [ ] Review table editable fields
- [ ] Duplicate CCCD check
- [ ] Submit flow: create customer → loan → collateral
- [ ] Build check
