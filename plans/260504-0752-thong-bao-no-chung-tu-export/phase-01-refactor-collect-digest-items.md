# Phase 01 — Refactor `collectDigestItems` pure query

## Context Links

- Scout: [`plans/reports/scout-260504-0752-thong-bao-no-chung-tu-export.md`](../reports/scout-260504-0752-thong-bao-no-chung-tu-export.md)
- File hiện tại: `src/lib/notifications/deadline-check-logic.ts` (262 lines — sẽ vượt 200 sau refactor → tách helper file).

## Overview

- Priority: P2 — nền tảng cho Phase 02/03.
- Status: pending.
- Tách logic scan invoice + beneficiary thành hàm pure trả `Map<customerId, { customer, items }>`. `runDeadlineCheck()` giữ nguyên behavior cũ (cron không đổi).

## Key Insights

- `InvoiceDigestItem` type đã có sẵn trong `email.service.ts` — dùng lại.
- Logic supplement (`addOneMonthClamped`) phải được include vào `collectDigestItems`.
- `notifiedSet` (dedup 24h) chỉ áp dụng khi tạo notification → KHÔNG dùng trong `collectDigestItems` (export muốn full snapshot, không phụ thuộc lịch sử notify).
- Customer không có email vẫn phải xuất hiện trong export (chỉ skip ở email digest).

## Requirements

- Functional: hàm `collectDigestItems(opts?)` trả group theo customerId.
  - `opts.customerIds?: string[]` → filter Prisma where.
  - `opts.types?: Array<"overdue"|"dueSoon"|"supplement">` (default: all 3).
- Non-functional: cron behavior không đổi (regression test: chạy `runDeadlineCheck` nội bộ vẫn dedup, tạo notif, gửi mail giống trước).

## Architecture

```
runDeadlineCheck()
  ├─ collectDigestItems({ customerIds?, types? })  ← NEW pure query
  │     ├─ scanRealDueSoon
  │     ├─ scanRealOverdue (sau khi markOverdue)
  │     └─ scanSupplement
  ├─ apply notifiedSet dedup
  ├─ create AppNotification per item
  └─ send digest email per customer
```

`collectDigestItems` trả:
```ts
type DigestCustomerGroup = {
  customer: { id: string; customer_name: string; email: string | null };
  items: InvoiceDigestItem[];
};
type DigestSnapshot = Map<string /* customerId */, DigestCustomerGroup>;
```

## Related Code Files

- Modify: `src/lib/notifications/deadline-check-logic.ts`
- Create (nếu file vượt 200 line sau refactor): `src/lib/notifications/collect-digest-items.ts`
- Test reference (no test required for now): `src/app/api/cron/invoice-deadlines/route.ts` — không thay đổi.

## Implementation Steps

1. Trong `deadline-check-logic.ts`, tạo hàm exported `collectDigestItems(opts?: { customerIds?: string[]; types?: Array<"overdue"|"dueSoon"|"supplement"> }): Promise<DigestSnapshot>`.
2. Di chuyển 3 query block (dueSoon real, overdue real sau `markOverdue`, supplement) vào hàm này.
   - Lưu ý: `markOverdue()` có side-effect (update status). Đặt `markOverdue` outside `collectDigestItems` — chỉ gọi từ `runDeadlineCheck`. `collectDigestItems` query `status = "overdue"` đã đủ snapshot.
3. Refactor `runDeadlineCheck`:
   - Gọi `markOverdue()` trước.
   - Gọi `collectDigestItems()` (no opts).
   - Loop snapshot → áp `notifiedSet` dedup → tạo notification → push vào email bucket → gửi digest.
4. Nếu file vượt 200 lines, tách `collectDigestItems` + helper `scanSupplement` ra `src/lib/notifications/collect-digest-items.ts`, re-export từ `deadline-check-logic.ts`.
5. Export type `DigestCustomerGroup`, `DigestSnapshot` từ module để Phase 02/03 import.
6. Run `npm run build` — verify no TS error, no behavior regression của cron route.

## Todo List

- [ ] Define `DigestCustomerGroup` + `DigestSnapshot` types
- [ ] Implement `collectDigestItems(opts)` pure query
- [ ] Refactor `runDeadlineCheck` dùng `collectDigestItems`
- [ ] Đảm bảo `markOverdue` chỉ gọi trong `runDeadlineCheck`
- [ ] Tách helper file nếu > 200 lines
- [ ] Export types public
- [ ] `npm run build` pass
- [ ] Manual smoke: trigger cron endpoint → notification + email vẫn đi như cũ

## Success Criteria

- `collectDigestItems()` không tạo `AppNotification`, không gửi email.
- `runDeadlineCheck()` output `DeadlineCheckResult` y nguyên trước/sau refactor.
- File ≤ 200 lines (hoặc đã tách module).

## Risk Assessment

- **Risk:** Đổi thứ tự markOverdue → collectDigestItems có thể bỏ sót invoice newly overdue. **Mitigation:** Gọi `markOverdue` TRƯỚC `collectDigestItems`.
- **Risk:** Snapshot không apply notifiedSet → caller export sẽ thấy item mà cron đã notify hôm nay (đúng intent — export là snapshot real-time, không phải log notification).

## Security Considerations

- `customer_name`, `email` đọc qua Prisma decryption middleware — không tự decrypt.
- Hàm pure không log PII (chỉ log count).

## Next Steps

- Phase 02 import `collectDigestItems` để build XLSX.
