# Phase 2: Frontend DocumentScanner UI + Auto-fill

## Priority: HIGH | Status: pending | Blocked by: Phase 1

## Overview
Tạo UI component cho phép user upload ảnh/PDF → preview kết quả OCR → confirm auto-fill vào form KH.

## Related Code Files
- **Create:** `src/app/report/customers/[id]/components/document-scanner-dialog.tsx`
- **Modify:** `src/app/report/customers/[id]/page.tsx` — thêm nút Scan + integrate dialog

## Implementation Steps

### 1. Tạo `document-scanner-dialog.tsx`

Component dialog gồm:
1. **Step 1 - Upload:** Chọn loại tài liệu (dropdown) + upload file (drag & drop hoặc click)
2. **Step 2 - Processing:** Loading spinner + gọi API
3. **Step 3 - Review:** Hiển thị ảnh bên trái + extracted fields bên phải, user có thể sửa
4. **Step 4 - Confirm:** Nút "Điền vào form" → callback với fields data

Props:
```typescript
type Props = {
  open: boolean;
  onClose: () => void;
  onConfirm: (result: { documentType: string; fields: Record<string, string> }) => void;
  allowedTypes?: DocumentType[]; // default all 4
};
```

UI elements:
- Dialog/modal overlay
- File input accept="image/*,application/pdf"
- Image preview (URL.createObjectURL)
- Fields table: label | extracted value (editable input)
- Confidence badge (green >0.8, yellow >0.5, red <0.5)
- Buttons: "Thử lại" (re-upload), "Điền vào form" (confirm)

### 2. Integrate vào customer page (`page.tsx`)

Thêm nút "📷 Scan tài liệu" vào tab "Thông tin" (info tab) cho KHCN:
- Đặt cạnh heading hoặc trong toolbar
- Click → mở DocumentScannerDialog
- `onConfirm` callback → map extracted fields vào `form` state:

```typescript
// CCCD mapping
if (documentType === "cccd") {
  setForm(prev => ({
    ...prev,
    customer_name: fields.full_name || prev.customer_name,
    cccd: fields.cccd_number || prev.cccd,
    date_of_birth: fields.date_of_birth || prev.date_of_birth,
    cccd_issued_date: fields.issued_date || prev.cccd_issued_date,
    cccd_issued_place: fields.issued_place || prev.cccd_issued_place,
    address: fields.place_of_residence || prev.address,
  }));
}
```

- Chỉ fill field nếu extracted value không rỗng
- Giữ nguyên giá trị cũ nếu OCR không extract được
- Toast notification: "Đã điền X/Y trường từ tài liệu"

### 3. Field mapping cho CCCD → Customer form

| OCR Field | Form Field | Notes |
|-----------|-----------|-------|
| full_name | customer_name | |
| cccd_number | cccd | |
| date_of_birth | date_of_birth | Format dd/mm/yyyy |
| gender | (data_json) | Không có trong form state hiện tại |
| place_of_residence | address | |
| issued_date | cccd_issued_date | Format dd/mm/yyyy |
| issued_place | cccd_issued_place | |

## Todo
- [ ] Create `document-scanner-dialog.tsx` (~120 lines)
- [ ] Add scan button + dialog integration in `page.tsx`
- [ ] Implement CCCD → form field mapping
- [ ] Add toast notification for fill result
- [ ] Test upload + review + auto-fill flow

## Success Criteria
- User can upload CCCD image and see extracted fields
- User can edit extracted values before confirming
- Form auto-fills correctly after confirm
- Clear error states for failed OCR
