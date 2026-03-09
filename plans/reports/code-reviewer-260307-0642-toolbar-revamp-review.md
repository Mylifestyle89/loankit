# Code Review: Toolbar Revamp for Field Editor UI

**Score: 7/10**

## Scope
- **Files reviewed**: 7 (3 new, 4 modified)
- **LOC**: ~1,300 across all files
- **Focus**: Toolbar icon buttons, CustomerPicker/TemplatePicker modals, sidebar simplification

## Overall Assessment

Clean implementation with good visual consistency (violet/fuchsia design system). Toolbar refactor successfully centralizes 5 key actions into grouped icon buttons with a separate search/filter row. Modals follow portal pattern correctly. Several accessibility gaps and one security concern need attention.

---

## Critical Issues

### 1. Both new modals missing `role="dialog"` and `aria-modal="true"`

**Files**: `CustomerPickerModal.tsx` (L106-113), `TemplatePickerModal.tsx` (L76-83)

The modal container `<div>` lacks ARIA dialog semantics. Screen readers won't announce these as dialogs. Contrast with `MappingSidebar.tsx` L70-72 which does it correctly.

```tsx
// Fix: Add to the inner modal div
<div role="dialog" aria-modal="true" aria-label="Chon khach hang" className="w-full max-w-lg ...">
```

### 2. No focus trap in either modal

Both modals allow Tab key to escape the modal and reach background content. `MappingSidebar` also lacks this but it's a pre-existing issue. New modals should use a focus-trap solution.

---

## High Priority

### 3. `AnimatePresence` missing on both modals

**Files**: `CustomerPickerModal.tsx`, `TemplatePickerModal.tsx`

Both use `motion.div` with `exit` props but are NOT wrapped in `<AnimatePresence>`. Exit animations will never play. The `MappingSidebar` correctly wraps in `AnimatePresence`.

```tsx
// Fix: Wrap portal content in <AnimatePresence>
{isOpen && createPortal(
  <AnimatePresence>
    <motion.div exit={{ opacity: 0 }} ...>
```

Note: Currently both modals return `null` when `!isOpen`, so AnimatePresence would also need the conditional rendering pattern adjusted (render AnimatePresence always, conditionally render children inside).

### 4. CustomerPickerModal: no XSS sanitization on user input sent to API

**File**: `CustomerPickerModal.tsx` L65-73

`newCode`, `newName`, `newAddress` are sent directly to `POST /api/customers` without any client-side sanitization. The API route uses Zod validation (`z.string().min(1)`) which only checks presence, not content. HTML/script injection could be stored in DB.

**Mitigation**: Server-side Zod schema should add `.trim()` and consider `.max()` length limits. Client-side: add `maxLength` to inputs.

### 5. `page.tsx` exceeds 200-line limit significantly (636 lines)

This is a pre-existing issue but the toolbar changes added more state (`customerPickerOpen`, `templatePickerOpen`, `toolbarUploadRef`) making it worse. The page file is the largest in the mapping module. Consider extracting modal orchestration into a custom hook (e.g., `useModalOrchestration`).

---

## Medium Priority

### 6. ToolbarActionButton: `onClick` fires even when disabled

**File**: `toolbar-action-button.tsx` L29

The `disabled` HTML attribute on `<button>` does prevent click in standard browsers, so this works. However, `onClick` prop is still passed. No actual bug, but for safety consider:
```tsx
onClick={disabled ? undefined : onClick}
```

### 7. Hardcoded Vietnamese strings in new modals

**Files**: Both new modals

`CustomerPickerModal` and `TemplatePickerModal` use hardcoded Vietnamese text ("Chon khach hang", "Ma KH va Ten KH la bat buoc", etc.) instead of the `useLanguage()` / `t()` i18n system. The toolbar correctly passes `t` for search placeholder. Inconsistent.

### 8. Duplicate CSS class strings across modals

Both modals repeat identical input classes, button classes, header styles. Consider extracting shared modal styles to a constants file or using the existing `form-styles.ts` pattern from invoice-tracking.

### 9. Hidden toolbar search row uses `opacity-0 + h-0` hack

**File**: `MappingVisualToolbar.tsx` L93-96

```tsx
!hasContext ? "opacity-0 pointer-events-none h-0 overflow-hidden p-0 border-0" : "opacity-100"
```

This keeps the element in DOM with zero height. Cleaner approach: conditionally render or use `hidden` class. The current approach may cause layout flicker on context load.

### 10. `TemplatePickerModal` "Apply template" button disabled logic

**File**: `TemplatePickerModal.tsx` L164

`disabled={!selectedFieldTemplateId}` — this uses the STORE's currently selected template, not what the user just clicked in the modal list. If the user clicks a different template, the button stays disabled until `onSelect` fires (which closes the modal). The "Apply template" button behavior seems disconnected from modal selection UX.

---

## Low Priority

### 11. `closeSidebar` reference in effect dependency

**File**: `MappingSidebar.tsx` L41 — `closeSidebar` is not in the dependency array of the Escape key effect. It's stable (defined as inline arrow calling store setter) so no bug, but ESLint `react-hooks/exhaustive-deps` would flag this.

### 12. Portal target pattern duplication

All 3 components (`CustomerPickerModal`, `TemplatePickerModal`, `MappingSidebar`) duplicate the same `useState<HTMLElement | null>(null)` + `useEffect(() => setPortalTarget(document.body))` pattern. Could extract to a `usePortalTarget()` hook.

---

## Positive Observations

- `ToolbarActionButton` is well-typed, concise (37 lines), reusable with clear active/disabled states
- `SEPARATOR` constant in toolbar is a clean visual grouping approach
- Customer creation form has proper loading state, error handling, and disabled button when fields empty
- Sidebar correctly uses `role="dialog"`, `aria-modal`, `aria-label`
- API route has proper Zod validation and error handling with `toHttpError`
- `TemplateRow` extracted as sub-component for readability
- Search/filter row correctly hidden when no context loaded

---

## Recommended Actions (Priority Order)

1. **Add `role="dialog"` + `aria-modal="true"`** to both new modals
2. **Wrap modal content in `<AnimatePresence>`** for exit animations
3. **Add `maxLength` to customer creation inputs** + server-side `.max()` in Zod schema
4. **Add i18n** via `useLanguage()` to both new modals
5. **Extract portal target hook** to reduce duplication
6. **Plan `page.tsx` refactor** — extract modal orchestration to reduce file size

## Metrics
- Type Coverage: Good — all props typed, no `any`
- Linting Issues: ~2 (missing deps in effects)
- File Size Violations: `page.tsx` (636 lines), `CustomerPickerModal` (230 lines), `TemplatePickerModal` (202 lines)

## Unresolved Questions
- Is `BaseModal` (at `src/components/ui/BaseModal.tsx`) intentionally not used in the mapping module? Only 2 of ~20 modals in this module use it. Standardizing would fix a11y gaps.
- The "Apply template" button in `TemplatePickerModal` — should it reflect the row the user clicked in the list, or the store's currently-selected template?
