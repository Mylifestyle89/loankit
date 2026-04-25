# Phase 01 — DB Schema + Migration

## Overview
Thêm `loanPlanId` nullable vào Loan model. Backward compat: existing loans giữ null.

## Changes

### 1. `prisma/schema.prisma`

Thêm vào Loan model:
```prisma
model Loan {
  // ... existing fields ...
  loanPlanId   String?    // FK → LoanPlan (nullable)
  loanPlan     LoanPlan?  @relation(fields: [loanPlanId], references: [id], onDelete: SetNull)
}
```

Thêm vào LoanPlan model:
```prisma
model LoanPlan {
  // ... existing fields ...
  loans  Loan[]
}
```

### 2. Migration
```bash
npx prisma migrate dev --name add_loan_plan_id_to_loan
```

Kết quả: cột `loanPlanId TEXT NULL` trên bảng `Loan`.

### 3. `src/app/api/loans/route.ts` — POST handler

Thêm `loanPlanId` vào zod schema:
```ts
const createSchema = z.object({
  // ... existing ...
  loanPlanId: z.string().optional().nullable(),
});
```

Truyền vào `prisma.loan.create`:
```ts
data: {
  // ... existing ...
  loanPlanId: loanPlanId ?? null,
}
```

## Todo

- [ ] Thêm `loanPlanId` + relation vào Loan trong schema.prisma
- [ ] Thêm `loans Loan[]` vào LoanPlan trong schema.prisma
- [ ] Chạy `npx prisma migrate dev --name add_loan_plan_id_to_loan`
- [ ] Thêm `loanPlanId` vào zod schema trong `/api/loans/route.ts`
- [ ] Truyền `loanPlanId` vào `prisma.loan.create`
- [ ] Run `npx prisma generate`

## Risks
- SQLite: nullable column migration không cần DOWN migration
- Không ảnh hưởng existing data (null by default)
