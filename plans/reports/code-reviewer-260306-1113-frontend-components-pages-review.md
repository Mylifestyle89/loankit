# Frontend Components & Pages Review

## Scope
- **Files reviewed:** 68 (14 pages, 7 stores, 1 notification store, 20+ mapping components, 16 invoice-tracking components, 8 shared/UI components)
- **Focus:** All frontend code in `src/app/report/` and `src/components/`
- **Scout findings:** Polling leak, useEffect dependency conflicts, missing error handling on fetch, DRY violations in form components, file size violations

## Overall Assessment
The codebase is **functionally solid** with good modularization of the mapping page via custom hooks and Zustand stores. Dark mode support is thorough. The invoice-tracking module is well-structured with reusable components. However, there are several important issues around **memory leaks, effect conflicts, missing accessibility, inconsistent error handling, and files exceeding 200-line limit**.

---

## Critical Issues (must fix)

| # | File | Line | Issue | Recommendation |
|---|------|------|-------|----------------|
| C1 | `notification-bell.tsx` | 17 | **Memory leak: `startPolling()` called but `stopPolling()` never called.** The `setInterval` in the notification store runs forever, even after unmount. | Add `useEffect(() => { startPolling(); return () => stopPolling(); }, [startPolling, stopPolling]);` |
| C2 | `system-operations/page.tsx` | 111-114 | **Fabricated import summary data.** `customersNew` and `customersUpdated` are calculated as `Math.floor(count * 0.6)` and `Math.ceil(count * 0.4)` -- these are fake estimates, not real data. Users see false information. | Either return real new/updated counts from the API, or remove the breakdown and show only total count. |
| C3 | `disbursements/[id]/page.tsx` | 67-73 | **No error handling on `handleMarkPaid` and `handleDeleteInvoice`.** `await fetch(...)` without try-catch; if it fails, no user feedback and `loadData` still runs. Response status is not checked. | Wrap in try-catch, check `res.ok`, show error to user. |
| C4 | `loans/page.tsx` | 42-46 | **Unhandled promise in useEffect.** `fetch("/api/customers").then(...)` has no `.catch()`. Network failure will cause unhandled promise rejection. | Add `.catch(() => {})` or convert to async function with try-catch. |

---

## Important Issues (should fix)

