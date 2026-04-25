# Phase 4: Frontend DRY & Accessibility

**Priority:** IMPORTANT | **Effort:** 3h | **Status:** pending | **Deps:** Phase 2

## Reports Reference

- Frontend #4, #5, #6, #7, #8, #9

## Implementation Steps

### 4.1 Extract shared CustomerForm component

- [ ] Create `src/app/report/customers/components/customer-form.tsx`
- [ ] Extract shared form fields/logic from `customers/new/page.tsx` and `customers/[id]/page.tsx`
- [ ] Accept `mode: "create" | "edit"` and `initialData` props
- [ ] Both pages import and use CustomerForm

### 4.2 Consolidate inputCls to shared-form-styles.ts

**File:** `src/app/report/customers/[id]/components/shared-form-styles.ts`
- [ ] Remove duplicate `inputCls` from `customers/[id]/page.tsx`
- [ ] Remove duplicate from `customers/new/page.tsx`
- [ ] Remove duplicate from `src/components/invoice-tracking/loan-edit-modal.tsx`
- [ ] Remove duplicate from `loans/new/page.tsx`
- [ ] All import from `shared-form-styles.ts`

### 4.3 Migrate modals to BaseModal

After Phase 2 fixes BaseModal, migrate:

- [ ] `src/components/invoice-tracking/loan-edit-modal.tsx`
- [ ] `src/components/invoice-tracking/beneficiary-modal.tsx` (if exists)
- [ ] `src/components/invoice-tracking/disbursement-form-modal.tsx`
- [ ] Add `role="dialog"`, `aria-modal="true"` via BaseModal

### 4.4 Remove setTimeout(0) wrappers

- [ ] `src/app/report/customers/page.tsx` — remove setTimeout around initial fetch
- [ ] `src/app/report/customers/[id]/page.tsx` — same
- [ ] Template page and build-export-tab — same
- [ ] Call fetch directly in useEffect

### 4.5 Fix TypeScript types

**File:** `src/app/report/customers/[id]/page.tsx`
- [ ] Replace `any[]` in FullCustomer type (~line 39-40) with proper types
- [ ] Remove `(c as any).cccd_old` cast (~line 120) — add field to type or remove

### 4.6 Split use-ocr-store.ts

**File:** `src/app/report/mapping/stores/use-ocr-store.ts` (255 lines)
- [ ] Extract action functions (accept/decline/bulk) to `use-ocr-actions.ts`
- [ ] Keep store state definition in original file

## Success Criteria

- No duplicate form code between new/edit customer pages
- Single source of truth for inputCls
- All modals use BaseModal with proper a11y
- No unnecessary setTimeout(0) patterns
