# Debug: BK Import – Customer không xuất hiện sau khi import

**Date:** 2026-03-16
**Severity:** High (data loss perception)

---

## Root Cause

**File BK được import (`2026-3-16-1-18-5.bk`) KHÔNG chứa "Trần Bảo Thạch".**
File chỉ có 1 khách hàng duy nhất: **"Nguyễn Hoàng Quân"**.

Đây là nguyên nhân chính: user import nhầm file, hoặc file BK được tạo ra không phải cho "Trần Bảo Thạch".

---

## Evidence

### 1. File BK content
- File `report_assets/uploads/2026-3-16-1-18-5.bk` chứa JSON với 1 client:
  ```json
  { "Clients": [{ "Title": "Nguyễn Hoàng Quân", ... }] }
  ```
- Grep "Trần Bảo Thạch" → **No matches found**.

### 2. Import flow hoạt động đúng
Pipeline import hoàn toàn đúng:
1. `POST /api/report/import/bk` → parse file JSON → `importBkFileMulti()` → trả về danh sách clients
2. `customers/page.tsx` → loop từng client → `POST /api/customers/from-draft`
3. `saveFromDraft()` → upsert vào DB theo `customer_name`

### 3. Mapping customer name đúng
`bk-mapping.ts` line 6: `"Tên khách hàng" → "A.general.customer_name"` ✓
BK file có field `"Tên khách hàng": "Nguyễn Hoàng Quân"` → sẽ được lưu đúng.

### 4. Success message có thể gây nhầm lẫn
`customers/page.tsx` line 139: hiện `"Import .bk: tạo mới 1 (tổng 1 khách hàng)"` — đây là thành công thật, nhưng khách hàng được tạo là **Nguyễn Hoàng Quân**, không phải Trần Bảo Thạch.

---

## Possible Secondary Issues (cần xác nhận)

1. **User chọn nhầm file** — BK file từ lần import 1:18 AM ngày 16/3 không phải file của Trần Bảo Thạch.
2. **Bộ lọc danh sách** — `GET /api/customers` dùng filter `?type=individual|corporate`. Nếu UI đang lọc và Nguyễn Hoàng Quân được tạo nhưng type không khớp filter → cũng có thể "không thấy".
3. **Import từ mapping page (AiMappingModal)** — nếu user import từ trang mapping thay vì customers, flow khác: không gọi `from-draft`, chỉ áp values vào form hiện tại, **không lưu DB**.

---

## Recommendations

1. **Ngay lập tức**: Kiểm tra lại file BK đúng của Trần Bảo Thạch, import lại.
2. **UX fix**: Success message nên hiển thị tên khách hàng vừa tạo/cập nhật để tránh nhầm lẫn, ví dụ: `"Đã tạo: Nguyễn Hoàng Quân"`.
3. **Validation**: Có thể thêm preview danh sách tên khách hàng sẽ được import trước khi confirm.

---

## Unresolved Questions

- File BK đúng của Trần Bảo Thạch là file nào? Đã được tạo chưa?
- User import từ trang nào (customers page hay mapping page)? Nếu từ mapping page thì import chỉ điền form, không lưu DB.
