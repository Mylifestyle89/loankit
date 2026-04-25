# Scope & Complexity Critique: Full Codebase Tech Debt Refactor

**Reviewer perspective:** YAGNI enforcer -- over-engineering, premature abstraction, unnecessary complexity, missing MVP cuts, scope creep, gold plating.

---

## Finding 1: 88 oversized files exist but plan only covers ~50 -- invisible scope gap

- **Severity:** Critical
- **Location:** plan.md, "102 files exceed 200-line limit"
- **Flaw:** The plan claims 102 oversized files. Actual count (excluding generated/i18n): 88. Of those 88, the phases only explicitly name ~50 files. The remaining ~38 files (customer-credit-info-section 350L, bk-to-customer-relations 346L, bk-mapping 337L, placeholder-sidebar 330L, khcn-doc-checklist 326L, auto-process.service 319L, customer-xlsx-io.service 314L, mapping-engine 311L, document-extraction.service 309L, etc.) appear in NO phase.
- **Failure scenario:** After 20h of work, ~38 files still exceed the 200-line limit. The refactor is declared "done" but the codebase rule is still widely violated. The effort feels wasted because the most commonly-edited service files (auto-process, document-extraction, disbursement) were never touched.
- **Evidence:** Phase 6 says "Scan at implementation time" for additional libs. No other phase has a catch-all. Missing files include `src/lib/report/financial-field-catalog.ts` (471L -- one of the largest non-generated files, bigger than most Phase 3 targets), `src/services/bk-to-customer-relations.ts` (346L), `src/components/placeholder-sidebar.tsx` (330L), and 35+ others.
- **Suggested fix:** Either (a) explicitly list all 88 files across phases, or (b) explicitly declare a cut line ("files under 350L are out of scope for v1") and document the accepted exceptions. Currently the plan pretends completeness it does not have.

---

## Finding 2: Phase 0C merges two components with different consumers and different APIs -- not DRY, it is coupling

- **Severity:** High
- **Location:** Phase 0C, "Strategy" section
- **Flaw:** The khdn `FinancialAnalysisModal` has prop `onApplyValues`, framer-motion animation, StepDots, and `embedded` mode. The main one has `onApply`, no animation, no embedded mode. These are not "duplicates" -- they are two different products that happen to share a name. Merging them into one component with `animated?: boolean`, `showStepDots?: boolean`, `embedded?: boolean` creates a God component with branching props that violates SRP.
- **Failure scenario:** Every future change to the main modal requires testing the khdn path (and vice versa). The optional-props pattern will accumulate more booleans over time (`showFooter?`, `compactMode?`, `analysisV2?`). The khdn team's framer-motion dependency now ships to all consumers via dynamic import complexity. Conditional dynamic imports add error states nobody handles.
- **Evidence:** The two modals have different prop interfaces (`onApply` vs `onApplyValues`), different animation stacks, different rendering paths. Phase 0C estimates 1.5h but includes "Manual test both usage paths" -- acknowledging the regression risk.
- **Suggested fix:** Leave them separate. They are not DRY violations -- they are two components that share ancestry. If you must reduce duplication, extract shared _logic_ (analysis steps, API calls) into a hook, not a merged component.

---

## Finding 3: useMappingPageLogic already has 12 sub-hooks -- splitting it AGAIN adds indirection without reducing complexity

- **Severity:** High
- **Location:** Phase 2, item 1 "useMappingPageLogic (462 lines)"
- **Flaw:** The plan says: "Already a composition hook importing 12 sub-hooks." The proposed fix is to extract 2 more sub-hooks and leave a 200-line orchestrator. A hook that imports 14 sub-hooks is not "modular" -- it is a shotgun of micro-hooks that nobody can reason about without reading all 14+ files. Splitting it further makes the problem worse.
- **Failure scenario:** Developer needs to debug modal state. Must trace through `use-mapping-page-logic.ts` -> `use-mapping-modal-state.ts` -> realize the toolbar handler in `use-mapping-toolbar-handlers.ts` also toggles modal state -> discover 3 of the existing 12 sub-hooks also reference modal state. The indirection makes debugging slower, not faster.
- **Evidence:** 33 import lines already in useMappingPageLogic.ts. Adding 2 more internal modules turns it into an import manifest, not a hook.
- **Suggested fix:** Skip this split entirely. 462 lines in a composition-only hook (mostly declarations and return assembly) does not benefit from more files. The 200-line rule exists for logic-dense files, not for wiring files.