| # | File | Line | Issue | Recommendation |
|---|------|------|-------|----------------|
| H1 | `template/page.tsx` | 257-276 | **Conflicting useEffects causing infinite loops.** Effect at L263 sets `selectedFieldKey` when `fieldsInSelectedGroup` changes and key is empty. Effect at L270 ALWAYS resets `selectedFieldKey` when `fieldsInSelectedGroup` changes. These conflict and the second always wins, making the first redundant. Additionally, L270 depends on `fieldsInSelectedGroup` which is a `useMemo` output that changes ref every time `selectedGroup` changes, which triggers L270, which triggers a re-render. | Remove the effect at L263 (it's dead code since L270 always overrides). Keep only L270 and L279. |
| H2 | `template/page.tsx` | 279-294 | **Effect depends on `fieldsByGroup` (object ref changes on every render when `availableFieldCatalog` changes).** This effect resets group/field when `selectedFieldTemplateId` changes, but also fires when `fieldsByGroup` changes for other reasons. | Move `fieldsByGroup` dependency out; use `selectedFieldTemplateId` as sole trigger and compute groups inside the effect. |
| H3 | `mapping/page.tsx` | 1-576 | **576-line page component.** Despite extracting hooks, the page still subscribes to 40+ individual store selectors and passes 100+ props to children. This causes the entire tree to re-render on any single store field change. | Use Zustand selectors with `shallow` compare, or let child components subscribe directly to stores instead of prop-drilling. |
| H4 | `FinancialAnalysisModal.tsx` | 1-772 | **772-line component.** Exceeds 200-line limit by 3.8x. Contains sub-components, constants, helpers, and 4-step wizard logic all in one file. | Extract `SummaryCard`, `CollapsibleSection`, `FinancialTable`, `AiResultRow` to separate files. Extract step content into separate components. |
| H5 | `disbursement-form-modal.tsx` | 1-563 | **563-line component.** Complex form with beneficiary management and invoice sub-forms. | Extract `BeneficiarySection` to its own file (it's already a separate function but in the same file). Extract constants and helpers. |
| H6 | `customers/page.tsx` | 249-349 | **Inline modal instead of using BaseModal.** Export modal is a raw div with `fixed inset-0`, duplicating pattern that `BaseModal` already provides (escape key, backdrop, animation). | Refactor to use `BaseModal` component. |
| H7 | `customers/page.tsx` | 1-353 | **353-line component** with inline modal, export logic, and import logic all in one file. | Extract export modal and import handler into separate components. |
| H8 | `runs/page.tsx` | 46-64 | **`flushZustandDraft` accesses store outside React** via `useMappingDataStore.getState()`. This is fine for Zustand, but the function is defined at module level and called from event handlers. The `try { await flushZustandDraft(); } catch { /* best-effort */ }` pattern silently swallows errors including network failures. | At minimum, log errors. Consider showing a toast/warning that draft sync failed. |
| H9 | `disbursement-form-modal.tsx` | 47-48 | **Module-level mutable state `_tempId`.** This counter persists across component instances and never resets. Not a bug per se, but unexpected for SSR. | Use `useRef` or `crypto.randomUUID()` instead. |
| H10 | `use-notification-store.ts` | 39-63 | **`fetchNotifications` uses `globalThis.fetch`** instead of `fetch`. Unusual pattern, though functionally equivalent in browser. More importantly, the function checks `data.ok` (custom field) but not `res.ok` (HTTP status). A 500 response would be treated as success if body has `ok: true`. | Check `res.ok` before parsing JSON. Use regular `fetch`. |
| H11 | `invoices/page.tsx` | 43-49 | **Double-fetch on mount.** `useEffect` at L43 fetches customers and summary, then `useEffect` at L69 (which runs `loadData`) also fetches summary again. On initial render, summary is fetched twice. | Remove the initial summary fetch from L47-49 since `loadData` handles it. |

---

## Minor Issues (nice to fix)

| # | File | Line | Issue | Recommendation |
|---|------|------|-------|----------------|
| M1 | `customers/page.tsx` | 58-63 | **Unnecessary `setTimeout(0)` wrapper** for loading data. This was likely to avoid React 18 batching issues but is unnecessary. Same pattern in `customers/[id]/page.tsx:69`, `template/page.tsx:94`, `runs/page.tsx:103`. | Remove the setTimeout; call directly. |
| M2 | `layout.tsx` | 107-111 | **`window.dispatchEvent(new CustomEvent(...))` for cross-component communication.** Fragile coupling between layout and mapping page. | Consider using a lightweight Zustand action or callback instead. |
| M3 | `loans/[id]/page.tsx` | 69 | **`useRef<ReturnType<typeof setTimeout>>(undefined)`** -- passing `undefined` as initial value, could use `null`. Minor style. | Use `useRef<ReturnType<typeof setTimeout> \| null>(null)`. |
| M4 | `add-invoice-from-loan-modal.tsx` | 38 | **`handleChange` uses `string` type for key** instead of `keyof typeof form`. No type safety on which keys are valid. | Type the key parameter as `keyof typeof form`. |
| M5 | All invoice-tracking modals | Various | **No focus trap in custom modals.** Modals built with raw `div` (not `BaseModal`) don't trap focus. Tab key can reach elements behind the modal backdrop. | Use `BaseModal` or add focus trap (e.g., `@radix-ui/react-focus-scope`). |
| M6 | `beneficiary-modal.tsx` | 153 | **Unused `formData`** variable created but never used (the comment says "Send as JSON since we already parsed client-side"). | Remove the dead code `const formData = new FormData();`. |
| M7 | All custom modals | Various | **No `aria-label` or `role="dialog"`** on invoice-tracking modals (`invoice-form-modal`, `loan-edit-modal`, `disbursement-form-modal`, `beneficiary-modal`). `BaseModal` has `role="dialog"` and `aria-modal`, but the manually-built modals don't. | Add `role="dialog"` and `aria-modal="true"` to all modal containers. |
| M8 | `customers/new/page.tsx` + `customers/[id]/page.tsx` | All | **DRY violation.** Both files have nearly identical form markup (8 fields, same class names, same pattern). ~120 lines of duplicated JSX. | Extract a shared `CustomerForm` component. |
| M9 | `template/page.tsx` | 1-498 | **498-line component.** All editor logic, field injection, template selection in one file. | Extract editor section and field injection toolbar into separate components. |
| M10 | `system-operations/page.tsx` | 1-302 | **302-line component.** Import preview modal is inline. | Extract the import preview modal into a separate component. |
| M11 | `disbursement-form-modal.tsx` | 116 | **`any[]` type used** for beneficiary lines fetched from API. | Define a proper type for the API response shape. |
| M12 | `loans/page.tsx` | 50-56 | **Delete handler doesn't disable button** or show loading state. User can double-click and trigger multiple delete requests. | Add loading state per row or disable the button during the request. |

---

## Positive Patterns

- **Zustand store design is excellent.** Clean separation into 7 stores with well-defined responsibilities. The `use-mapping-data-store` correctly uses `persist` middleware with `partialize` to avoid persisting transient state. `setTemplateData` batch method prevents triple re-renders.
- **Lazy dynamic import in `use-ocr-store.ts`** to avoid circular module references between stores is a smart pattern.
- **`BaseModal` component** provides consistent modal behavior (escape key, backdrop animation, role/aria-modal). Used by newer components.
- **Mapping page modularization** into 14 custom hooks is well-executed. Each hook has a clear single responsibility.
- **Dark mode support** is thorough and consistent across all components.
- **`useMemo` usage** is generally appropriate (computed values in template page, mapping page).
- **Notification store** has a clean polling pattern with `startPolling`/`stopPolling` lifecycle.
- **`DisbursementTable`** correctly uses `rowSpan` for grouped display.
- **`AiResultRow` is `memo`-ized** to prevent re-renders when editing individual fields in the financial analysis modal.

---

## Summary

- **Total files reviewed:** 68
- **Critical:** 4 | **Important:** 11 | **Minor:** 12
- **Files exceeding 200 lines:** `mapping/page.tsx` (576), `FinancialAnalysisModal.tsx` (772), `disbursement-form-modal.tsx` (563), `customers/page.tsx` (353), `template/page.tsx` (498), `runs/page.tsx` (304), `system-operations/page.tsx` (302), `loans/[id]/page.tsx` (325), `onlyoffice-editor-modal.tsx` (285), `beneficiary-modal.tsx` (293), `loan-edit-modal.tsx` (204), `disbursement-report-modal.tsx` (227)
- **Type safety:** 7 uses of `any` found in frontend code (most are pragmatic, 1 in disbursement-form-modal should be typed)
- **Accessibility:** Missing `role="dialog"` and `aria-label` on 4 custom modals; no focus trapping; `BaseModal` has good a11y

## Recommended Priority Actions

1. **[Critical]** Fix notification polling memory leak -- add cleanup in `NotificationBell`
2. **[Critical]** Remove fake import summary statistics in system-operations page
3. **[Critical]** Add error handling to `handleMarkPaid`/`handleDeleteInvoice` in disbursement detail page
4. **[Important]** Fix conflicting `useEffect`s in template page (remove dead effect, stabilize deps)
5. **[Important]** Modularize `FinancialAnalysisModal.tsx` and `disbursement-form-modal.tsx` (both >500 lines)
6. **[Important]** Refactor custom modals in invoice-tracking to use `BaseModal` for consistency and a11y
7. **[Important]** Extract shared `CustomerForm` component to eliminate DRY violation
8. **[Minor]** Remove unnecessary `setTimeout(0)` wrappers in multiple pages

## Unresolved Questions

- Is the `setTimeout(0)` pattern in data loading intentional to work around a specific SSR/hydration issue? If so, document it.
- Why does `add-invoice-from-loan-modal.tsx` use `type="date"` native inputs while all other date inputs use `formatDateInput` with `dd/mm/yyyy` text inputs? Inconsistent UX.
- Is the notification polling interval of 60s adequate? Consider WebSocket or SSE for real-time notifications.
