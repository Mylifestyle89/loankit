# Frappe Lending Feature Comparison & Loankit Implementation Analysis

**Report Date:** 2026-04-04 | **Author:** Researcher | **Scope:** HIGH-PRIORITY feature analysis for Loankit

---

## Executive Summary

Analyzed 7 HIGH-PRIORITY features from Frappe Lending against Loankit's current state. Key findings:

- **3 QUICK WINS** (flexible repayment, dynamic field visibility, collateral basics) = ~2-3 days
- **2 FOUNDATIONAL** (moratorium + interest calc, haircut valuation) = ~3-5 days (require robust math logic)
- **2 STRATEGIC** (cost center tracking, security shortfall monitoring) = 5+ days (accounting integration + real-time logic)

**Recommended Implementation Order:**
1. Dynamic Field Visibility (foundation for complex forms)
2. Flexible Repayment (core loan logic)
3. Haircut-based Collateral Valuation (master data + calc)
4. Moratorium & Broken Period Interest (interest engine)
5. Pledge/Unpledge Workflow (state management)
6. Security Shortfall Monitoring (real-time calculation)
7. Cost Center Tracking (accounting system)

---

## Feature Analysis Matrix

### 1. FLEXIBLE REPAYMENT (Fixed Amount vs. Fixed Tenure)

#### Current Loankit Approach
- **DB Level:** Loan model tracks `interestRate`, `startDate`, `endDate` (hardcoded tenure)
- **Loan Method:** `loan_method` enum (tung_lan|han_muc|trung_dai|tieu_dung) but NO repayment schedule generation
- **Missing:** Automated EMI calculation, amortization schedule, flexible tenure/amount switching
- **Current State:** Post-approval calculations only; no repayment tracking per disbursement

**Files Involved:**
- `prisma/schema.prisma` (Loan model, lines 159-220)
- `src/lib/loan-plan/loan-plan-calculator.ts` (financials only)
- `src/services/loan-plan.service.ts` (loan plan CRUD, no repayment logic)

#### How Frappe Implements It
- **Loan Product Configuration:** Repayment schedule type (Monthly, Weekly, Bi-weekly, Quarterly, One Time)
- **Repayment Schedule DocType:** Automated generation on disbursement
  - Generated table: `emi_amount`, `principal`, `interest`, `balance_amount`, `payable_amount`
  - Recalculates on advance/pre-payment
  - Supports 2 payment types: Advance (skip next EMI) vs. Pre-payment (allocate to principal)
- **Interest Calculation:** Defaults to simple daily interest accrual; configurable per loan product
- **Key Logic:** Disbursement triggers schedule generation; payment method triggers rescheduling

#### Implementation Complexity: **HIGH** (3-4 days)
- DB Changes: Add `repayment_schedule_type` enum to Loan; add RepaymentSchedule table (5+ fields)
- Logic: EMI calculation engine (simple + compound interest variants)
- Testing: Edge cases (advance vs. pre-payment, partial payments, schedule recalculation)
- Integration Points: Disbursement table (trigger schedule generation), Invoice table (link to schedule)

#### Effort Level & Risk
| Category | Assessment |
|----------|------------|
| Effort | **High** (3-4 days) |
| Risk | **Medium** – math errors in EMI calc can cascade |
| Priority | **HIGH** – core loan product feature |
| Quick Win | **No** – requires foundational changes |
| Strategic | **Yes** – enables all repayment tracking |

#### Dependencies
- Must complete BEFORE: Moratorium, Security Shortfall
- Requires: Interest calculation engine (see Moratorium feature)

#### Impact on Existing Code
- **Loan Model:** Add `repayment_schedule_type` field
- **Disbursement:** Trigger RepaymentSchedule creation on `status='active'`
- **Invoice:** Optionally link to RepaymentSchedule for reconciliation
- **Services:** New `repayment-schedule.service.ts` for CRUD + calculation

#### Data Migration Considerations
- Existing loans (no schedule): Backfill with default `repayment_schedule_type = "monthly"`
- Recalculate schedules for active disbursements

