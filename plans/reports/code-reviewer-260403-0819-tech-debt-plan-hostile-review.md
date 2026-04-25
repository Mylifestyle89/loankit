# Hostile Plan Review: Full Codebase Tech Debt Refactor

**Plan:** `plans/260403-0759-full-tech-debt-refactor/`
**Reviewer perspective:** Failure Mode Analyst (Murphy's Law)
**Date:** 2026-04-03

---

## Finding 1: Windows case-insensitive filesystem will corrupt Modals/ -> modals/ rename

- **Severity:** Critical
- **Location:** Phase 7, section "Modals/ directory rename"
- **Flaw:** `git mv Modals/ modals/` on Windows with `core.ignorecase=true` creates `modals/Modals/` (nested double directory). Confirmed via dry-run: git creates `modals/Modals/AddFieldModal.tsx` instead of `modals/AddFieldModal.tsx`.
- **Failure scenario:** Phase 7 executes `git mv "Modals" "modals"`. Git on Windows (confirmed `core.ignorecase=true`) treats the source and destination as the same path, and creates a nested subdirectory instead. All 30+ files in the Modals directory get moved to `modals/Modals/`. Every import breaks. `npx tsc --noEmit` catches this, but the git state is now corrupted and requires manual cleanup with a two-step rename (`Modals -> _tmp -> modals`).
- **Evidence:** Dry-run output shows: `Renaming src/.../Modals to src/.../modals/Modals` and `Renaming src/.../Modals/AiMappingModal.tsx to src/.../modals/Modals/AiMappingModal.tsx` -- all 30+ files get double-nested.
- **Suggested fix:** Require two-step rename: `git mv Modals _modals_tmp && git mv _modals_tmp modals`. Document this explicitly in Phase 7. Same pattern for any PascalCase file on a case-insensitive filesystem.

## Finding 2: Phase 0C deletes file that Phase 1 plans to split

- **Severity:** Critical
- **Location:** Phase 0C step 6 vs Phase 1 item #2
- **Flaw:** Phase 0C DELETE: `src/app/report/khdn/mapping/components/Modals/FinancialAnalysisModal.tsx`. Phase 1 item #2 plans to SPLIT this exact file ("402 lines") into `financial-analysis-modal-steps.tsx` + `financial-analysis-modal.tsx`. These are parallel phases with 0C blocking Phase 1, but the plan says 0C also blocks Phase 4, not Phase 1. Even if dependency is honored, Phase 1's todo still lists splitting a file that no longer exists.
- **Failure scenario:** If run correctly (0C first), Phase 1 implementer encounters a stale todo item referencing a deleted file, wastes time investigating, or worse, re-creates the deleted file. If dependency graph is misread and they run in parallel, both phases fight over the same file.
- **Evidence:** Phase 0C file ownership: "DELETE: `src/app/report/khdn/mapping/components/Modals/FinancialAnalysisModal.tsx`". Phase 1 todo: "Split FinancialAnalysisModal/Modals (402 -> 2 files)". plan.md dependency graph line 49: "Phase 0C blocks Phase 1 + Phase 4" -- so the ordering is correct but Phase 1's work item is STALE post-0C.
- **Suggested fix:** Remove Phase 1 item #2 entirely (FinancialAnalysisModal split). It is consumed by 0C. Also remove the 6 `financial-analysis-*` helper files in Modals/ from Phase 1's scope -- they are part of the khdn variant being deleted by 0C.

## Finding 3: Phase 4 also splits FinancialAnalysisModal that Phase 0C rewrites

- **Severity:** High
- **Location:** Phase 4 item #1 vs Phase 0C
- **Flaw:** Phase 4 plans to split `src/components/financial-analysis/FinancialAnalysisModal.tsx` (534 lines) into 3 files. But Phase 0C is simultaneously merging the khdn variant INTO this exact file, adding `animated`, `showStepDots`, `embedded` props, conditional framer-motion imports, and StepDots extraction. Phase 0C will change the file's structure and line count before Phase 4 touches it.
- **Failure scenario:** Phase 4 implementer analyzes the 534-line file as-is, plans split boundaries at current function boundaries. Phase 0C runs first and adds ~100 lines of merged khdn logic (conditional animation, embedded mode, StepDots). Phase 4's split plan is now wrong -- the "upload step" and "review step" boundaries have shifted, new conditional branches exist that weren't accounted for in the 3-file split.
- **Evidence:** Phase 0C: "Add optional props to main component (`animated`, `showStepDots`, `embedded`)" and "Conditionally import framer-motion". Phase 4: split plan assumes current 534-line structure with no conditional animation logic.
- **Suggested fix:** Phase 4's FinancialAnalysisModal split must be re-planned AFTER Phase 0C completes. Mark it as explicitly blocked by 0C with a note: "re-analyze split boundaries post-merge". Or better: have Phase 0C also do the split as part of the merge.

## Finding 4: grep-based import rewriting will produce false matches

- **Severity:** High
- **Location:** Phase 7, section "Execution Strategy"
- **Flaw:** The sed command `grep -rl "from.*OldName" src/ | xargs sed -i 's|/OldName|/new-name|g'` is a naive string replacement that will match substrings. File names like `FieldRow` will match `FieldRow` inside `FieldRowControls`, `FieldRowDisplay`, etc. The regex has no word boundary.
- **Failure scenario:** Phase 1 creates `field-row-controls.tsx` and `field-row-display.tsx`. Phase 7 runs `sed -i 's|/FieldRow|/field-row|g'` to rename the FieldRow import. This also transforms `./field-row-controls` to `./field-row-controls` (no-op here since already kebab) BUT it transforms any remaining `./FieldRow` import to `./field-row` even inside string literals or comments. More dangerously, `ModalRegistry` contains a string map of modal names that may reference `FinancialAnalysisModal` as a key -- sed will corrupt these.
- **Evidence:** Phase 7 execution strategy: `grep -rl "from.*OldName" src/ | xargs sed -i 's|/OldName|/new-name|g'`. No word-boundary anchors. No dry-run step.
- **Suggested fix:** Use precise import-aware replacement: match `from ["'].*\/OldName["']` with exact filename boundary (no trailing chars). Or use TypeScript-aware tools like `ts-morph` or VS Code's rename symbol. At minimum, add a dry-run step that shows all replacements before applying.

## Finding 5: No rollback strategy for a 10-phase refactor

- **Severity:** High
- **Location:** plan.md, entire document
- **Flaw:** 102 files touched across 10 phases with "Zero business logic changes" claim. No rollback plan. No intermediate branches. No mention of commits per phase. If Phase 5 introduces a subtle runtime regression that `tsc --noEmit` doesn't catch (since it only checks types), and you discover it after Phase 7's rename, you must untangle 10 phases of changes.
- **Failure scenario:** Phase 3 splits `invoice.service.ts` and barrel re-exports everything. Type check passes. But a subtle circular import is introduced between `invoice-crud.service.ts` and `invoice-queries.service.ts` (both need shared types). At runtime, one module gets `undefined` due to circular require resolution. This is discovered only after Phase 7's full `npx next build`, by which point 7 phases of renames and splits make it extremely hard to isolate which change caused the failure.
- **Evidence:** plan.md: "Each phase ends with: `npx tsc --noEmit`" -- type checking only, no runtime verification until Phase 7. No mention of git commits, branches, or checkpoint strategy.
- **Suggested fix:** Mandate `git commit` after each phase passes verification. Run `npx next build` (not just tsc) after Phase 3 (services -- highest circular import risk) and Phase 5 (pages -- routing risk). Add explicit rollback: "If any phase fails build, revert to last phase commit."

## Finding 6: Phase 5 creates files in Phase 1's territory without coordination protocol

- **Severity:** Medium
- **Location:** Phase 5, item #5 (khdn/mapping/page.tsx split)
- **Flaw:** Phase 5 creates `mapping-page-header-section.tsx` and `mapping-page-main-content.tsx` in `khdn/mapping/components/` -- the same directory Phase 1 owns. The plan adds a NOTE: "Phase 5 only CREATES NEW files in mapping/components/ with `mapping-page-*` prefix. No overlap." But this violates the plan.md rule: "Each phase owns exclusive files." If phases run in parallel (as the execution graph allows for Phases 1-6), two agents write to the same directory simultaneously.
- **Failure scenario:** Parallel execution: Phase 1 agent is splitting FieldCatalogBoard in `mapping/components/` and runs `npx tsc --noEmit`. Phase 5 agent simultaneously creates `mapping-page-header-section.tsx` in the same directory with imports that reference components Phase 1 hasn't finished splitting yet. Phase 5's tsc check passes or fails depending on race timing.
- **Evidence:** plan.md line 65: `Phase 5: Pages | src/app/report/*/page.tsx + nested pages`. Phase 5 note: "mapping/components/ is owned by Phase 1 for existing files. Phase 5 only CREATES NEW files." Ownership matrix says Phase 1 owns `src/app/report/khdn/mapping/components/**` (glob covers new files too).
- **Suggested fix:** Move Phase 5's khdn mapping page extraction to Phase 1 scope. Or add explicit dependency: Phase 5 waits for Phase 1 to complete before touching khdn/mapping/.

## Finding 7: Phase 0C orphans 6+ financial-analysis helper files in Modals/

- **Severity:** Medium
- **Location:** Phase 0C, section "File Ownership"
- **Flaw:** Phase 0C deletes `FinancialAnalysisModal.tsx` from Modals/ but says nothing about the 6 companion files: `financial-analysis-types.ts`, `financial-analysis-constants.ts`, `financial-analysis-step-dots.tsx`, `financial-analysis-summary-card.tsx`, `financial-analysis-collapsible-section.tsx`, `financial-analysis-table.tsx`, `financial-analysis-sub-table-preview.tsx`. These files are imported ONLY by the khdn FinancialAnalysisModal. Deleting the modal without deleting its dependencies leaves 7 dead files (~500 LOC) in the codebase.
- **Failure scenario:** Phase 0C deletes the modal, merges features into the main component. The 7 helper files remain. No phase claims ownership of them. They sit as dead code, confusing future developers. Worse: Phase 7's rename will attempt to rename some of them (they're already kebab-case so maybe not), and Phase 1's scope includes `Modals/**` so Phase 1 might try to split files that should be deleted.
- **Evidence:** `grep -n "financial-analysis" src/app/report/khdn/mapping/components/Modals/*.tsx` shows 7 import references all originating from the khdn `FinancialAnalysisModal.tsx`. Phase 0C file ownership only lists DELETE for the main modal file.
- **Suggested fix:** Phase 0C must explicitly DELETE or MIGRATE all 7 companion files. If merging into main component, the helpers (StepDots, SummaryCard, CollapsibleSection, etc.) should move to `src/components/financial-analysis/` or be deleted if the main component already has equivalents.

