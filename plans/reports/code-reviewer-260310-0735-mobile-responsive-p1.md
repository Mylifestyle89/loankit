# Code Review: Mobile Responsive Phase 1

**Date:** 2026-03-10
**Reviewer:** code-reviewer
**Branch:** Deploy-test

## Scope
- Files: 8
- Focus: Mobile responsive CSS additions (hamburger menu, sidebar, modal widths)

## Overall Assessment

Solid mobile-first implementation. Desktop behavior preserved in most cases. A few CSS conflict risks and minor a11y gaps found.

## Critical Issues

None found.

## High Priority

### 1. Framer Motion `animate={{ width }}` conflicts with Tailwind `max-md:w-[240px]`
**File:** `src/app/report/layout.tsx` (line 101-103)

Framer Motion applies inline `style.width` via its `animate` prop. On mobile (`max-md`), Tailwind sets `w-[240px]` via CSS class. **Inline styles from Framer Motion have higher specificity than CSS classes**, so the `max-md:w-[240px]` will be overridden by the JS-animated width (which toggles between 48px and 240px on hover/expand).

**Impact:** On mobile, hovering the sidebar (unlikely on touch, but possible on tablets with mouse) or when `mobileOpen=false` and `hovered=false`, Framer Motion sets width to 48px inline, which overrides the CSS 240px. When `mobileOpen=true`, `expanded=true` so Framer animates to 240px -- this works but by coincidence, not by design.

**Recommendation:** Use conditional animation values based on viewport or disable Framer Motion width animation on mobile:
```tsx
// Option A: Skip Framer width on mobile
animate={{ width: isMobile ? undefined : (expanded ? SIDEBAR_EXPANDED : SIDEBAR_COLLAPSED) }}
// And rely purely on CSS for mobile width

// Option B: Use CSS !important (less clean)
// max-md:!w-[240px]
```
Since mobile sidebar is hidden via `translate-x` when closed, the width conflict is cosmetically invisible but architecturally fragile. A future developer adding hover interactions could trigger unexpected behavior.

### 2. z-index layering inconsistency between sidebar and modals
**File:** `src/app/report/layout.tsx`

Current z-index map:
- Backdrop (mobile): `z-40`
- Sidebar (desktop): `z-40`, mobile override: `max-md:z-50`
- Hamburger button: `z-50`
- BaseModal: `z-[160]`
- MappingSidebar (right): `z-[100]` / `z-[101]`
- FinancialAnalysisModal: `z-50` (customers page) and `z-[160]` (mapping page)

**Issue:** The export modal in `customers/page.tsx` (line 268) uses `z-50`, same as the mobile sidebar. If a user opens the export modal on mobile with sidebar open, they'll visually overlap at the same z-level.

**Recommendation:** Use `z-[60]` or higher for page-level modals that aren't using BaseModal. Or migrate the export modal to `BaseModal` (which uses `z-[160]`).

## Medium Priority

### 3. `max-md:py-3` increases nav link tap targets -- good, but inconsistent
**File:** `src/app/report/layout.tsx` (line 177)

Nav links get `max-md:py-3` for larger tap targets. However, the bottom control buttons (language, logout) at lines 211, 231 use `max-md:py-2.5` instead. The AI CTA button has no mobile padding override. Minor inconsistency but won't break anything.

### 4. Export modal in customers page not responsive for mobile
**File:** `src/app/report/customers/page.tsx` (line 269, 280)

The export modal uses `grid grid-cols-2 gap-8` (line 280) with no mobile breakpoint. On a phone screen, the two-column layout (customers + templates) will be cramped. Add `grid-cols-1 md:grid-cols-2` for stacking on mobile.

Also: fixed `h-[80vh]` is used instead of `max-h-[80vh]`, which means content shorter than 80vh still takes full height.

### 5. Mobile sidebar does not trap focus
**File:** `src/app/report/layout.tsx`