---

## Finding 4: Phase 7 rename is 3h of pure churn with catastrophic conflict potential and zero functional value

- **Severity:** High
- **Location:** Phase 7, entire phase
- **Flaw:** Renaming 39 PascalCase files to kebab-case is gold plating. It changes zero behavior, but touches "ALL files in the codebase" (direct quote from the phase). On a case-insensitive filesystem (Windows -- this project runs on Windows 11), `git mv` from PascalCase to kebab-case requires a two-step rename (File.tsx -> file-temp.tsx -> file.tsx) or git config changes. The `grep -rl | xargs sed` approach will corrupt files if any import path is a substring of another.
- **Failure scenario:** (a) On Windows, `git mv FieldRow.tsx field-row.tsx` is a no-op because NTFS is case-insensitive. Must use `git mv FieldRow.tsx field-row-tmp.tsx && git mv field-row-tmp.tsx field-row.tsx`. The phase does not mention this. (b) The sed command `s|/OldName|/new-name|g` will match partial paths: renaming `/Modals/` to `/modals/` will also match any import containing `/Modals/` as substring in other imports. (c) Any in-flight feature branch will have massive merge conflicts with dozens of renamed files.
- **Evidence:** Phase 7 says `git mv "src/path/OldName.tsx" "src/path/new-name.tsx"` -- this is the single-step rename that fails on Windows/NTFS. Plan metadata shows `branch: main` -- no protection from conflicts with parallel work.
- **Suggested fix:** Drop Phase 7 entirely, or defer it to a quiet period with explicit Windows two-step rename instructions. The naming convention can be enforced forward-only (new files only).

---

## Finding 5: Phase 1 splits 15 components in 3h -- that is 12 minutes per split including import updates and compile verification

- **Severity:** High
- **Location:** Phase 1 overview, "effort: 3h" for 15 component splits
- **Flaw:** AiMappingModal alone (622 -> 4 files) requires: reading 622 lines, identifying split boundaries, creating 3 new files, moving code, updating state/handler references across files, adding barrel re-exports, updating MappingModals.tsx imports, running tsc. This is easily 30-45 min for the first complex split. 15 splits in 3h is 12 min each -- unrealistic even with AI assistance for the 4-file splits.
- **Failure scenario:** Phase 1 runs over budget. At the 3h mark, only 8 of 15 splits are done. The remaining 7 are deferred but Phase 7 (rename) has already been planned assuming Phase 1 is complete. Schedule cascades.
- **Evidence:** AiMappingModal 622->4 files, FieldRow 411->3 files, FieldCatalogBoard 395->3 files are all complex multi-file splits. Plan allocates same 12 min each as trivial 2-file splits like ai-mapping-tab-tagging (220->2).
- **Suggested fix:** Phase 1 should be 5-6h, or scope-cut to only files >350L (5 components instead of 15). TemplatePickerModal (204L) being split is absurd -- it is 4 lines over the limit.

---

## Finding 6: "Zero business logic changes" is a false safety claim -- Phase 0C explicitly changes component APIs

- **Severity:** High
- **Location:** plan.md "Rules" section + Phase 0C
- **Flaw:** The plan states: "Zero business logic changes -- purely structural." Phase 0C changes: (a) prop interface from `onApply` to unified interface, (b) adds conditional rendering paths for `animated`/`embedded`, (c) deletes one component and changes import consumers. This is not "purely structural."
- **Failure scenario:** Reviewer or stakeholder approves plan based on "zero business logic changes" framing. Phase 0C introduces a regression in FinancialAnalysisModal behavior (animation timing, embedded mode edge case). The bug is discovered late because the plan promised no behavior changes, so nobody prioritized manual testing.
- **Evidence:** Phase 0C todo includes "Manual test both usage paths" -- the plan itself acknowledges this is not structure-only.
- **Suggested fix:** Reclassify Phase 0C as a behavior-affecting change. Either add explicit test coverage requirements, or drop Phase 0C from this refactor and track it separately.

---

## Finding 7: financial-field-catalog.ts (471L) -- second largest non-generated file -- completely missing from all phases

