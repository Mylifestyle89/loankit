---
title: "Full Codebase Tech Debt Refactor"
description: "DRY dedup + split high-churn oversized files + rename PascalCase to kebab-case"
status: complete
priority: P1
effort: 14h
branch: refactor/tech-debt-cleanup
tags: [refactor, tech-debt, modularization, naming, dry]
created: 2026-04-03
updated: 2026-04-03
completed: 2026-04-03
red-team: 2026-04-03 (13 accepted, 2 rejected)
---

# Full Codebase Tech Debt Refactor

## Scope

- **DRY violations**: AI provider logic x3, extractJsonObject x3, FinancialAnalysisModal x2
- **Files >300 lines** — ~30 files (validated: skip marginal 200-300L files)
- **39 files** use PascalCase instead of kebab-case
- **Phase 0C is a behavior change** (merges 2 modal variants) — requires manual test

## Verified DRY Findings (vs Opus/Gemini claims)

| Claim | Reality | Action |
|-------|---------|--------|
| mapping/ vs khdn/mapping/ 8K LOC dupe | **False** — only khdn/mapping/ exists | None |
| AI provider selection x5 | **x3** (ai-mapping, financial-analysis, auto-tagging) | Extract shared |
| extractJsonObject x3 | **Confirmed** — 3 implementations | Extract shared |
| FinancialAnalysisModal x4 | **x2 real** + 1 re-export | Merge with config |

## Execution Strategy

```
                                         feature branch: refactor/tech-debt-cleanup
                                         commit checkpoint after each phase
Phase 0AB ─┐
Phase 0C ──┼── DRY dedup (0A+0B merged) ──┐
           │                               │
           ▼                               ▼
Phase 1 ──┐
Phase 2 ──┤
Phase 3 ──┼── Parallel file splits ──► Phase 7 (rename, sequential)
Phase 4 ──┤
Phase 5 ──┤
Phase 6 ──┘
```

## Dependency Graph

- **Phase 0AB**: merged (both write `src/lib/ai/index.ts` — cannot parallel)
- **Phase 0C**: parallel with 0AB, blocks Phase 1 + Phase 4
- **Phase 0AB** blocks Phase 3 (services get smaller after extraction)
- Phases 1-6: parallel after Phase 0 complete
- Phase 7: sequential, depends on ALL phases 1-6

## Git Strategy (Red Team Finding #7)

- **Feature branch**: `refactor/tech-debt-cleanup` off main
- **Commit checkpoint** after each phase completes + tsc passes
- Rollback = `git reset --hard` to last phase checkpoint
- Merge to main only after full `npx next build` passes

## File Ownership Matrix

