# Phase 1A Features Fit Analysis: Dynamic Field Visibility + Haircut Valuation

**Date:** April 4, 2026 | **Scope:** Frappe Lending Phase 1A features for Loankit + Agribank  

---

## Executive Summary

Two Phase 1A features from Frappe Lending are evaluated for Loankit:
1. **Dynamic Field Visibility** (conditional form rendering via data-driven expressions)
2. **Haircut-based Collateral Valuation** (conservative security pricing model)

**Recommendations:**
- **DYNAMIC FIELD VISIBILITY:** ADOPT — Foundation for complex forms. Low risk, high ROI. 2-3 days.
- **HAIRCUT VALUATION:** ADOPT WITH LOCALIZATION — Critical for Agribank compliance. 2-3 days.

**Total Effort:** 4-6 days (sequential)

---

## Feature 1: Dynamic Field Visibility

### Problem Statement

**Current:** Hardcoded React conditionals (e.g., `{customer_type === "individual" && <CCCDField />}`)  
**Frappe:** Data-driven expressions (e.g., `eval: doc.loan_method == "han_muc"`)

**Impact:** Every new conditional requires code change → recompile → deploy

### Pros

- **DRY:** Centralized field definitions vs. scattered components
- **No Deploy:** Add expression to schema → UI renders immediately
- **Foundation:** Enables moratorium forms, pledge workflows, restructure UX
- **Better Forms:** Show only relevant fields → faster loan officer scanning
- **Validation:** `mandatory_depends_on` for dynamic required fields

### Cons

- **Parser Complexity:** Expression evaluator adds maintenance burden
- **Debugging:** Why is field hidden? → trace expression logic
- **Circular Deps:** Field A depends on B, B depends on A → infinite loop risk
- **Performance:** Re-evaluating 100+ expressions on every change

### Effort Estimate

**2-3 days:**
- Expression parser: 6 hours
- React hook + memoization: 4 hours
- Form schema refactor: 8 hours
- Testing + validation: 6 hours

---

## Feature 2: Haircut-Based Collateral Valuation

### Problem Statement

**Current:** `total_value` only (no haircut); loan amount unconstrained  
**Frappe:** Security Type master with haircut %; collateral discounted; loan validated against coverage

**Impact:** No collateral-based loan cap; unsecured lending risk

### Vietnamese Banking Context

- **Agribank** likely has haircut policy per collateral type (gold, land, vehicle, savings)
- **Regulatory:** SBV may require conservative valuation (e.g., 120-150% coverage minimum)
- **KHCN loans:** Land/gold collateral → haircut essential
- **Corporate:** Inventory/receivables → also require haircut

### Pros

- **Compliance:** Aligns with SBV/Agribank security audit expectations
- **Risk Containment:** Prevents overlending against illiquid assets
- **Scalability:** Supports multi-collateral loans (sum of haircut values)
- **Foundation:** Prerequisite for Phase 2 security shortfall monitoring
- **Agribank Ready:** Can use Agribank's documented haircut matrix

### Cons

- **Master Data:** Must maintain CollateralTypeMaster (7+ types × regions)
- **Migration:** Existing collaterals → recalculate; some loans may become over-leveraged
- **User Confusion:** Why max loan < collateral value? (tooltip/explanation needed)
- **Maintenance:** Haircuts change with regulation/economy → requires versioning

### Effort Estimate

**2-3 days:**
- Schema + migrations: 3 hours
- Collateral service enhancements: 5 hours
- Loan validation logic: 4 hours
- Seed data: 2 hours
- UI updates: 5 hours
- Testing: 6 hours

---

## Agribank Considerations

### Compliance Requirements

1. **Haircut Policy:** Retrieve from Agribank (documented matrix?)
2. **Coverage Ratio:** What's minimum? (120%, 150%, custom?)
3. **Regional Variation:** Rural vs. urban haircuts differ?
4. **Collateral Types:** All 4 in Loankit or more?
5. **Review Cycle:** Annual, quarterly, or ad-hoc?

### Implementation Approach

- Default: SBV standard haircuts (goldsmith lending standard)
- Configurable: Admin panel for Agribank-specific overrides
- Versioned: Track effective dates + audit trail on master changes

---

## Risk Assessment

| Feature | Risk | Probability | Impact | Mitigation |
|---------|------|-------------|--------|-----------|
| Expression parser bugs | High | Medium | Hidden fields, typos | Syntax validation + tests |
| Circular dependencies | High | Low | Infinite loop | Dependency graph validation |
| Over-leverage on migration | Medium | Medium | Loans exceed limit | Flag non-compliant + grace period |
| Master data incorrect | Medium | High | Wrong loan caps | Agribank validation + audit trail |

---

## Success Metrics

### Dynamic Field Visibility
- Expression evaluator test coverage ≥ 90%
- Form render time < 300ms (60-field form)
- Zero visibility bugs in 30 days post-launch

### Haircut Valuation
- Calculation accuracy 100% (unit tests)
- Seed data matches Agribank policy
- All loans ≥ min coverage at go-live

---

## Implementation Timeline

**Phase 1A: 4-6 days**

Day 1-2: Dynamic Field Visibility (evaluator + hook + form refactor)  
Day 3: Integration (LoanForm, CustomerForm updates)  
Day 4-5: Haircut Valuation (schema + service + validation)  
Day 6: Testing + seed data + UI + documentation  

---

## Final Recommendation

**GO for Phase 1A**

**Rationale:**
- Low risk, high value
- Foundation for future features
- 4-6 days achievable
- Phase 2 (moratorium, pledges) deferred (too complex for MVP)

**Sequential Order:**
1. Dynamic Field Visibility (foundation)
2. Haircut Valuation (builds on collateral)

---

## Unresolved Questions

1. **Expression Scope:** Support array operations (e.g., `doc.items.length > 0`)? Or simple only?
2. **Agribank Haircuts:** What's the documented matrix? Coverage ratio minimum?
3. **Data Migration:** Flag non-compliant loans or auto-adjust?
4. **Schema Updates:** Can they be live (admin panel) or compile-time only (seed data)?
5. **Baseline Performance:** Current form render time before expression evaluation?

---

**Report Generated:** 2026-04-04 12:03  
**Status:** Ready for Phase 1A planning