- **Severity:** Medium
- **Location:** All phases -- by omission
- **Flaw:** `src/lib/report/financial-field-catalog.ts` is 471 lines -- larger than every service in Phase 3. It is a data definition file that likely could benefit from splitting by financial domain (assets, liabilities, income, etc.). It appears in no phase.
- **Failure scenario:** This file keeps growing as new financial fields are added. After the refactor is "complete," the second-largest file in the codebase was never touched.
- **Evidence:** `wc -l` shows 471 lines. Only imported by `fs-store.ts` and itself. Not listed in any phase.
- **Suggested fix:** Add to Phase 6 (libs), or explicitly exempt data-catalog files from the 200-line rule (which would be reasonable for static data).

---

## Finding 8: Barrel re-export strategy creates permanent indirection debt

- **Severity:** Medium
- **Location:** plan.md "Rules" section, Phases 1-6 uniformly
- **Flaw:** Every split creates a barrel file that re-exports from sub-modules. After this refactor: ~60 new files, ~30+ barrel re-export files. Barrel files are a known anti-pattern in Next.js because they defeat tree-shaking and create circular dependency risks. The plan never mentions removing the barrels after migration -- they become permanent.
- **Failure scenario:** Bundle size increases because barrel re-exports pull in entire module graphs. New developers import from barrel (convenient) rather than specific sub-module, perpetuating the anti-pattern. Circular dependency warnings appear because barrel A re-exports from module that imports barrel B.
- **Evidence:** Phase 3: "data-io.service.ts -- re-export barrel + fullCustomerInclude shared constant (~60 lines)". Phase 1: "Barrel re-export from old filename for any external consumers." Every phase uses this pattern.
- **Suggested fix:** Use direct imports from the new sub-modules. Update all consumers during the split. No barrel files. The barrel-for-backward-compat argument does not apply when you are updating all import paths anyway (which you must to compile).

---

## Finding 9: Phase 6 has open-ended scope -- "scan at implementation time" is not a plan

- **Severity:** Medium
- **Location:** Phase 6, "Additional libs >200 lines" section
- **Flaw:** Phase 6 explicitly says: "Scan at implementation time" with a `find | wc -l` command. This is estimated at 1h total including xlsx-table-injector. If the scan finds 10 more files (plausible given Finding 1), Phase 6 blows its budget. If it finds zero, the phase was mis-scoped from the start.
- **Failure scenario:** The implementer runs the scan, discovers `financial-field-catalog.ts` (471L), `docx-engine.ts` (259L), `khcn-placeholder-registry.ts` (273L), `field-calc-expression-evaluator.ts` (229L), and 6 more libs >200L. The 1h estimate becomes 4h. Or the implementer interprets "scan" loosely and skips everything, making Phase 6 a single-file phase with overhead.
- **Evidence:** Phase 6 directly quotes: "Scan at implementation time: `find src/lib -name '*.ts' ...`". The `wc -l | head -20` will reveal at least 8 files >200L in src/lib/ alone.
- **Suggested fix:** Run the scan NOW during planning and list specific files. A plan that defers discovery to execution is not a plan.

---

## Finding 10: 20h effort for zero feature value -- no prioritization by impact

- **Severity:** Medium
- **Location:** plan.md, entire scope
- **Flaw:** The plan treats all 200+ line files equally. A 622-line modal used in one place gets the same priority as a 405-line invoice service used by every API route. No analysis of which files are most frequently modified (git churn), most imported (fan-in), or blocking other work. The 200-line rule is applied as dogma regardless of whether a split improves or harms the specific file.
- **Failure scenario:** 20h spent splitting files that rarely change and are well-understood by the team. Meanwhile, the frequently-modified hot files that cause real merge conflicts are deferred because they are "only" 340L. ROI of the refactor is near zero.
- **Evidence:** No `git log --format= --name-only | sort | uniq -c | sort -rn` analysis anywhere in the plan. No fan-in analysis. TemplatePickerModal (204L) is split despite being 4 lines over the limit and likely stable.
- **Suggested fix:** Run git churn analysis. Prioritize splits by: (high churn + high fan-in + >300L) first. Drop files that are stable and rarely imported. A 10h plan covering 20 high-impact files beats a 20h plan covering 50 files with no impact analysis.