#### Gap Analysis
| Aspect | Loankit | Frappe | Gap |
|--------|---------|--------|-----|
| EMI Calculation | ❌ None | ✅ Automatic | Implement algo |
| Schedule Generation | ❌ Manual | ✅ Auto on disburse | Add trigger logic |
| Payment Rescheduling | ❌ None | ✅ Smart (advance vs prepay) | Implement payment classification |
| Frequency Options | ❌ Fixed `endDate` | ✅ 5+ types | Add enum to schema |
| Schedule Recalc | ❌ N/A | ✅ Per payment | Implement recalc engine |

---

### 2. MORATORIUM & BROKEN PERIOD INTEREST

#### Current Loankit Approach
- **DB Level:** Loan model: `startDate`, `endDate`, `interestRate` (no moratorium fields)
- **Interest Calc:** Simple annualized rate in loan-plan-calculator (no daily accrual)
- **Missing:** Moratorium period tracking, interest capitalization, EMI deferral, broken period interest

**Files Involved:**
- `prisma/schema.prisma` (Loan model, lines 159-220)
- `src/lib/loan-plan/loan-plan-calculator.ts` (basic revenue calc)

#### How Frappe Implements It
- **Moratorium Configuration:** Set at loan booking
  - **Type 1 (EMI):** Neither principal nor interest payable during moratorium
  - **Type 2 (Principal):** Interest-only, principal deferred
  - **Tenure Parameter:** Moratorium period (e.g., 3 months)
- **Interest Accrual:** Daily via background job
  - Amounts booked to "interest accrued" account (temporary)
  - Converted to demand on EMI generation
- **Broken Period Interest:** Calculate from disbursement date to first EMI date
  - Handled during repayment schedule generation
- **Interest Capitalization:** During restructure, pending accrued interest can be added to principal

#### Implementation Complexity: **HIGH** (3-5 days)
- DB Changes: Add `moratorium_type` (enum), `moratorium_period` (int), `moratorium_start_date` to Loan
- Logic: Daily interest accrual engine, capitalization logic
- Testing: Complex scenarios (multiple disbursements, mid-moratorium payment, restructure with capitalization)
- Integration: RepaymentSchedule (broken period calc), Accounting entries (if needed for P&L)

#### Effort Level & Risk
| Category | Assessment |
|----------|------------|
| Effort | **High** (3-5 days) |
| Risk | **High** – interest calc errors = revenue misstatement |
| Priority | **HIGH** – regulatory/compliance for moratoriums |
| Quick Win | **No** – requires robust math engine |
| Strategic | **Yes** – enables relief programs |

#### Dependencies
- Must complete AFTER: Flexible Repayment (RepaymentSchedule table needed)
- Requires: Interest accrual background job (cron-like)

#### Impact on Existing Code
- **Loan Model:** Add `moratorium_type`, `moratorium_period`, `moratorium_start_date`, `moratorium_end_date` (computed)
- **Disbursement:** Track disbursement date for broken period calc
- **RepaymentSchedule:** Adjust first EMI to account for broken period
- **Services:** New interest-accrual service or extend loan.service.ts
- **Cron Job:** Add `/api/cron/interest-accrual` for daily interest booking

#### Data Migration
- Existing loans: Set `moratorium_type = null` (no moratorium)
- Recalculate broken period for active loans

#### Gap Analysis
| Aspect | Loankit | Frappe | Gap |
|--------|---------|--------|-----|
| Moratorium Types | ❌ None | ✅ EMI + Principal | Implement both types |
| Moratorium Period | ❌ None | ✅ Configurable | Add date range tracking |
| Daily Interest Accrual | ❌ None | ✅ Background job | Implement cron + service |
| Broken Period Interest | ❌ None | ✅ Auto calc | Add to schedule gen |
| Interest Capitalization | ❌ None | ✅ During restructure | Implement for future restructure |
| Accrued Interest Tracking | ❌ None | ✅ GL entries | Defer (accounting integration) |

---

### 3. COST CENTER TRACKING

#### Current Loankit Approach
- **DB Level:** `Branch` model exists (name, address, code, tax_code)
- **Accounting:** No GL entries, no cost center concept
- **P&L Allocation:** Not implemented; no branch-level P&L

**Files Involved:**
- `prisma/schema.prisma` (Branch model, lines 557-577)
- No accounting service

#### How Frappe Implements It
- **Cost Center Master:** Standalone master data (hierarchical)
  - Maps to organizational structure (branch → cost center)
  - Used in GL entries to tag income/expense by profit center
