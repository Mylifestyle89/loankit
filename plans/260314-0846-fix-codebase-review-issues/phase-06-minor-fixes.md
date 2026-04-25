# Phase 6: Minor Cleanups

**Priority:** MINOR | **Effort:** 2h | **Status:** pending | **Deps:** Phases 3, 4, 5

## Reports Reference

- Backend M1, M3, M4
- Core Lib #10, #13, #15, #17
- Frontend #10, #12, #14

## Implementation Steps

### 6.1 Split customer.service.ts (474 lines)

- [ ] Extract `saveFromDraft`/`toDraft` to `src/services/customer-draft.service.ts`

### 6.2 Fix silently swallowed errors

- [ ] `src/components/invoice-tracking/beneficiary-modal.tsx:54` — add toast on catch
- [ ] `src/components/invoice-tracking/disbursement-form-modal.tsx:96,111` — add toast on catch
- [ ] `src/app/report/customers/components/customer-summary-cards.tsx:72` — show error state

### 6.3 Standardize error message language

- [ ] Pick Vietnamese for user-facing, English for logs
- [ ] Audit error messages across `src/lib/` and `src/core/` for consistency

### 6.4 Extract normalizeGroupPath to shared util

- [ ] Create shared function used by both `mapping-engine.ts:26` and `reverse-template-matcher.ts:35`

### 6.5 Move hardcoded Vietnamese to i18n

- [ ] Tab labels in `customers/[id]/page.tsx:58-64`
- [ ] Subtab labels in `loan-edit-modal.tsx:135`
- [ ] Move to translation constants file

### 6.6 Document toNumber dot behavior

- [ ] Add prominent JSDoc comment on `toNumber` in `field-calc.ts` explaining VN format convention

### 6.7 Add localStorage size guard for mapping store

- [ ] `src/app/report/mapping/stores/` — add max size check before persisting
- [ ] Evict oldest entries if exceeding threshold (e.g., 5MB)

### 6.8 Remove setTimeout(0) cleanup

- [ ] Already covered in Phase 4.4 — verify no remaining instances

## Success Criteria

- No silent error swallowing
- Consistent error language convention
- No dead code or duplicated utils
