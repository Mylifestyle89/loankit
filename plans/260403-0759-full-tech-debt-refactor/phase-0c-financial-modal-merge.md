---
phase: 0C
title: "FinancialAnalysisModal Merge"
status: complete
priority: P1 — MEDIUM impact, MEDIUM risk
effort: 1.5h
blocks: [phase-01, phase-04]
---

# Phase 0C: FinancialAnalysisModal Merge

## Overview

2 real implementations of FinancialAnalysisModal + 1 re-export wrapper. Merge into single configurable component.

## Current State

| Path | Lines | Role |
|------|-------|------|
| `src/components/financial-analysis/FinancialAnalysisModal.tsx` | 534 | **Main** — base implementation |
| `src/app/report/khdn/mapping/components/Modals/FinancialAnalysisModal.tsx` | 402 | **khdn variant** — adds framer-motion, StepDots, `embedded` mode |
| `src/components/FinancialAnalysisModal.tsx` | 5 | Re-export wrapper (backward compat) |

## Key Differences (khdn vs main)

| Feature | Main (534L) | KHDN (402L) |
|---------|-------------|-------------|
| Animation | None | framer-motion AnimatePresence |
| Step indicator | None | StepDots component |
| Embedded mode | No | Yes (`embedded` prop) |
| Prop names | `onApply` | `onApplyValues` |
| Step tracking | Basic | Enhanced with animation |

## Strategy

Merge INTO main component with optional props:

```typescript
interface FinancialAnalysisModalProps {
  // ... existing props
  animated?: boolean;       // enables framer-motion (default: false)
  showStepDots?: boolean;   // shows step indicators (default: false)
  embedded?: boolean;       // embedded mode (default: false)
}
```

## Implementation Steps

1. Read both implementations fully, diff them
2. Add optional props to main component (`animated`, `showStepDots`, `embedded`)
3. Conditionally import framer-motion (dynamic import to avoid bundle bloat)
4. Extract StepDots as sub-component in `src/components/financial-analysis/step-dots.tsx`
5. Update khdn import to use main component with config props
6. Delete khdn copy: `src/app/report/khdn/mapping/components/Modals/FinancialAnalysisModal.tsx`
7. Keep re-export wrapper at `src/components/FinancialAnalysisModal.tsx`
8. Run `npx tsc --noEmit`

## File Ownership

- MODIFY: `src/components/financial-analysis/FinancialAnalysisModal.tsx`
- CREATE: `src/components/financial-analysis/step-dots.tsx`
- DELETE: `src/app/report/khdn/mapping/components/Modals/FinancialAnalysisModal.tsx`
- MODIFY: imports in khdn/mapping that reference deleted file
- KEEP: `src/components/FinancialAnalysisModal.tsx` (re-export)

## Risk

- ⚠️ **This is a behavior change** (Red Team #9) — not purely structural
- framer-motion conditional import may increase complexity
- Prop interface changes require updating all call sites
- Test manually: both khdn and non-khdn usage paths
- Cleanup: remove orphaned helper files in khdn/Modals/ after deletion (Red Team #7-FM)

## Todo

- [x] Diff both implementations
- [x] Add optional props to main component
- [x] Extract StepDots sub-component
- [x] Dynamic import framer-motion
- [x] Update khdn imports
- [x] Delete khdn copy
- [x] Compile check
- [x] Manual test both usage paths

## Success Criteria

- Single FinancialAnalysisModal component
- khdn features enabled via props, not copy-paste
- No visual/behavioral regression
- `npx tsc --noEmit` passes