- **Loan Integration:** Interest income allocated to loan's cost center
- **P&L Reporting:** Filter GL by cost center for branch-level P&L
- **Accounting Dimensions:** Cost center + Branch as additional GL posting dimensions

#### Implementation Complexity: **MEDIUM-LOW** (1-2 days if accounting not integrated)
- DB Changes: Add `cost_center_id` FK to Loan; create CostCenter master table
- Logic: Simple cost center assignment (no complex allocation)
- Testing: Verify cost center assignment on loan creation

#### Effort Level & Risk
| Category | Assessment |
|----------|------------|
| Effort | **Low-Medium** (1-2 days data model only) |
| Risk | **Low** – pure data organization |
| Priority | **MEDIUM** – useful for multi-branch P&L but not critical for core lending |
| Quick Win | **Yes** – if no GL integration required |
| Strategic | **No** – nice-to-have for later accounting system |

#### Dependencies
- Optional: Can defer until accounting system built

#### Current Loankit Scope Question
**Is multi-branch P&L reporting needed for MVP?**
- If single-branch only: Cost center can be deferred
- If multi-branch: Add basic cost center tracking now (no GL impact yet)

#### Recommendation
**DEFER** to Phase 2 (accounting integration). For now, Loankit uses `Branch` for organizational grouping; cost center is an accounting concept not needed for core lending logic.

#### Gap Analysis
| Aspect | Loankit | Frappe | Gap |
|--------|---------|--------|-----|
| Branch Structure | ✅ Branch table | ✅ Cost centers | Functional equivalent |
| Cost Center Master | ❌ None | ✅ Hierarchical master | Not needed yet |
| GL Integration | ❌ None | ✅ Tagged entries | Defer to accounting phase |
| P&L by Cost Center | ❌ None | ✅ GL filtering | Defer |

---

### 4. DYNAMIC FIELD VISIBILITY

#### Current Loankit Approach
- **Form Framework:** React components with hardcoded conditionals
  - Example: `customer_type === "individual" ? showFields : hideFields`
- **Current State:** Customer form, Loan form use explicit if/ternary rendering
- **Complexity:** Each new conditional requires code change + component recompile

**Files Involved:**
- `src/app/report/customers/[id]/components/customer-info-form.tsx` (hardcoded sections)
- `src/app/report/customers/[id]/loan-plans/[planId]/loan-plan-form-sections.tsx` (loan method conditionals)
- `src/app/report/khdn/mapping/components/field-catalog-board.tsx` (field UI)

#### How Frappe Implements It
- **DocType Field Property:** `display_depends_on` + `mandatory_depends_on` expressions
  - Syntax: `eval:doc.field_name == "value"` or `eval:doc.parent_field.child_field > 100`
  - UI evaluates expressions on form load and field change
  - No code change needed: Pure data-driven configuration
- **Example:** If `loan_method = "han_muc"`, show `credit_limit` field; hide `tenure_months`

#### Implementation Complexity: **MEDIUM** (2-3 days)
- DB Changes: Add `display_depends_on` (string), `mandatory_depends_on` (string) to form field schema
- Logic: Implement expression evaluator (simple recursive descent parser for `eval:` expressions)
- Testing: Edge cases (nested fields, circular deps, invalid expressions)
- UI: Framer Motion re-render on field change + expression re-evaluation

#### Effort Level & Risk
| Category | Assessment |
|----------|------------|
| Effort | **Medium** (2-3 days) |
| Risk | **Low** – UI-only, no data integrity risk |
| Priority | **MEDIUM** – reduces form complexity, improves UX |
| Quick Win | **Yes** – good ROI for effort |
| Strategic | **Yes** – foundation for complex forms (moratorium, restructure, etc.) |

#### Dependencies
- None; can implement independently

#### Impact on Existing Code
- **Form Framework:** Update form field schema to include visibility expressions
- **UI Components:** Add field dependency evaluator hook
- **LoanForm, CustomerForm:** Replace hardcoded conditionals with data-driven expressions
- **Services:** Simple validation that expressions reference valid fields

#### Implementation Pattern
```typescript
// Before: hardcoded
{customer_type === "individual" && <Field name="cccd" />}

// After: data-driven
// Field schema: { name: "cccd", display_depends_on: "eval:doc.customer_type === 'individual'" }
// Component:
const isVisible = evaluateExpression(field.display_depends_on, formData);
{isVisible && <Field name={field.name} />}
```

