## Phase 6: Loan Plan Builder — DB + Service + API

**Priority:** P1 | **Status:** done | **Effort:** 6h | **Depends:** Phase 1

### Context
- LoanPlanTemplate + LoanPlan models from Phase 1
- 6 PA categories identified from 35 real files
- Common formula set across all types

### Architecture

```
LoanPlanTemplate (seeded, read-mostly)
  -> cost_items_template_json: [{ name, unit, default_price, category }]
  -> revenue_template_json: [{ description, formula_type }]
  -> defaults_json: { interest_rate, tax_rate, loan_term_months }

LoanPlan (per customer, user-editable)
  -> cost_items_json: [{ name, unit, qty, price, amount }]
  -> revenue_items_json: [{ description, qty, price, amount }]
  -> financials_json: { totalCost, revenue, profit, loanAmount, counterpartCapital, interest }
```

### Service: `src/services/loan-plan.service.ts` (new)

```ts
// Core operations
listTemplates(category?: string): Promise<LoanPlanTemplate[]>
getTemplate(id: string): Promise<LoanPlanTemplate>
createPlanFromTemplate(customerId, templateId, overrides?): Promise<LoanPlan>
updatePlan(id, data): Promise<LoanPlan>
deletePlan(id): Promise<void>
listPlansForCustomer(customerId): Promise<LoanPlan[]>
getPlan(id): Promise<LoanPlan>

// Calculation engine
recalculate(plan): LoanPlanFinancials
```

### Calculation Engine: `src/lib/loan-plan/loan-plan-calculator.ts` (new)

Common formulas (all types):
```ts
totalDirectCost = sum(cost_items.amount)
interest = loanAmount * rate * (months / 12)
totalCost = totalDirectCost + interest + tax
profit = revenue - totalCost
counterpartCapital = totalNeed - loanAmount
```

Category-specific revenue calculations:
- **nong_nghiep**: yield_per_ha * area * price_per_unit
- **kinh_doanh**: product_count * margin * days_per_month * 12
- **chan_nuoi**: head_count * weight * price_per_kg
- **an_uong**: capacity * avg_ticket * days * occupancy_rate
- **xay_dung**: monthly_income * 12 (income-based)
- **han_muc**: turnover_cycles * capital * margin - wastage

### API Routes

```
GET    /api/loan-plans/templates          — list templates
GET    /api/loan-plans/templates/[id]     — get template
POST   /api/loan-plans                    — create plan from template
GET    /api/loan-plans?customerId=xxx     — list plans for customer
GET    /api/loan-plans/[id]               — get plan
PUT    /api/loan-plans/[id]               — update plan (recalculates)
DELETE /api/loan-plans/[id]               — delete plan
```

### Related Files (new)
- `src/services/loan-plan.service.ts`
- `src/lib/loan-plan/loan-plan-calculator.ts`
- `src/lib/loan-plan/loan-plan-types.ts`
- `src/app/api/loan-plans/route.ts`
- `src/app/api/loan-plans/[id]/route.ts`
- `src/app/api/loan-plans/templates/route.ts`
- `src/app/api/loan-plans/templates/[id]/route.ts`

### Success Criteria
- CRUD for loan plans works via API
- Recalculation produces correct financials
- Template -> Plan creation pre-fills cost items with defaults
- All 6 category formulas implemented
