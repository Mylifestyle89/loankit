# Phase 2: Loan + LoanPlan Contract

## Priority: HIGH | Effort: M | Status: pending

## Goal

Contract cho Loan + LoanPlan. Gộp vì 2 modules linked chặt (loan.loanPlanId → loan_plan.id).

## Files to scout

- `prisma/schema.prisma` — Loan, LoanPlan models
- `src/services/loan.service.ts`
- `src/services/loan-plan.service.ts`
- `src/lib/loan-plan/loan-plan-constants.ts` (METHOD_OPTIONS, labels)
- `src/lib/loan-plan/loan-plan-schemas.ts` (LOAN_METHODS, Zod)
- `src/app/api/loans/**`
- `src/app/api/loan-plans/**`

## Sections

### Purpose
Loan = hợp đồng tín dụng thực tế. LoanPlan = phương án vay vốn (có thể chưa ký HĐ). Loan có thể link tới LoanPlan.

### Entities

```
Loan
  ├── belongs to → Customer
  ├── belongs to → LoanPlan (optional, via loanPlanId)
  ├── has many → Disbursement
  ├── has many → Beneficiary
  └── selectedCollateralIds (JSON string array)

LoanPlan
  ├── belongs to → Customer
  ├── belongs to → LoanPlanTemplate (optional)
  ├── has many → Loan (reverse)
  └── financials_json (JSON blob for extended fields)
```

### loan_method enum

`tung_lan | han_muc | trung_dai | tieu_dung | cam_co | the_loc_viet`

List impact của từng method (template filtering, UI conditional, validation).

### States
- Loan: `active | completed | cancelled`
- LoanPlan: `draft | approved`

### Business Rules

- `contractNumber` NOT unique (drop constraint đã làm)
- `loan_method = "the_loc_viet"` → conditional UI hide disbursement/beneficiary/invoice
- `financials_json` schema: Zod `LoanPlanFinancialsExtended`, phải sync 4 nơi khi thêm field (types/zod/whitelist/editor)
- `selectedCollateralIds` empty → dùng TẤT CẢ collaterals khi xuất report
- `loanPlanId` FK nullable, onDelete SetNull

### Validation
- `src/lib/loan-plan/loan-plan-schemas.ts` (createPlanSchema, updatePlanSchema, LOAN_METHODS)
- `src/app/api/loans/route.ts` (Zod inline)

### API
GET/POST/PATCH/DELETE `/api/loans`, `/api/loans/[id]`, `/api/loans/[id]/disbursements`
GET/POST/PATCH/DELETE `/api/loan-plans`, `/api/loan-plans/[id]`

### Edge Cases

- Thẻ Lộc Việt: loan thiếu purpose/disbursementCount/lending_method — UI ẩn
- Extended fields persist qua `financials_json` — must verify Zod whitelist
- Loan amount = credit limit cho thẻ tín dụng
- noClone flag cho multi-collateral loop

### Open Questions

- LoanPlan có nên tách separate vào KHCN-only vs KHDN-only?
- Loan.amount type: Decimal vs Float (hiện Float)

## Output

`docs/contracts/loan-and-plan.contract.md` (~200 lines)
