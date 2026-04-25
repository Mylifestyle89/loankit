# Phase 2: Critical Frontend Fixes

**Priority:** CRITICAL | **Effort:** 2h | **Status:** pending

## Reports Reference

- Frontend #1, #2, #3

## Implementation Steps

### 2.1 Add try-catch to customer pages

**File:** `src/app/report/customers/[id]/page.tsx`
- [ ] Wrap `loadCustomer()` (~line 100) fetch in try-catch
- [ ] Set error state, display error UI on failure

**File:** `src/app/report/customers/new/page.tsx`
- [ ] Wrap `handleSubmit` (~line 41) fetch in try-catch
- [ ] Show toast/error on failure

### 2.2 Fix BaseModal accessibility

**File:** `src/components/ui/BaseModal.tsx`
- [ ] Add `useEffect` with Escape keydown listener calling `onClose`
- [ ] Add `role="dialog"` and `aria-modal="true"` to modal container
- [ ] Add optional focus trap (trap-focus on mount, restore on unmount)
- [ ] Ensure X button or Escape always available to close

### 2.3 Document dangerouslySetInnerHTML usage

**File:** `src/app/layout.tsx`
- [ ] Add comment at line 36 explaining this is intentional for theme flash prevention, hardcoded string only, no XSS risk

## Success Criteria

- Customer pages handle network errors gracefully
- BaseModal supports Escape key and proper ARIA attributes