#### Gap Analysis
| Aspect | Loankit | Frappe | Gap |
|--------|---------|--------|-----|
| Hardcoded Conditionals | ✅ Current approach | ❌ N/A | Need abstraction |
| Expression Language | ❌ None | ✅ `eval:` syntax | Implement evaluator |
| Mandatory Depends On | ❌ None | ✅ Separate property | Add support |
| Circular Dep Detection | ❌ N/A | ✅ Validation | Add safety check |
| Nested Field Refs | ❌ Not tested | ✅ Supported | Test thoroughly |

---

### 5. HAIRCUT-BASED COLLATERAL VALUATION

#### Current Loankit Approach
- **DB Level:** Collateral model tracks `total_value` + `obligation` (no haircut)
- **Valuation:** Manual data entry; no automatic discounting based on collateral type
- **Master Data:** COLLATERAL_TYPES (4 types: qsd_dat, dong_san, tiet_kiem, tai_san_khac)
- **Calculation:** Loan amount determined by user input, not validated against collateral with haircut

**Files Involved:**
- `prisma/schema.prisma` (Collateral model, lines 439-457)
- `src/app/report/customers/[id]/components/collateral-config.ts` (collateral types)
- `src/lib/loan-plan/loan-plan-calculator.ts` (financials, no collateral logic)

#### How Frappe Implements It
- **Loan Security Type Master:** Stores haircut % per security type
  - Example: "Land" → 20% haircut, "Vehicle" → 30% haircut, "Bank Deposit" → 5% haircut
- **Loan Security Table:** In loan, linked securities + quantity
  - `Haircut %` field auto-populated from master on selection
  - `Market Value` × (1 - Haircut %) = `Collateral Value` for loan amount calc
- **Security Shortfall:** Monitors if total collateral value drops below required amount
- **Pledging:** Links collateral to loan with haircut applied

#### Implementation Complexity: **MEDIUM** (2-3 days)
- DB Changes: 
  - Create `CollateralTypeMaster` table with `haircut_percentage` field
  - Add `haircut_percentage`, `collateral_value_after_haircut` to Collateral model
- Logic: 
  - Haircut calculation: `collateral_value = total_value * (1 - haircut_percentage / 100)`
  - Validation: Loan amount vs. total collateral value
- Testing: Haircut application for each collateral type

#### Effort Level & Risk
| Category | Assessment |
|----------|------------|
| Effort | **Medium** (2-3 days) |
| Risk | **Medium** – impacts loan amount, needs validation |
| Priority | **HIGH** – core collateral logic |
| Quick Win | **Yes** – builds on existing collateral infrastructure |
| Strategic | **Yes** – enables collateral-based lending limits |

#### Dependencies
- Requires: Collateral infrastructure (already in place)
- Prerequisite for: Security Shortfall Monitoring

#### Impact on Existing Code
- **CollateralTypeMaster (new):** Master data table for haircut lookup
- **Collateral Model:** Add `haircut_percentage`, `collateral_value_after_haircut` fields
- **Loan Model:** Validation rule checking `total_collateral_value_after_haircut >= loanAmount * 1.2` (e.g., 120% coverage)
- **Services:** 
  - `collateral.service.ts` enhancements for haircut calc
  - `loan.service.ts` validation logic
- **Seed Data:** Pre-populate CollateralTypeMaster with standard haircuts per Vietnamese banking norms

#### Data Migration
- Existing collaterals: Set haircut based on collateral_type (lookup table)
- Recalculate `collateral_value_after_haircut` for all

#### Gap Analysis
| Aspect | Loankit | Frappe | Gap |
|--------|---------|--------|-----|
| Haircut Master | ❌ None | ✅ Per security type | Create CollateralTypeMaster |
| Haircut Calc | ❌ None | ✅ Automatic | Implement formula |
| Collateral Value | ✅ `total_value` | ✅ `value_after_haircut` | Add computed field |
| Master Data | ✅ Types enumerated | ✅ Master table | Create master with defaults |
| Loan Amount Validation | ❌ None | ✅ Coverage check | Add rule (e.g., 120% min) |

---

### 6. PLEDGE/UNPLEDGE WORKFLOW

#### Current Loankit Approach
- **DB Level:** Collateral model: `collateral_type`, `name`, `total_value`, `obligation`
- **Workflow:** No state transitions; collateral is static once created
- **Binding:** Loan model tracks `selectedCollateralIds` (JSON array) but no pledge/unpledge states

