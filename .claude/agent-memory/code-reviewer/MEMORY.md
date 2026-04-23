# Code Reviewer Memory

## Project Stack
- Next.js 16, React 19, TypeScript, Zustand, Tailwind CSS 4, Framer Motion
- Vietnamese financial reporting app (loan tracking, disbursement, invoice management, BCTC analysis)
- i18n: custom `useLanguage()` hook with vi/en translations

## Zustand Store Architecture
- 7 mapping stores in `src/app/report/mapping/stores/`
- 1 notification store in `src/components/invoice-tracking/use-notification-store.ts`
- `use-mapping-data-store` and `use-customer-store` use `persist` middleware with `partialize`
- `use-ocr-store` uses lazy dynamic import to avoid circular refs with mapping data store
- Stores accessed both via hooks (React) and `.getState()` (outside React)

## Known Patterns
- `BaseModal` at `src/components/ui/BaseModal.tsx` provides consistent modal with escape/backdrop/aria
- Older modals (invoice-tracking) use raw `div` without BaseModal -- a11y gap
- `setTimeout(0)` pattern used in multiple pages for initial data load (purpose unclear)
- `window.dispatchEvent(CustomEvent)` used for layout-to-mapping-page communication
- Date inputs use custom `formatDateInput` with dd/mm/yyyy text inputs (except add-invoice-from-loan-modal which uses native date)

## Recurring Issues Found
- Files exceeding 200-line limit: common across pages and modals
- Custom modals missing `role="dialog"` and `aria-modal="true"`
- Fetch calls without try-catch in event handlers
- No focus trapping in custom modals
- DRY violation: customer new/edit pages share identical form markup

## Critical Data-Model Guardrail (2026-04-01)
- `Loan.contractNumber` is a business/draft field and may be duplicated before official contract issuance.
- Reviewers must reject changes that:
  - re-introduce UNIQUE constraints on `contractNumber` (global or per customer),
  - use `upsert` with `where: { contractNumber }` (invalid when non-unique).
- Expected pattern:
  - use `loan.id` as technical identity for updates/deletes,
  - keep non-unique indexes only for search performance (`contractNumber`, `customerId+contractNumber`).
- When schema/migration touches `loans`, verify actual DB indexes (not only schema) to avoid drift/regression.

## File Paths
- Pages: `src/app/report/{mapping,customers,loans,disbursements,invoices,template,runs,system-operations}/`
- Shared components: `src/components/invoice-tracking/` (16 files), `src/components/ui/`
- Mapping components: `src/app/report/mapping/components/` (20+ files)
- Mapping hooks: `src/app/report/mapping/hooks/` (14 hooks)