| Phase | Scope | Files Owned | Est. |
|-------|-------|-------------|------|
| 0AB | AI utilities (provider + JSON extract) | `src/lib/ai/` (new) + provider/JSON logic in 3 services | 1.5h |
| 0C | FinancialAnalysisModal merge | `src/components/financial-analysis/**` + khdn Modal copy | 1.5h |
| 1 | khdn/mapping components + Modals | `src/app/report/khdn/mapping/components/**` (excl FinancialAnalysisModal — deleted by 0C) | 4h |
| 2 | khdn/mapping hooks | `src/app/report/khdn/mapping/hooks/**` (skip useMappingPageLogic if <300L after hooks compose) | 2h |
| 3 | Services | `src/services/**` + `src/lib/report/fs-store.ts` | 2.5h |
| 4 | Shared components | `src/components/**` (excl ui/) + customers/[id]/components/** (FinancialAnalysisModal plan updated post-0C) | 2h |
| 5 | Pages | `src/app/report/*/page.tsx` + nested pages (NEW files in mapping/components/ use `mapping-page-*` prefix exclusively) | 2h |
| 6 | Libs | `src/lib/xlsx-table-injector.ts` + explicitly listed >200L libs (no open-ended scan) | 1h |
| 7 | PascalCase rename | All 39 files + import updates via codemod (not sed) | 3h |

## Phase Files

### DRY Dedup (run first)
- [Phase 0AB: AI Utilities Extraction](./phase-0a-ai-provider-extraction.md) (merged 0A+0B)
- [Phase 0C: FinancialAnalysisModal Merge](./phase-0c-financial-modal-merge.md) ⚠️ behavior change

### File Splits (run after DRY dedup)
- [Phase 1: KHDN Mapping Components](./phase-01-khdn-mapping-components.md)
- [Phase 2: KHDN Mapping Hooks](./phase-02-khdn-mapping-hooks.md)
- [Phase 3: Services Split](./phase-03-services-split.md)
- [Phase 4: Shared Components](./phase-04-shared-components.md)
- [Phase 5: Pages Split](./phase-05-pages-split.md)
- [Phase 6: Libs Split](./phase-06-libs-split.md)

### Naming Convention (run last)
- [Phase 7: PascalCase Rename](./phase-07-pascal-to-kebab-rename.md)

## Verification

- Each phase: `npx tsc --noEmit` + git commit checkpoint
- Phase 0C: manual test both khdn and non-khdn FinancialAnalysisModal paths
- After Phase 7: `npx next build` (full build)

## Rules

- Named re-exports only (no barrel `export *` — tree-shaking safe)
- Phase 0C = behavior change, needs manual test
- Each phase owns exclusive files
- kebab-case for all new files
- Phase 7: use TypeScript codemod or precise regex with word boundary (not blind `sed`)
- Windows: `Modals/` → `modals/` rename via 2-step temp dir (NTFS case-insensitive)

## Red Team Review

### Session — 2026-04-03
**Findings:** 15 (13 accepted, 2 rejected)
**Severity breakdown:** 4 Critical, 7 High, 4 Medium

| # | Finding | Severity | Disposition | Applied To |
|---|---------|----------|-------------|------------|
| 1 | Phase 0A/0B write same index.ts — merge into 0AB | High | Accept | plan.md, Phase 0AB |
| 2 | Phase 0C deletes file Phase 1 still lists for split | Critical | Accept | Phase 1 |
| 3 | Phase 4 split plan based on pre-0C structure | High | Accept | Phase 4 |
| 4 | sed import rewrite no word boundary | High | Accept | Phase 7 |
| 5 | Windows git mv Modals→modals nested dir | Critical | Accept | Phase 7 |
| 6 | Phase 5 creates files in Phase 1 territory | Medium | Accept | Phase 5 |
| 7 | No rollback strategy, working on main | High | Accept | plan.md (git strategy) |
| 8 | Plan covers ~50 files, claims 102 | Critical | Accept | Scope (focus high-churn) |
| 9 | Phase 0C changes API — "zero logic change" false | High | Accept | plan.md, Phase 0C |
| 10 | useMappingPageLogic already 12 sub-hooks | High | Accept | Phase 2 |
| 11 | Drop Phase 7 rename entirely | High | Reject | Keep, but use codemod |
| 12 | Barrel re-exports defeat tree-shaking | Medium | Accept | Rules section |
| 13 | Phase 6 "scan later" — undefined scope | Medium | Accept | Phase 6 |
| 14 | Phase 1: 15 splits in 3h unrealistic | High | Accept | Phase 1 (→4h) |
| 15 | resolveAiProvider returns plaintext key | Critical | Reject | Key already in env |

## Validation Log

### Session 1 — 2026-04-03
**Trigger:** Post-red-team validation before implementation
**Questions asked:** 4

#### Questions & Answers

1. **[Architecture]** Phase 0C merge FinancialAnalysisModal — backward compat strategy?
   - Options: Merge + update call sites | Wrapper component | Skip 0C
   - **Answer:** Merge + update call sites
   - **Rationale:** Clean single component, accept test burden

2. **[Risk]** Phase 7 rename — anyone else working on repo?
   - Options: Solo, rename freely | Forward-only | Defer
   - **Answer:** Solo, rename freely
   - **Rationale:** No merge conflict risk, full rename safe

3. **[Scope]** Target all 102 files >200L or focus high-impact?
   - Options: All >300L (~30 files) | All >200L (102) | Top 15 churn
   - **Answer:** All >300L (~30 files)
   - **Rationale:** 40% effort reduction, marginal files can wait

4. **[Enforcement]** How to enforce 200L rule going forward?
   - Options: ESLint max-lines | Pre-commit hook | Convention only
   - **Answer:** ESLint max-lines rule
   - **Rationale:** Automatic, non-blocking (warning level)

#### Confirmed Decisions
- Phase 0C: merge + update all call sites, manual test required
- Phase 7: full rename, no branch conflict risk
- Scope: only files >300L (skip 200-300L marginal files)
- Post-refactor: add ESLint max-lines warning rule

#### Action Items
- [ ] Update all phase files to skip files 200-300L
- [ ] Add ESLint max-lines config as final step after Phase 7

#### Impact on Phases
- Phase 1: reduce from 15 to ~8-10 splits (files >300L only)
- Phase 2: reduce from 8 to ~5-6 splits
- Phase 3: minor reduction
- Phase 4: minor reduction
- Phase 5: reduce from 5 to ~3 pages
- Phase 6: no change (xlsx-table-injector is 360L)
