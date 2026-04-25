# Phase 03 — Tab "Phương án" trên Customer Detail

## Overview
Thêm tab "Phương án" vào tabs config cho cả KHCN và KHDN. Tab trỏ vào trang loan-plans đã có sẵn.

## File: `src/components/customers/customer-detail-tabs-config.ts`

### Hiện tại
```ts
// KHCN (individual)
{ key: "loans-credit", label: "Khoản vay & Tín dụng" },
{ key: "collateral", label: "TSBĐ" },

// KHDN (corporate)
{ key: "loans", label: "Khoản vay" },
{ key: "collateral", label: "TSBĐ" },
```

### Sau khi thêm
```ts
// KHCN (individual)
{ key: "loans-credit", label: "Khoản vay & Tín dụng" },
{ key: "loan-plans", label: "Phương án vay vốn" },   // ← NEW
{ key: "collateral", label: "TSBĐ" },

// KHDN (corporate)
{ key: "loans", label: "Khoản vay" },
{ key: "loan-plans", label: "Phương án vay vốn" },   // ← NEW
{ key: "collateral", label: "TSBĐ" },
```

## Cần kiểm tra: CustomerDetailView render tab content

Tìm trong `customer-detail-view.tsx` (hoặc tương đương) nơi tab key được map sang component.
Cần thêm case `"loan-plans"` → render trang loan-plans hoặc embed component.

**Hai hướng tiếp cận:**

**A — Link tab (đơn giản hơn):**
Tab "Phương án" là external link đến `/report/customers/{id}/loan-plans`.
Không cần embed component. Nếu tab system hỗ trợ `href`, dùng luôn.

**B — Embedded tab:**
Tab render nội dung `/loan-plans/page.tsx` inline.
Phức tạp hơn, cần extract LoanPlansPage thành importable component.

→ **Recommend A** nếu tab config hỗ trợ href. Kiểm tra tab render logic trước.

## Todo

- [ ] Đọc `customer-detail-tabs-config.ts` để hiểu format đầy đủ
- [ ] Đọc `customer-detail-view.tsx` để hiểu cách tab key → component render
- [ ] Quyết định: link tab vs embedded tab
- [ ] Thêm `{ key: "loan-plans", label: "Phương án vay vốn" }` vào cả KHCN + KHDN arrays
- [ ] Nếu embedded: extract `LoanPlansList` từ loan-plans page thành component riêng
- [ ] Nếu link: thêm `href` property vào tab entry (nếu chưa có, add vào type)
- [ ] Verify tab hiển thị đúng trên UI cho cả hai loại khách hàng
