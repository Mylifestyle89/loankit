---
title: "Config-Driven Field Visibility"
description: "Central config file + React hook to replace scattered hardcoded conditionals in customer/loan forms"
status: done
priority: P2
effort: 3h
branch: main
tags: [forms, config, refactor, dx]
created: 2026-04-04
---

# Config-Driven Field Visibility

## Summary
Replace scattered `customer_type ===` and `loanMethod ===` conditionals across form components with a central TypeScript config + `useFieldVisibility` hook.

## Approach
- **Config file:** `src/lib/field-visibility/field-visibility-config.ts` -- flat lookup table
- **Hook:** `src/lib/field-visibility/use-field-visibility.ts` -- simple `Object.entries().every()` matcher
- **Refactor:** Start with `customer-info-form.tsx` (highest density of conditionals), then `customer-new-form.tsx`
- Loan plan `trung_dai` conditionals stay as-is (Phase 2 -- different data flow, component-level toggling)

## Conditional Audit Summary
| File | Conditionals | Type |
|------|-------------|------|
| `customer-info-form.tsx` | 4x `form.customer_type === "individual/corporate"` | field sections |
| `customer-new-form.tsx` | 3x `customerType === "individual/corporate"` | field sections + submit payload |
| `customer-detail-view.tsx` | 8x `isIndividual` | tabs, sections, routing |
| `customer-detail-tabs-config.ts` | Separate arrays per type | tab definitions |
| `loan-plan [planId]/page.tsx` | 7x `loanMethod === "trung_dai"` | sections + calculations |
| `collateral-config.ts` | `GTCG_ONLY_KEYS` set | subtype fields |

## Phases

| # | Phase | Status | Effort |
|---|-------|--------|--------|
| 1 | [Audit Current Conditionals](phase-01-audit-current-conditionals.md) | done | 30m |
| 2 | [Design Config & Hook](phase-02-design-config-and-hook.md) | done | 1h |
| 3 | [Refactor Forms](phase-03-refactor-forms.md) | done | 1.5h |

## Key Decisions
- NO expression parser/eval -- simple key-value match only
- NO DB storage (Phase 2 deferred)
- Collateral config already has `FORM_FIELDS` per type -- no change needed
- `customer-detail-view.tsx` tab switching stays as-is (tab arrays per type is already config-driven)
- Loan plan `trung_dai` conditionals: skip for now (calculations depend on loanMethod, not just visibility)

## Out of Scope
- Admin UI for editing rules
- DB-stored config (Phase 2)
- `mandatory_depends_on` (stretch goal, not in Phase 1)
- Loan plan form refactor (different pattern -- component-level, not field-level)
