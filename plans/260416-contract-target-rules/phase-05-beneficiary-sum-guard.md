# Phase 5: Beneficiary Sum Guard + Concurrency (P1)

## Priority: P1 | Effort: M | Status: pending

## Context

Gộp backlog #5 + #6:
- `sum(DisbursementBeneficiary.amount) ≤ Disbursement.amount` — chưa enforce
- 2 editors cùng thêm beneficiary → sum vượt limit giữa 2 lần validate

Xem [disbursement contract §4.1, §4.5](../../docs/contracts/disbursement-and-beneficiary.contract.md).

## Files to modify

| File | Change |
|---|---|
| `src/services/disbursement.service.ts` hoặc beneficiary handler | Wrap create/update beneficiary trong `$transaction` + re-validate sum |

## Implementation

```ts
async function addBeneficiaryLine(disbursementId: string, input: { amount: number; ... }) {
  return prisma.$transaction(async (tx) => {
    // Re-read sum trong transaction scope (optimistic)
    const agg = await tx.disbursementBeneficiary.aggregate({
      where: { disbursementId },
      _sum: { amount: true },
    });
    const currentSum = agg._sum.amount ?? 0;

    const disbursement = await tx.disbursement.findUniqueOrThrow({
      where: { id: disbursementId },
      select: { amount: true },
    });

    if (currentSum + input.amount > disbursement.amount) {
      throw new ValidationError(
        `Tổng phân bổ (${currentSum + input.amount}) vượt số tiền giải ngân (${disbursement.amount})`
      );
    }

    return tx.disbursementBeneficiary.create({ data: { disbursementId, ...input } });
  });
}
```

Tương tự cho update beneficiary amount: `newSum = currentSum - oldAmount + newAmount`.

## Why transaction

Nếu chỉ validate ngoài transaction:
1. Editor A reads sum = 800, disbursement = 1000, adding 150 → 950 ≤ 1000 ✅
2. Editor B reads sum = 800, adding 300 → 1100... nhưng B đọc trước A commit → pass!
3. Cả 2 commit → sum = 1250 > 1000 ❌

Transaction đảm bảo step 1-3 atomic — B sẽ thấy sum = 950 (sau A) → reject.

## Success Criteria

- Tạo beneficiary khiến tổng > disbursement.amount → 400 error
- Update beneficiary amount → re-validate sum mới
- 2 concurrent requests không cùng pass nếu tổng vượt
- Remove `⚠️` khỏi disbursement contract §4.1 + §4.5
