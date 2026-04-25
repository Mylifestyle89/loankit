# Phase 1: Filter hóa đơn bảng kê khỏi danh sách theo dõi

## Priority: High | Status: ⬜

## Vấn đề
Khi tạo giải ngân với beneficiary `invoiceStatus = "bang_ke"`, hệ thống tạo real Invoice records (số HĐ "BK-1") → vẫn hiển thị trong màn hình Hóa đơn dù không cần theo dõi.

## Giải pháp
Filter `listAll()` loại trừ invoice có beneficiary `invoiceStatus = "bang_ke"`.
Cũng loại trừ khỏi summary stats.

## Related Files
- `src/services/invoice.service.ts:66-111` — listAll()
- `src/services/invoice.service.ts:297-369` — getCustomerSummary()
- `src/app/api/invoices/summary/route.ts` — summary endpoint

## Implementation Steps

### 1. Update `listAll()` trong invoice.service.ts

Dòng 89-96, thêm filter vào Prisma query:

```typescript
// Exclude invoices from bang_ke beneficiary lines
const realInvoices = await prisma.invoice.findMany({
  where: {
    ...where,
    ...customerWhere,
    // NEW: exclude bang_ke invoices
    disbursementBeneficiary: {
      OR: [
        { invoiceStatus: { not: "bang_ke" } },
        { is: null }, // invoices without beneficiary link
      ],
    },
  },
  // ... rest unchanged
});
```

### 2. Update `getCustomerSummary()` trong invoice.service.ts

Thêm cùng filter vào query đếm invoice.

### 3. Verify

- Hóa đơn BK-1 (Củ ly, Cà phê...) không còn hiển thị
- Hóa đơn thường (1706, 3135...) vẫn hiển thị bình thường
- Summary stats không đếm hóa đơn bảng kê

## Todo
- [ ] Update `listAll()` filter
- [ ] Update `getCustomerSummary()` filter
- [ ] Compile check
- [ ] Manual verify
