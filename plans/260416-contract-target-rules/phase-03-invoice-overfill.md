# Phase 3: Invoice Over-fill Guard (P1)

## Priority: P1 HIGH | Effort: S | Status: pending

## Context

Upload invoice khiến `totalInvoiceAmount > beneficiary.amount` → data inconsistent, report sai. Hiện `recalcBeneficiaryStatus()` chỉ recalc, không reject. Xem [invoice contract §4.8](../../docs/contracts/invoice.contract.md).

## Files to modify

| File | Change |
|---|---|
| `src/services/invoice-crud.service.ts` | Add validation trước `prisma.invoice.create` |

## Implementation

Trong `createInvoice()`, trước insert:

```ts
if (input.disbursementBeneficiaryId) {
  const bene = await prisma.disbursementBeneficiary.findUnique({
    where: { id: input.disbursementBeneficiaryId },
    select: { amount: true, invoiceAmount: true },
  });
  if (bene && bene.invoiceAmount + input.amount > bene.amount) {
    throw new ValidationError(
      `Tổng hóa đơn (${bene.invoiceAmount + input.amount}) vượt số tiền phân bổ (${bene.amount})`
    );
  }
}
```

## Success Criteria

- POST `/api/invoices` với amount vượt remaining → 400 error rõ ràng
- Happy path: tổng ≤ amount → create OK
- Remove `⚠️ NOT YET IMPLEMENTED` khỏi invoice contract §4.8
- Remove `⚠️ NOT YET ENFORCED` khỏi invoice contract §8 edge case
