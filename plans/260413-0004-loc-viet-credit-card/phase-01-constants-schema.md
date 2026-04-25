# Phase 1: Constants + Schema

## Priority: HIGH | Status: pending

## Overview

Thêm `the_loc_viet` vào tất cả nơi define loan methods.

## Files to modify

### 1. `src/lib/loan-plan/loan-plan-constants.ts`

```ts
// METHOD_OPTIONS — thêm entry mới
{ value: "the_loc_viet", label: "Thẻ tín dụng Lộc Việt" },

// METHOD_LABELS
the_loc_viet: "Thẻ tín dụng Lộc Việt",

// METHOD_SHORT_LABELS
the_loc_viet: "Thẻ Lộc Việt",
```

### 2. `src/lib/loan-plan/loan-plan-schemas.ts`

```ts
export const LOAN_METHODS = ["tung_lan", "han_muc", "trung_dai", "tieu_dung", "the_loc_viet"] as const;
```

Zod enum auto-derives từ `LOAN_METHODS` → không cần sửa thêm.

### 3. `prisma/schema.prisma` — comment update only

```prisma
loan_method String @default("tung_lan") // tung_lan | han_muc | trung_dai | tieu_dung | the_loc_viet
```

Cả 2 models `Loan` và `LoanPlan` đều cần update comment.

**No migration needed** — `loan_method` is a free-text String, not an enum column.

## Success Criteria

- TypeScript compiles without error
- `the_loc_viet` appears in METHOD_OPTIONS dropdown
- Zod validates `the_loc_viet` as valid loan method
