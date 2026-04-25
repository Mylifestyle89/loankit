# Brainstorm: Frappe Lending Features Adaptation for Loankit

**Date:** 2026-04-04 | **Session:** Brainstorm Phase 1A + Full Feature Review + Opus Analysis

---

## Problem Statement

Evaluate 7 HIGH-PRIORITY features from Frappe Lending for adoption in Loankit (Agribank context).
Frappe Lending = Indian NBFC core banking. Loankit = Vietnamese document preparation tool.

## Key Discovery

**Loankit scope != Frappe Lending scope.**
- Loankit = tool to generate loan document packages (Word templates)
- Loankit does NOT track repayments, interest accrual, GL entries
- Most Frappe features solve problems Loankit doesn't have

## Feature Evaluation Results

| # | Feature | Fit | Decision | Rationale |
|---|---------|-----|----------|-----------|
| 0 | **Loan Product Master** | **High** | **ADOPT** | Opus insight: CBTD chọn sản phẩm thay vì nhập tay |
| 1 | Dynamic Field Visibility | **High** | **ADOPT** | Forms cluttered; config-driven, driven by product |
| 2 | Haircut/Max Lending Ratio | Low | SKIP | CBTD inputs manually; no auto-calc for MVP |
| 3 | Flexible Repayment | None | SKIP | Loankit doesn't track repayments |
| 4 | Moratorium | None | SKIP | Only needs text in template |
| 5 | Cost Center | None | SKIP | Loankit doesn't do accounting |
| 6 | Pledge/Unpledge | Low | SKIP | Only stores collateral info |
| 7 | Security Shortfall | None | SKIP | No real-time monitoring needed |

## Added from Opus Analysis: Loan Product Master

### Why
- Opus pointed out Frappe's 4-layer architecture: Master → Entity → Transaction → Process
- Loankit missing Master Data layer entirely
- CBTD currently inputs loan_method, interest rate, purpose manually each time
- With product master: select "Cho vay bổ sung VLĐ" → auto-fill rate, term, show relevant fields

### Design Decision
- **Storage:** DB table + Admin UI (user choice)
- **Seed data:** User will provide Agribank product list
- **Integration:** Field visibility driven by product (not just customer_type)

### Schema Draft
```
LoanProduct {
  id, code, name, customer_type, loan_method,
  max_interest_rate?, max_term_months?, description?
}
```

## Chosen Features (Final Scope)

### Feature A: Loan Product Master
- DB table `LoanProduct` with admin CRUD UI
- Seed with Agribank products (user provides list)
- Link to Loan + LoanPlan via `productId` FK
- Auto-fill fields on product selection

### Feature B: Config-Driven Field Visibility
- Config-driven lookup table (Medium level)
- Visibility rules driven by `product.loan_method` + `product.customer_type`
- React hook `useFieldVisibility(fieldKey, formData)`
- No expression parser (simple key-value match)

## Deferred (from Opus analysis)
- **Event Sourcing / Audit Trail:** Not needed for document prep tool (SKIP)
- **Loan Security Type Master:** Keep enum in collateral-config.ts (SKIP for MVP)

## Implementation Order
1. **Phase 0:** Loan Product Master (DB + Admin UI + seed)
2. **Phase 1:** Config-Driven Field Visibility (config + hook)
3. **Phase 2:** Form Integration (product selection → auto-fill + field visibility)

## Unresolved / Waiting
1. **BLOCKED:** User will provide Agribank product list for seed data
2. Which forms refactor first? (customer-info-form, loan-plan-form?)
3. Should visibility rules cover mandatory_depends_on?
4. Phase 3: Move config to DB for true admin self-service?

## Insights from Opus Worth Noting
- "Frappe focus dữ liệu tài chính, Loankit focus document management — bổ sung cho nhau"
- "Loankit giữ lợi thế riêng: AI OCR, chat-to-form, document checklist — Frappe không có"
- Event sourcing pattern noted for future (Phase 3+) when audit trail needed
