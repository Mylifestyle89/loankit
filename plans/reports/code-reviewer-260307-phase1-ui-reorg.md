# Code Review: Phase 1 - Field Editor UI Reorganization

**Date**: 2026-03-07
**Reviewer**: code-reviewer
**Branch**: Disbursement-Invoice-tracking-implement

## Scope
- **Files**: 11 files reviewed
- **LOC**: ~1922 total across reviewed files
- **Focus**: Sidebar decomposition, Zustand store state, props wiring, a11y, dark mode

## Overall Assessment

Refactoring well executed. MappingSidebar decomposed from 813 to 137 lines (thin shell) with 5 sub-components. Toolbar slimmed from 134 to 80 lines. All functionality preserved. TypeScript compiles clean (0 errors). Dark mode classes consistent throughout. Animation/transitions preserved with framer-motion.

---

## Critical Issues

None found.

---

## High Priority

### H1. DocxMergeModal exceeds 200-line limit (239 lines)
- **File**: `src/app/report/mapping/components/Modals/DocxMergeModal.tsx`
- **Impact**: Violates project code standard. Contains `downloadBlob` duplicated from `sidebar-data-io-section.tsx`.
- **Fix**: Extract `downloadBlob` to a shared utility (e.g., `src/lib/download-blob.ts`). This also fixes the DRY violation.

### H2. No keyboard dismiss (Escape) on MappingSidebar
- **File**: `src/app/report/mapping/components/MappingSidebar.tsx`
- **Impact**: Users cannot press Escape to close the sidebar. Backdrop click works, but keyboard a11y is incomplete.
- **Fix**:
```tsx
useEffect(() => {
  if (!isOpen) return;
  const handler = (e: KeyboardEvent) => { if (e.key === "Escape") closeSidebar(); };
  document.addEventListener("keydown", handler);
  return () => document.removeEventListener("keydown", handler);
}, [isOpen]);
```

### H3. Missing `role="dialog"` and `aria-modal="true"` on sidebar and DocxMergeModal
- **Files**: `MappingSidebar.tsx`, `DocxMergeModal.tsx`
- **Impact**: Screen readers cannot identify these as dialog surfaces.
- **Fix**: Add `role="dialog" aria-modal="true" aria-label="..."` to the sidebar panel `motion.div` and the modal container `div`.

---

## Medium Priority

### M1. TemplatePickerDropdown lacks click-outside dismiss
- **File**: `sidebar-template-picker-dropdown.tsx`
- **Impact**: Dropdown stays open when clicking elsewhere in the sidebar body. Only closes via explicit button toggle or item selection.
- **Fix**: Add a `useEffect` with `mousedown` listener or wrap with a transparent overlay to close on outside click.

### M2. `downloadBlob` duplicated in two files
- **Files**: `sidebar-data-io-section.tsx` (line 23-29), `DocxMergeModal.tsx` (line 47-56)
- **Impact**: DRY violation.
- **Fix**: Extract to `src/lib/download-blob.ts` and import in both places.

### M3. `sidebar-data-io-section.tsx` import name dialog not using BaseModal
- **File**: `sidebar-data-io-section.tsx` (lines 170-190)
- **Impact**: Inline portal dialog lacks `role="dialog"`, `aria-modal`, focus trapping. Consistent with project pattern of raw `div` modals, but BaseModal exists and should be preferred.
- **Fix**: Consider using BaseModal for the import name dialog.

### M4. `commonTemplates` memo is a no-op
- **File**: `sidebar-data-io-section.tsx` (line 51)
- `const commonTemplates = useMemo(() => allFieldTemplates, [allFieldTemplates]);` -- This memo returns the same reference, no transformation. Remove and use `allFieldTemplates` directly.

---

## Low Priority

### L1. Hardcoded Vietnamese strings in sidebar sub-components
- **Files**: All sidebar sub-components
- **Impact**: Mixed i18n usage. Some strings use `t()`, others are hardcoded Vietnamese (e.g., "Phân tich tai chinh", "Backup / Khoi phuc", "Chua mapping").
- **Note**: Toolbar also has hardcoded "Technical keys" and "Chua mapping". This is a pre-existing pattern, not a regression.

### L2. `sidebar-tools-section.tsx` reads `showTechnicalKeys` from store but toolbar also has this toggle
- **Files**: `MappingVisualToolbar.tsx` (line 50-55), `sidebar-tools-section.tsx` (line 51-56)
- **Impact**: Two UI controls for the same state. Not a bug (both use same Zustand store), but could confuse users.
- **Note**: Toolbar toggle is visible at all times; sidebar toggle is inside a collapsed section. Consider removing duplicate.

---

## Edge Cases Found

1. **Sidebar portal renders even when closed**: The `createPortal` call always executes; AnimatePresence handles visibility. This is fine for animation but means DOM nodes exist even when sidebar is hidden. No functional issue.

2. **Race condition unlikely but possible**: If user rapidly toggles sidebar while sub-component fetches templates, no guard exists. Current code handles this gracefully since store state is the source of truth.

3. **`pendingFileRef` in data-io-section**: If component unmounts while import name dialog is open, the ref becomes stale. The `pendingFileRef.current.target.value = ""` cleanup in `handleConfirmImportName` could throw. Low probability since sidebar is portaled.

4. **DocxMerge `outputName` sanitization**: `replace(/[^a-zA-Z0-9._-]+/g, "_")` strips Unicode/Vietnamese chars from filename. User might type Vietnamese output name and get underscores. The `safeTemplateName` in export block (line 70) has similar pattern.

---

## Positive Observations

1. Clean decomposition -- sidebar shell is a true thin wrapper delegating to focused sub-components
2. Zustand store usage is correct: sub-components read directly from stores (no prop drilling for store state)
3. Spring animation on sidebar (`damping: 28, stiffness: 300`) provides smooth feel
4. Proper `aria-label` on close button, proper `aria-hidden` on backdrop
5. Dark mode classes consistently applied (`dark:bg-`, `dark:text-`, `dark:border-`)
6. TypeScript compiles with zero errors
7. All file sizes under 200 lines except DocxMergeModal (239) and page.tsx (555, but page.tsx is a composition root)

---

## Recommended Actions (Priority Order)

1. **Extract `downloadBlob`** to shared utility -- fixes H1 (size) + M2 (DRY)
2. **Add Escape key handler** to MappingSidebar -- H2
3. **Add `role="dialog"` + `aria-modal`** to sidebar panel and DocxMergeModal -- H3
4. **Add click-outside dismiss** to TemplatePickerDropdown -- M1
5. **Remove no-op `commonTemplates` memo** -- M4

## Metrics
- **TypeScript**: 0 errors (clean compile)
- **File size compliance**: 10/11 files under 200 lines (DocxMergeModal at 239)
- **a11y gaps**: 3 (missing dialog role, missing Escape handler, missing click-outside on dropdown)

## Unresolved Questions

1. Is the duplicate "Technical keys" toggle in both toolbar and sidebar intentional UX? If so, should be documented. If not, remove from one location.
2. Should `page.tsx` (555 lines) be further decomposed, or is it acceptable as a composition root?