## Finding 8: "Scan at implementation time" in Phase 6 is a blank check

- **Severity:** Medium
- **Location:** Phase 6, plan.md line 66
- **Flaw:** Phase 6 lists only `xlsx-table-injector` (360 lines) as a concrete target, then adds "Scan at implementation time for more." This is a 1-hour phase that doesn't know its own scope. The 102-file count in the plan overview includes files that may fall into Phase 6's catch-all bucket, but without enumeration, the effort estimate is meaningless and no ownership boundary is defined.
- **Failure scenario:** Implementation time arrives. The implementer scans and discovers 10 more files in `src/lib/` exceeding 200 lines. These files overlap with Phase 3 (services that import from lib), Phase 0A/0B (ai utilities in lib), or Phase 4 (components that depend on lib). The 1-hour estimate becomes 4 hours, and the "scan" step discovers files already being modified by another parallel phase.
- **Evidence:** plan.md Phase 6: `src/lib/xlsx-table-injector.ts + other >200-line libs | 1h`. "Scan at implementation time" is not a plan, it's an admission that the plan is incomplete.
- **Suggested fix:** Complete the file inventory NOW. Run `find src/lib -name "*.ts" -exec wc -l {} + | sort -rn` and list every >200-line file. Assign each to Phase 6 or confirm it's covered by another phase. Remove the "scan" language.

