# Phase 2: Types + Schema + Whitelist

## Overview
- **Priority:** P1
- **Status:** pending
- **Effort:** 1h
- **Depends on:** Phase 1

Extend data model: 2 types rieng cho 2 bang (agriculture items, business rows), sync qua 4 nơi: types / zod / whitelist / editor type (theo feedback memory).

## Key Insights

- Bat buoc sync 4 noi — thieu zod se silent strip khi save
- `financials_json` la JSON string -> khong can migration Prisma
- Group header (I/II/III) dung flag `isGroupHeader: boolean` — backward compat voi item thuong

## Related Code Files

### Modify
- src/lib/loan-plan/loan-plan-types.ts — them 2 types + fields extended
- src/lib/loan-plan/loan-plan-schemas.ts — zod schema cho 2 types + 3 fields moi
- src/services/loan-plan.service.ts — them keys vao `EXTENDED_FINANCIAL_KEYS`
- src/app/report/customers/[id]/loan-plans/[planId]/loan-plan-editor-types.ts — expose form type

## Implementation Steps

### 1. Types (loan-plan-types.ts)

```typescript
export type AgricultureItem = {
  order?: string;              // "I", "1", "-", ...
  name: string;
  unit?: string;               // DVT
  unitPrice?: number;          // Don gia
  quantity?: number;           // So luong
  amount: number;              // Thanh tien
  isGroupHeader?: boolean;
};

export type BusinessRevenueRow = {
  order?: string;
  name: string;                // Nhom hang / Mat hang
  quantity?: number;
  importValue?: number;        // Gia tri nhap
  revenue?: number;            // Doanh thu
  isGroupHeader?: boolean;
};

// Them vao LoanPlanFinancialsExtended:
agriculture_items?: AgricultureItem[];
agriculture_living_expenses_annual?: number; // Chi phi sinh hoat BQ/nam
// agriculture totals (cost, revenue, profit) derived in builder from items[] — NOT persisted

business_rows?: BusinessRevenueRow[];
business_other_costs_annual?: number;  // Chi phi mat bang/nhan cong/thue /nam
business_living_expenses_monthly?: number; // Chi phi sinh hoat/thang
// business totals (import, revenue, gross_profit) derived in builder from rows[] — NOT persisted

// Shared — text mo ta dac thu ho so (Q3 decision: user nhap tay)
repayment_narrative?: string; // VD: "Tu loi nhuan hoat dong trong Cat tuong tren 7 sao..."
```

### 2. Zod schemas (loan-plan-schemas.ts)

```typescript
export const agricultureItemSchema = z.object({
  order: z.string().optional(),
  name: z.string(),
  unit: z.string().optional(),
  unitPrice: z.number().optional(),
  quantity: z.number().optional(),
  amount: z.number(),
  isGroupHeader: z.boolean().optional(),
});

export const businessRevenueRowSchema = z.object({
  order: z.string().optional(),
  name: z.string(),
  quantity: z.number().optional(),
  importValue: z.number().optional(),
  revenue: z.number().optional(),
  isGroupHeader: z.boolean().optional(),
});

// Them vao extended financials schema:
agriculture_items: z.array(agricultureItemSchema).optional(),
agriculture_living_expenses_annual: z.number().optional(),
// agriculture_total_cost / total_revenue / profit — NOT persisted, derived in builder

business_rows: z.array(businessRevenueRowSchema).optional(),
business_other_costs_annual: z.number().optional(),
business_living_expenses_monthly: z.number().optional(),
// business_total_import / total_revenue / gross_profit_annual — NOT persisted, derived in builder

repayment_narrative: z.string().optional(),
```

### 3. Whitelist (loan-plan.service.ts)

Them vao `EXTENDED_FINANCIAL_KEYS`:
```typescript
"agriculture_items", "agriculture_living_expenses_annual",
"business_rows", "business_other_costs_annual", "business_living_expenses_monthly",
"repayment_narrative",
```
// 6 derived-only fields (total_cost, total_revenue, profit, total_import, total_revenue_biz, gross_profit_annual) NOT added to whitelist

### 4. Editor type (loan-plan-editor-types.ts)
Ensure fields moi accessible tu form — thuong chi add vao type `LoanPlanEditorFinancials` (extend tu LoanPlanFinancialsExtended).

## Todo List
- [ ] Them 2 types (AgricultureItem, BusinessRevenueRow)
- [ ] Them 5 flat fields + `repayment_narrative` vao `LoanPlanFinancialsExtended` (khong them 6 derived fields)
- [ ] Add zod schemas (2 object + 6 field)
- [ ] Extend `EXTENDED_FINANCIAL_KEYS` array (6 keys moi)
- [ ] Expose qua `LoanPlanEditorFinancials` trong `loan-plan-editor-types.ts` [4th sync location]
- [ ] Compile check toan project

## Success Criteria
- TypeScript compile pass
- Save 1 plan voi data business -> reload -> fields persist (khong bi zod strip)
- Save 1 plan voi data agriculture -> reload -> items[] persist

## Risk Mitigation
- Forget 1 trong 4 noi -> silent strip. Test manual: save + reload ngay sau thay doi.

## Unresolved Questions
- Co nen compute `total_cost`, `total_revenue`, `profit` tu items[] (auto) hay user nhap tay?
  -> De xuat: auto-compute khi items change, nhung cho phep user override (store field rieng)