When `mobileOpen=true`, keyboard focus can still tab to elements behind the backdrop. For WCAG 2.1 compliance, consider adding focus trapping (e.g., `focus-trap-react` or manual implementation). The close-on-Escape is correctly implemented via the `useEffect` on line 53 (implicit via route change).

**Note:** Actually, there's no explicit Escape handler for the mobile sidebar -- it only closes on route change and backdrop click. Add:
```tsx
useEffect(() => {
  if (!mobileOpen) return;
  const handler = (e: KeyboardEvent) => { if (e.key === "Escape") setMobileOpen(false); };
  window.addEventListener("keydown", handler);
  return () => window.removeEventListener("keydown", handler);
}, [mobileOpen]);
```

### 6. BaseModal `overflow-y-auto` on the dialog panel
**File:** `src/components/ui/BaseModal.tsx` (line 52)

Adding `max-h-[calc(100vh-2rem)] overflow-y-auto` to the dialog panel is correct for mobile scroll. However, modals with sticky headers/footers (like FinancialAnalysisModal) handle their own scroll internally with `flex flex-col` + inner `overflow-y-auto`. When a child modal manages its own scroll and the parent BaseModal also has `overflow-y-auto`, nested scrolling could occur.

Currently BaseModal is not used by FinancialAnalysisModal (it has custom overlay), so no actual conflict today. But worth noting for future modals using BaseModal with sticky footers.

## Low Priority

### 7. `max-w-[95vw]` pattern is consistent but could be a shared constant
Files: AiMappingModal, FinancialAnalysisModal (x2), customers/page, disbursement-form-modal

All use `max-w-[95vw]` for mobile width. Consider a Tailwind preset or shared class to maintain consistency. Not urgent.

### 8. MappingSidebar width change
**File:** `src/app/report/mapping/components/MappingSidebar.tsx` (line 73)

Changed from fixed `width: 380px` (inline style) to `w-full max-w-[380px]` (Tailwind classes). This is a correct improvement -- allows the right sidebar to shrink on narrow screens while capping at 380px. No desktop behavior change. Good.

## Desktop Behavior Verification

| Component | Desktop preserved? | Notes |
|---|---|---|
| Sidebar collapse/expand | Yes | `max-md:` prefixes only affect mobile |
| Hamburger button | Yes | `md:hidden` hides on desktop |
| Backdrop | Yes | `md:hidden` hides on desktop |
| Modal widths | Yes | `md:max-w-*xl` restores desktop width |
| Nav tap targets | Yes | `max-md:py-3` only on mobile |
| MappingSidebar | Yes | `max-w-[380px]` same max as before |

## Positive Observations

- Route-change auto-close for mobile sidebar (line 53) -- clean pattern
- Backdrop click properly closes sidebar
- `will-change: width` on sidebar for GPU acceleration
- Consistent use of `max-md:` prefix (additive mobile styles, not modifying desktop)
- BaseModal scroll fix is minimal and correct
- MappingSidebar width change is an improvement over inline styles

## Recommended Actions (prioritized)

1. **HIGH** -- Address Framer Motion width vs CSS width conflict on mobile sidebar (consider `isMobile` check or CSS `!important`)
2. **HIGH** -- Fix export modal z-index (z-50 conflicts with mobile sidebar z-50)
3. **MEDIUM** -- Add Escape key handler for mobile sidebar
4. **MEDIUM** -- Make export modal grid responsive (`grid-cols-1 md:grid-cols-2`)
5. **LOW** -- Consider focus trapping for mobile sidebar overlay
6. **LOW** -- Standardize mobile tap target padding across all sidebar items

## Unresolved Questions

- Is tablet (768px-1024px) in scope for this phase? The `md:` breakpoint at 768px means iPad portrait gets mobile layout. Verify this is intentional.
- Should the hamburger button be hidden when a modal with high z-index is open? Currently it stays visible at z-50, below BaseModal (z-160) but above some page-level modals.