**Files Involved:**
- `prisma/schema.prisma` (Collateral, Loan models)
- `src/app/report/customers/[id]/components/collateral-config.ts` (display only)
- No pledge state management

#### How Frappe Implements It
- **Loan Security Pledge DocType:** Separates pledge request from pledge state
  - `Status`: "Draft" → "Requested" → "Pledged" (on approval)
  - Linked to Loan + selected securities
  - Can be partially/fully unpledged
- **Loan Security Unpledge DocType:** Separate document for unpledging
  - `Status`: "Draft" → "Approved"
  - On approval: Updates Pledge status to "Partially Pledged" or "Unpledged"
  - Removes security from loan collateral coverage
- **State Machine:** Enforced by approval workflow
  - Pledge request must be approved before security is considered pledged
  - Unpledge request must be approved before security is released

#### Implementation Complexity: **MEDIUM-HIGH** (2-3 days)
- DB Changes:
  - Add `pledge_status` enum to Collateral (unpledged|pledge_requested|pledged|unpledge_requested)
  - Add `pledge_date`, `unpledge_date` timestamps
  - Optionally: Create PledgeRequest, UnpledgeRequest tables (separate docs)
- Logic: State machine validation (only valid transitions)
- Testing: Approval workflows, partial unpledging

#### Effort Level & Risk
| Category | Assessment |
|----------|------------|
| Effort | **Medium-High** (2-3 days) |
| Risk | **Medium** – state transition bugs can lock collaterals |
| Priority | **MEDIUM** – useful for compliance but not critical for MVP |
| Quick Win | **No** – requires workflow/approval logic |
| Strategic | **Yes** – enables collateral release on loan closure |

#### Dependencies
- Optional for MVP; can defer to Phase 2
- Can coexist with current simple collateral model

#### Current Loankit Approach Assessment
**Current state is simpler:** Collateral is implicitly "pledged" when linked to loan via `selectedCollateralIds`. Full workflow not needed for initial release.

#### Recommendation
**DEFER** to Phase 2 (when collateral release/closure is needed). For MVP, keep simple linked model.

#### Alternative Approach (Minimal)
If workflow needed for compliance, implement simple `pledge_status` field:
- "pledged" (default on loan creation)
- "unpledged" (on loan closure)
No separate Pledge Request/Unpledge Request documents; simple status toggle.

#### Gap Analysis
| Aspect | Loankit | Frappe | Gap |
|--------|---------|--------|-----|
| Simple Linking | ✅ `selectedCollateralIds` | ❌ Explicit docs | Keep simple for MVP |
| State Tracking | ❌ None | ✅ Pledge status | Add status field if needed |
| Approval Workflow | ❌ None | ✅ Required | Defer to Phase 2 |
| Unpledge Tracking | ❌ None | ✅ Separate doc | Defer |
| Partial Unpledge | ❌ N/A | ✅ Supported | Not needed for MVP |

---

### 7. SECURITY SHORTFALL MONITORING

#### Current Loankit Approach
- **DB Level:** Collateral model: `total_value`, `obligation`
- **Monitoring:** None; no calculation of shortfall
- **Alerts:** No real-time alerts for collateral value erosion

**Files Involved:**
- `prisma/schema.prisma` (Collateral model)
- No monitoring service

#### How Frappe Implements It
- **Security Shortfall DocType:** Tracks when loan collateral value < required amount
  - Calculated: `total_collateral_value_after_haircut - loan_outstanding_amount`
  - If shortfall > 0, can request additional security via "Add Security" button
  - Triggers alerts/notifications to risk team
- **Real-Time Monitoring:** 
  - Daily job checks all active loans
  - Compares collateral value to outstanding balance
  - Updates shortfall status
- **Process Loan Security Shortfall:** Approval workflow to add more collateral
- **Alerts:** System generates notifications; can integrate with email/SMS

#### Implementation Complexity: **HIGH** (3-5 days)
- DB Changes:
  - Create `SecurityShortfall` table tracking shortfall amount, detection date
  - Create `SecurityShortfallNotification` for alerts
  - Add `monitored_at` timestamp to Loan
- Logic:
  - Daily cron job: Calculate shortfall for all active loans
  - `shortfall = max(0, required_collateral - available_collateral)`
  - Create notification if shortfall > threshold
