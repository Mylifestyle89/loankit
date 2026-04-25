# Phase 4: Customer Info Form Fields

## Priority: MEDIUM | Status: pending

## Overview

Thêm form fields UI cho Nghề nghiệp, Quốc tịch, Loại giấy tờ tùy thân vào customer info form. Dữ liệu lưu trong `data_json`.

## Files to modify

### 1. `src/app/report/customers/[id]/components/customer-info-form.tsx`

Thêm 3 fields mới vào section thông tin cá nhân:

```tsx
// Nghề nghiệp
<input name="occupation" value={dataJson.occupation ?? ""} ... />

// Quốc tịch
<input name="nationality" value={dataJson.nationality ?? "Việt Nam"} ... />

// Loại giấy tờ tùy thân
<select name="id_type" value={dataJson.id_type ?? "CCCD"}>
  <option value="CCCD">CCCD</option>
  <option value="CMND">CMND</option>
  <option value="Hộ chiếu">Hộ chiếu</option>
</select>
```

### 2. Save logic

Các fields này lưu vào `data_json` → PATCH `/api/customers/[id]` với `data_json: { ...existing, occupation, nationality, id_type }`.

**Note:** `data_json` đã có update logic trong customer API route — không cần thêm backend code.

### 3. OCR integration (optional, nice-to-have)

`document-scanner-dialog.tsx` đã extract `nationality` từ CCCD OCR → có thể auto-fill vào `data_json.nationality` khi scan.

## Success Criteria

- Form hiển thị 3 fields mới
- Save → data_json updated
- Builder reads từ data_json → fill vào DOCX
