# Phase 2: Validate Loan↔Plan Method Mismatch (P1)

## Priority: P1 HIGH | Effort: S | Status: pending

## Context

`Loan.loan_method` và `LoanPlan.loan_method` có thể mismatch khi link qua `loanPlanId`. Xuất report sẽ lệch template. Xem [loan contract §5.6](../../docs/contracts/loan-and-plan.contract.md).

## Files to modify

| File | Change |
|---|---|
| `src/services/loan.service.ts` | Validate mismatch trong `updateLoan()` khi `loanPlanId` thay đổi |

## Implementation

Trong `updateLoan()`, khi input chứa `loanPlanId`:

```ts
if (input.loanPlanId) {
  const plan = await prisma.loanPlan.findUnique({ where: { id: input.loanPlanId }, select: { loan_method: true } });
  if (plan && loan.loan_method && plan.loan_method !== loan.loan_method) {
    throw new ValidationError(`LoanPlan method (${plan.loan_method}) mismatch với Loan method (${loan.loan_method})`);
  }
}
```

## Success Criteria

- PATCH `/api/loans/[id]` với `loanPlanId` của plan khác method → 400 error message rõ
- Happy path: cùng method → link thành công
- Remove `⚠️` khỏi loan contract §5.6