- Testing: Edge cases (multiple collaterals, partial pledging, collateral value changes)
- Integration: Real-time updates via websocket or API polling

#### Effort Level & Risk
| Category | Assessment |
|----------|------------|
| Effort | **High** (3-5 days) |
| Risk | **High** – real-time monitoring can fail silently |
| Priority | **MEDIUM-HIGH** – risk management critical |
| Quick Win | **No** – requires background jobs + real-time logic |
| Strategic | **Yes** – enables risk compliance |

#### Dependencies
- Requires: Haircut-based valuation (Feature 5)
- Requires: Flexible repayment + outstanding balance tracking (Feature 1)

#### Current Loankit Scope Question
**Is real-time security monitoring needed for MVP?**
- If risk management deferred: Can implement basic daily check
- If needed: Requires robust background job + notification system

#### Recommendation
**DEFER** to Phase 2 (post-MVP when operational monitoring is required). For MVP, manual periodic review is acceptable.

#### Minimal Approach (If Needed)
Implement basic daily job:
1. Query all active loans with outstanding balance
2. Fetch collaterals for each loan
3. Calculate shortfall (outstanding > total_collateral_after_haircut)
4. Log shortfall to SecurityShortfall table
5. Send email notification to risk officer

#### Gap Analysis
| Aspect | Loankit | Frappe | Gap |
|----------|---------|--------|-----|
| Shortfall Calc | ❌ None | ✅ Automatic daily | Implement cron |
| Shortfall Tracking | ❌ None | ✅ DocType | Create table |
| Real-Time Monitoring | ❌ None | ✅ Background job | Add cron service |
| Alerts | ❌ None | ✅ Notifications | Email integration |
| Additional Security Request | ❌ None | ✅ Approval workflow | Defer to Phase 2 |

---

## Implementation Priority & Decision Matrix

### Priority Ranking

| Rank | Feature | Effort | Risk | Complexity | MVP? | Recommendation |
|------|---------|--------|------|-----------|------|-----------------|
| 1 | Dynamic Field Visibility | Medium | Low | Medium | **Yes** | Implement now (2-3 days) |
| 2 | Flexible Repayment | High | Medium | High | **Yes** | Implement after #1 (3-4 days) |
| 3 | Haircut Valuation | Medium | Medium | Medium | **Yes** | Implement after #1 (2-3 days) |
| 4 | Moratorium & Interest | High | High | High | **No** | Phase 2 (post-MVP, 3-5 days) |
| 5 | Pledge/Unpledge | Medium | Medium | Medium | **No** | Phase 2 (defer, 2-3 days) |
| 6 | Security Shortfall | High | High | High | **No** | Phase 2 (defer, 3-5 days) |
| 7 | Cost Center | Low | Low | Low | **No** | Phase 2+ (defer, 1-2 days) |

---

### Recommended Phasing

#### **Phase 1A: Foundation (High ROI, Low Risk)**
**Duration:** 2-3 days | **Focus:** Form infrastructure + collateral basics

1. **Dynamic Field Visibility** (2-3 days)
   - Enables complex multi-form scenarios downstream
   - Low risk; improves UX
   - Prerequisite for moratorium, pledge forms

2. **Haircut-based Collateral Valuation** (1-2 days)
   - Master data + calculation
   - Builds on existing collateral model
   - Needed for loan amount validation

**Deliverables:**
- Field dependency evaluator service
- CollateralTypeMaster table + seed data
- Updated Collateral model with haircut fields
- Loan validation rule (coverage check)

---

#### **Phase 1B: Core Lending (High Priority)**
**Duration:** 3-4 days | **Focus:** Repayment schedule infrastructure

3. **Flexible Repayment & EMI Schedule** (3-4 days)
   - RepaymentSchedule table + service
   - EMI calculator (simple + compound interest)
   - Disbursement trigger for schedule generation
   - Necessary for accurate loan tracking

**Deliverables:**
- RepaymentSchedule model
- `repayment-schedule.service.ts`
- EMI calculation engine
- Integration with Disbursement creation

**Success Criteria:**
- EMI correctly calculated for monthly/quarterly/annual frequencies
- Schedule regenerates on advance/prepayment
- No broken period errors

---

#### **Phase 2: Advanced Features (Post-MVP)**
**Duration:** 10+ days | **Focus:** Compliance + risk management

