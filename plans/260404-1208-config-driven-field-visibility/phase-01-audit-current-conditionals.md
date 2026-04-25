# Phase 01: Audit Current Conditionals

## Context
- [Brainstorm report](../reports/brainstorm-260404-1208-frappe-features-adapt.md)
- Key files: `src/app/report/customers/[id]/components/customer-info-form.tsx`, `src/components/customers/customer-new-form.tsx`, `src/components/customers/customer-detail-view.tsx`

## Overview
- **Priority:** P1
- **Status:** pending
- **Description:** Catalog all hardcoded field visibility conditionals across the codebase

## Key Findings (Pre-audit)

### 1. `customer-info-form.tsx` (lines 134-247)
4 conditional blocks based on `form.customer_type`:
- **L134:** `=== "individual"` -> Scan tai lieu button
- **L153-175:** `=== "corporate"` -> 5 fields: main_business, charter_capital, legal_representative_name, legal_representative_title, organization_type
- **L177-246:** `=== "individual"` -> 10 fields: gender, cccd, date_of_birth, cccd_issued_date, cccd_issued_place, cccd_old, phone, bank_account, bank_name, cic_product_name, cic_product_code

### 2. `customer-new-form.tsx` (lines 57-170)
3 conditional blocks:
- **L57:** Submit payload differs per type (corporate vs individual fields)
- **L125-148:** `=== "corporate"` -> 5 fields: main_business, charter_capital, legal_rep_name, legal_rep_title, organization_type
- **L151-169:** `=== "individual"` -> 4 fields: cccd, cccd_old, date_of_birth, phone

### 3. `customer-detail-view.tsx` (lines 85-342)
8 usages of `isIndividual` -- mostly UI routing/tab logic, NOT field visibility:
- **L85-86:** Tab array selection
- **L178:** Tab redirect for KHCN
- **L249, 260:** Label text
- **L287, 306:** Section conditional rendering (credit, loans tabs for corporate)
- **L342:** Template section (KhcnDocChecklist vs CustomerTemplatesSection)

### 4. `customer-detail-tabs-config.ts`
Already config-driven -- separate `corporateTabs` / `individualTabs` arrays. Could be merged into visibility config but low ROI.

### 5. `loan-plan [planId]/page.tsx`
7x `loanMethod === "trung_dai"` -- controls section visibility + calculation logic. Mixed concerns (not just visibility). **Skip for Phase 1.**

### 6. `collateral-config.ts`
`GTCG_ONLY_KEYS` set for subtype fields. Already config-driven pattern. **No change needed.**

## Refactor Candidates (Priority Order)

| Priority | File | Fields to Extract | Impact |
|----------|------|-------------------|--------|
| **HIGH** | `customer-info-form.tsx` | 15 fields (corporate: 5, individual: 10+) | Most dense, most benefit |
| **MED** | `customer-new-form.tsx` | 9 fields (corporate: 5, individual: 4) | Similar pattern, easy win |
| **LOW** | `customer-detail-view.tsx` | Tabs/sections | Tab logic is not field-level; leave as-is |
| **SKIP** | Loan plan page | trung_dai sections | Calculation-coupled, different pattern |

## Implementation Notes
- `customer-info-form.tsx` and `customer-new-form.tsx` share the SAME field set (corporate/individual) -- perfect DRY candidate
- The config should define field groups: `customer.corporate_fields`, `customer.individual_fields`
- Scan button visibility (`individual` only) can also be in config

## Todo
- [x] Grep all `customer_type ===` / `isIndividual` / `loanMethod ===` in `src/`
- [x] Categorize: field visibility vs UI routing vs calculation
- [x] Identify refactor candidates and priority
- [ ] Verify no other forms have similar patterns (check for `han_muc` conditionals)

## Success Criteria
- Complete inventory of all conditionals with file:line references
- Clear priority list of what to refactor vs skip
- No missed conditionals in customer form components
