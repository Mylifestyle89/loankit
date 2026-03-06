# Red Team Review: Field Editor UI Reorganization Plan
**Date:** 2026-03-07 | **Reviewer:** code-reviewer (adversarial mode)

---

## 1. CRITICAL Issues (Must Fix Before Implementation)

### 1.1 Phase ordering creates broken intermediate states
**Phases 1 and 2 have a hard bidirectional dependency that the plan treats as sequential.**

- Phase 1 Step 1 says "Remove `onOpenFinancialAnalysis`, `onOpenSnapshotRestore`, `ocrProcessing`, `onOcrFileSelected`" from toolbar.
- Phase 2 Step 2 says "Add OCR, Financial Analysis, Backup to sidebar-tools-section.tsx".
- **Problem:** If Phase 1 deploys before Phase 2 completes, these 3 features become completely inaccessible. There is no temporary home for them.
- **Impact:** Data loss risk -- users cannot trigger Backup/Restore during the gap. OCR workflow broken.
- **Fix:** Phase 1 and Phase 2 must be a single atomic phase, OR Phase 1 must keep the buttons hidden-but-functional until Phase 2 lands. The plan says "All removed actions still accessible via sidebar" in Phase 1 success criteria (line 83) but the sidebar doesn't receive them until Phase 2. This is a contradiction.

### 1.2 Sidebar state management not addressed
**Current sidebar uses internal `useState` for `isOpen`/`isCollapsed`. Plan moves control to toolbar toggle but never specifies where this state lives.**

- Phase 1 adds `onToggleSidebar` and `isSidebarOpen` as toolbar props (line 45-46).
- Phase 4 says "MappingSidebar not embedded in header" -- moved to page level.
- **Problem:** Currently `isOpen` is internal to `MappingSidebar.tsx` (line 104). If the toolbar needs `isSidebarOpen` and the sidebar needs to respond, this state must be lifted to `page.tsx` or a store. The plan never says which.
- `page.tsx` is already 579 lines. Adding sidebar state there pushes it further over the 200-line limit.
- **Fix:** Specify explicitly: sidebar open/collapsed state goes to `use-ui-store.ts` (which already manages filters and modals). Document the store shape change.

### 1.3 No rollback strategy
The plan says "No logic changes, only layout reorganization" (plan.md line 90). This is dangerously misleading:
- Moving OCR drop zone changes drag-and-drop target location (sidebar vs toolbar), which IS a logic change in how files are received.
- DOCX merge has its own `useReducer` with 56 lines of state management. Moving it to a sub-component requires careful prop/callback threading or the reducer moves too.
- If any phase breaks, there is no documented way to revert partially. Suggest: feature flag or conditional rendering approach.

---

## 2. MAJOR Concerns (Should Address)

### 2.1 OCR drag-and-drop UX regression
**Current:** OCR drop zone is in the toolbar -- always visible, large target area.
**Proposed:** Moved to sidebar "Tools" section, collapsed by default.

- Users must: (1) open sidebar, (2) expand "Tools" section, (3) find OCR upload area, (4) drag file there.
- Current flow: drag file to always-visible toolbar area.
- **This is a 3-step regression for a core workflow.** The research report (section 7) says toolbar should have "view filters/toggles" but OCR is an ACTION, not a view control. However, the toolbar/sidebar split doesn't account for high-frequency secondary actions.
- **Fix:** Keep a small "drop zone indicator" in the toolbar or canvas that activates on drag-over, even if the full OCR UI is in sidebar.

### 2.2 MappingSidebar FAB removal loses discoverability
**Current:** FAB at bottom-right with hint tooltip ("Bam vao day de dieu phoi du lieu") -- highly discoverable for new users.
**Proposed:** Small icon-only toggle in toolbar -- easy to miss.

- The plan removes the FAB (Phase 1 Step 4) and the hint tooltip (lines 365-377 of current sidebar).
- No replacement onboarding/discovery mechanism proposed.
- Power users: fine. New users: will not know the sidebar exists.
- **Fix:** Add first-time-use tooltip on the toolbar toggle button, or keep the hint mechanism.

### 2.3 page.tsx complexity not addressed
`page.tsx` is 579 lines and the plan adds MORE responsibility to it:
- Phase 3: "Wire MappingStatusBar in page.tsx" (new component + props)
- Phase 4: "Move MappingSidebar to page level"
- The plan never mentions modularizing page.tsx despite the 200-line rule.
- **Fix:** Plan should include extracting page.tsx orchestration into a custom hook or container component. At minimum, acknowledge the tech debt.

### 2.4 MappingSidebar prop explosion not solved
Current `MappingSidebarProps` has 22 props (lines 9-37). The plan splits into sub-components but doesn't specify how props flow:
- Does `sidebar-context-section.tsx` receive 8 props directly from page.tsx? Or does the shell pass them?
- If shell passes: still 22+ props to the shell, defeating the purpose.
- If sub-components read from stores directly: inconsistent with current prop-drilling pattern.
- **Fix:** Each phase file for Phase 2 should specify: "Sub-components read from Zustand stores directly" or "Props passed through shell". Pick one, document it.