4. **Moratorium & Broken Period Interest** (3-5 days)
   - Interest accrual engine
   - Moratorium period tracking
   - Interest capitalization on restructure
   - Broken period calculation in schedule

5. **Pledge/Unpledge Workflow** (2-3 days)
   - Pledge status state machine
   - Approval workflow (simple)
   - Collateral release on loan closure

6. **Security Shortfall Monitoring** (3-5 days)
   - Daily shortfall calculation cron
   - SecurityShortfall tracking table
   - Alert notifications
   - Risk dashboard

7. **Cost Center Tracking** (1-2 days)
   - CostCenter master table
   - Loan → CostCenter FK
   - GL integration (deferred)

---

## Current Gap Summary & Action Items

### Quick Assessment: What Loankit Is Missing vs. Frappe

| Domain | Current State | Gap | Severity |
|--------|---------------|-----|----------|
| **Repayment Logic** | Hardcoded tenure only | No EMI, no schedule, no rescheduling | **CRITICAL** |
| **Interest Calculation** | Fixed annual rate | No accrual, no moratorium support, no broken period | **CRITICAL** |
| **Collateral Valuation** | Simple total value | No haircut, no coverage validation | **HIGH** |
| **Field Management** | Hardcoded conditionals | No data-driven visibility | **MEDIUM** |
| **Workflow** | No pledge/unpledge | No state transitions | **LOW** (Phase 2) |
| **Monitoring** | None | No security shortfall alerts | **MEDIUM** (Phase 2) |
| **Cost Allocation** | None | No P&L by cost center | **LOW** (Phase 2+) |

---

## Unresolved Questions

1. **Interest Accrual Frequency:** Should Loankit use simple daily accrual (like Frappe) or keep simple annual calculation for MVP?
   - *Impact:* Affects RepaymentSchedule generation complexity
   - *Recommendation:* Simple annual for MVP; daily accrual in Phase 2

2. **Multi-Disbursement Scenario:** When a loan has multiple disbursements (han_muc/credit line), should each disbursement have its own schedule?
   - *Impact:* Schedule generation trigger design
   - *Recommendation:* One schedule per disbursement (more granular)

3. **Background Jobs for Accrual/Shortfall:** Does Loankit infrastructure support scheduled cron jobs?
   - *Impact:* Phase 2 feasibility for interest accrual + shortfall monitoring
   - *Recommendation:* Verify cron handler exists; use `/api/cron/*` pattern

4. **Cost Center Scope:** Is this a MVP requirement or Phase 2+?
   - *Impact:* DB design (add FK to Loan or skip)
   - *Recommendation:* Skip for MVP; add in Phase 2 with GL integration

5. **Pledge Approval Workflow:** Is manual approval needed or automatic on loan approval?
   - *Impact:* UI/UX complexity
   - *Recommendation:* Automatic for MVP; manual approval in Phase 2

---

## References

- [Frappe Lending - Loan Booking](https://docs.frappe.io/lending/loan)
- [Frappe Lending - Repayment Schedules](https://docs.frappe.io/lending/repayment-schedules)
- [Frappe Lending - Loan Restructure](https://docs.frappe.io/lending/loan-restructure)
- [Frappe Lending - Security Shortfall](https://docs.frappe.io/erpnext/user/manual/en/loan-security-shortfall)
- [Frappe Lending - Field Dependency](https://docs.frappe.io/helpdesk/field-dependency)
- [GitHub - frappe/lending](https://github.com/frappe/lending)

---

## Next Steps

1. **Validate Prioritization** with Product Lead
   - Confirm MVP scope (Phase 1A + 1B only?)
   - Decide on moratorium requirement (Phase 2 vs. Phase 1?)

2. **Spike: Interest Accrual Design**
   - Prototype simple vs. compound interest calcs
   - Validate against Vietnamese banking norms
   - Document formula assumptions

3. **Spike: Cron Job Infrastructure**
   - Verify existing `/api/cron/*` pattern works
   - Design schedule for interest accrual + shortfall checks

4. **Create Implementation Plans**
   - Phase 1A plan: Dynamic Fields + Haircut (2-3 days)
   - Phase 1B plan: Flexible Repayment (3-4 days)

---

**Report Generated:** 2026-04-04 11:55 | **Analyst:** Research Team
