# Phase 04 — Cleanup + loanPlanId trong form/API

## Overview
Lưu loanPlanId khi submit loan form. Xóa button "Phương án vay vốn" khỏi loan-detail-header.

## 1. `src/app/report/loans/new/page.tsx` — lưu loanPlanId khi submit

New loan form đã đọc `?planId` để auto-fill (lines 39-52). Cần thêm:
- Đọc `planId` từ searchParams và lưu vào state
- Gửi `loanPlanId: planId` khi POST

```ts
// Thêm state
const [loanPlanId] = useState(searchParams.get("planId") ?? null);

// Trong handleSubmit — thêm vào payload
const payload = {
  // ... existing fields ...
  loanPlanId: loanPlanId ?? undefined,
};
```

## 2. `src/app/report/loans/[id]/components/loan-detail-header.tsx` — xóa button

Xóa block lines 59-65:
```tsx
// XÓA TOÀN BỘ BLOCK NÀY:
{loan.customer?.id && (
  <Link
    href={`/report/customers/${loan.customer.id}/loan-plans`}
    className="..."
  >
    Phương án vay vốn
  </Link>
)}
```

**Optional — thay thế bằng badge "Từ phương án":**
Nếu `loan.loanPlanId` tồn tại, hiện badge nhỏ thay vì button:
```tsx
{loan.loanPlan && (
  <span className="text-xs text-zinc-500 border rounded px-2 py-0.5">
    PA: {loan.loanPlan.name}
  </span>
)}
```
→ Cần include `loanPlan { name }` trong loan query của detail page.

## 3. Kiểm tra loan detail page có include loanPlan không

File: `src/app/report/loans/[id]/page.tsx` hoặc service tương đương.
Nếu muốn hiện badge, thêm vào Prisma include:
```ts
include: {
  loanPlan: { select: { id: true, name: true } },
  // ... existing includes ...
}
```

## Todo

- [ ] Thêm `loanPlanId` vào state + payload trong `loans/new/page.tsx`
- [ ] Xóa button "Phương án vay vốn" khỏi `loan-detail-header.tsx`
- [ ] (Optional) Thêm badge "PA: {name}" nếu loan có loanPlanId
- [ ] Nếu có badge: thêm `loanPlan` vào include query của loan detail
- [ ] Verify: tạo loan có chọn plan → `loanPlanId` được lưu đúng trong DB
- [ ] Verify: loan detail header không còn button "Phương án vay vốn"

## Success Criteria
- Tạo loan từ plan: DB có `loanPlanId` đúng
- Tạo loan không có plan: DB có `loanPlanId = null`
- Tab "Phương án" hiển thị trên Customer detail
- Không còn button "Phương án vay vốn" trong loan header
- Modal mở khi click "Thêm khoản vay"