### 2.5 Phase 3 bottom bar -- keyboard shortcut conflict
Plan says bottom bar gets Undo. Currently Undo is in header with `undoLastAction` from `useUndoStore`.
- Moving undo to bottom bar changes visual affordance but plan doesn't mention keyboard shortcut (Ctrl+Z).
- Research report section 8 mentions "Cmd+Z for undo" but the plan never implements keyboard shortcuts.
- If Undo moves visually but no keyboard shortcut exists, power users lose quick access.
- **Fix:** Add `useEffect` with `keydown` listener for Ctrl+Z / Cmd+Z in the status bar or page level. Document it.

### 2.6 DOCX merge tool placement questionable
Plan puts DOCX merge in sidebar "Tools" section. But current DOCX merge has:
- File picker, output name input, page break checkbox, merge button, status notices
- This is essentially a mini-form (~80 lines per plan estimate).
- Cramming this into a collapsed sidebar section alongside OCR + Financial Analysis + Backup makes "Tools" section bloated.
- **Fix:** Consider making DOCX merge a modal (like Financial Analysis already is), triggered by a button in Tools section. This follows the plan's own progressive disclosure principle.

---

## 3. MINOR Suggestions (Nice to Have)

### 3.1 Phase 5 scope too vague
Phase 5 "Polish & Consistency" is a checklist of 20+ items with no clear acceptance criteria beyond "visual consistency". This is scope creep territory -- it could take hours reviewing every component.
- **Suggestion:** Limit Phase 5 to ONLY components modified in Phases 1-4. Don't touch `FieldRow.tsx`, `FieldCatalogBoard.tsx`, or `EditingTemplateBanner.tsx` unless they have actual inconsistencies caused by this refactor.

### 3.2 No mobile/responsive consideration
- Plan.md layout diagram assumes wide screen (toolbar + canvas + sidebar side-by-side).
- Current toolbar already uses `flex-wrap` and `md:w-auto` for responsiveness (line 45-46 of toolbar).
- Plan doesn't mention: what happens to sidebar on mobile? Does bottom bar stack?
- **Suggestion:** Add a responsive note: sidebar becomes full-screen overlay on `< md` breakpoints.

### 3.3 Import name dialog portal ownership unclear
Phase 2 Step 5 says "Import name dialog (keep here, it's a portal)". But if MappingSidebar shell shrinks to ~150 lines, the dialog logic (lines 136-166 of current sidebar) adds ~30 lines of handlers. This is fine but should be documented as intentional exception to the "shell is just a container" principle.

### 3.4 Missing test plan
No phase mentions testing. Given this is a pure UI refactor:
- At minimum: TypeScript compilation check after each phase.
- Ideally: manual test checklist (open sidebar, import file, export CSV, OCR drag, DOCX merge, undo, etc.).
- **Suggestion:** Add a QA checklist to plan.md.

### 3.5 Sidebar `isCollapsed` mode removed without justification
Phase 5 line 22: "Sidebar width: 400px expanded, 0 collapsed (no 72px collapsed mode)".
Current sidebar has a 72px collapsed mode (line 401: `isCollapsed ? 72 : 400`). Removing this means sidebar is either fully open or fully closed -- users lose the "peek" mode.
- **Suggestion:** Justify why 72px collapsed mode is removed, or keep it.

### 3.6 Hardcoded Vietnamese strings
Multiple new UI elements in the plan use hardcoded Vietnamese. The codebase has `useLanguage()` with `t()` for i18n. New components should use `t()` keys, not raw Vietnamese strings.

---

## 4. Attack Vector Summary

| Vector | Severity | Finding |
|--------|----------|---------|
| Missing functionality | CRITICAL | OCR/Backup/Analysis inaccessible between Phase 1 and Phase 2 |
| Regression risk | CRITICAL | Phase ordering creates broken state |
| Technical gaps | CRITICAL | Sidebar state management location unspecified |
| User disruption | MAJOR | OCR drag-drop becomes 3 extra steps |
| User disruption | MAJOR | FAB removal loses discoverability |
| Over-engineering | MINOR | Phase 5 scope creep risk |
| Mobile/responsive | MINOR | No responsive strategy documented |
| Performance | LOW | Sub-component split is fine -- React memoization handles it |

---

## 5. Verdict

### APPROVE WITH CONDITIONS

The plan's direction is sound -- the current UI IS cluttered, the research is solid, and the proposed layout follows industry patterns. However, it has 3 critical implementation gaps that will cause breakage if not fixed:

**Conditions for approval:**
1. **Merge Phase 1 and Phase 2 into a single atomic phase**, or add explicit "temporary keep" for removed toolbar actions until sidebar receives them.
2. **Specify sidebar state management location** -- recommend `use-ui-store.ts` with `sidebarOpen: boolean`.
3. **Add drag-over fallback for OCR** -- even a thin drop zone on the canvas area, so drag-and-drop workflow doesn't regress to 4 clicks.

If these 3 conditions are met, the plan is safe to implement.

---

## Unresolved Questions

1. Will the DOCX merge `useReducer` state live in the sub-component or be lifted? If lifted, where?
2. Does removing the 72px collapsed sidebar mode affect any existing user workflows?
3. Should `page.tsx` be modularized as part of this plan or deferred?