## Finding 9: No verification that barrel re-exports preserve runtime behavior

- **Severity:** Medium
- **Location:** All phases (plan.md line 94: "Barrel re-exports for backward compat")
- **Flaw:** The plan's core strategy is "split file, barrel re-export old names." `npx tsc --noEmit` verifies types but NOT that barrel re-exports work at runtime. Next.js has known issues with barrel files: they can break tree-shaking, cause larger bundles, and in some configurations, barrel files in `src/app/` can trigger "can't resolve module" errors during `next build` that `tsc` doesn't catch.
- **Failure scenario:** Phase 3 splits `invoice.service.ts` into 3 files with barrel re-export. `tsc --noEmit` passes. But at runtime, Next.js serverless function bundler (webpack/turbopack) resolves the barrel differently, especially if one of the split files has a top-level `await` or side effect. The API route `/api/invoices` fails with a module resolution error in production. This is only caught by `npx next build` in Phase 7, after 6 phases of accumulated changes.
- **Evidence:** plan.md: "Each phase ends with: `npx tsc --noEmit` (fast type-check, no build). After Phase 7: `npx next build` (full build)." Six phases of barrel re-exports accumulate without a single build verification.
- **Suggested fix:** Run `npx next build` at minimum after Phase 3 (services, consumed by API routes -- highest risk for serverless bundling issues) and Phase 4 (shared components -- consumed by pages). Don't wait until Phase 7 to discover 6 phases of barrel issues.
