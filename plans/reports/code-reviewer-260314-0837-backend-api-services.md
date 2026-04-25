# Backend API & Services Review

**Date:** 2026-03-14 | **Files:** ~98 API routes, ~20 services, auth layer, prisma schema
**Branch:** KHCN-implement

## Critical Issues (must fix)

### C1. Massive auth gap — ~80% of mutation endpoints have NO auth guard
Only 6 route files use `requireAdmin`/`requireSession`. The following mutation endpoints are completely unprotected:
- `PATCH/DELETE` on `/api/loans/[id]`, `/api/invoices/[id]`, `/api/disbursements/[id]`
- `POST/PATCH/DELETE` on ALL customer sub-resources: co-borrowers, collaterals, credit-agribank, credit-other, related-persons
- `POST/PUT/DELETE` on `/api/branches`, `/api/branches/[branchId]`
- `PUT` on `/api/config/branch-staff`
- ALL report mutation endpoints: `save-docx`, `backups/restore`, `snapshots/restore`, `import/bk`, `import/apc`, `build`, `export`, `mapping/*`, `auto-process/*`, `auto-tagging/*`
- `POST` on `/api/loan-plans/templates`, `PATCH/DELETE` on templates/[id]
- `POST` on `/api/loans/[id]/beneficiaries/import`

**Impact:** Any unauthenticated user can create/modify/delete financial data, restore backups, import files, trigger AI processes.
**Fix:** Add `await requireAdmin()` or `await requireEditorOrAdmin()` to every POST/PUT/PATCH/DELETE handler. Consider a middleware-based approach for `/api/*` routes to avoid per-route boilerplate.

### C2. Cron endpoint relies solely on shared secret — no rotation mechanism
`/api/cron/invoice-deadlines` uses `x-cron-secret` header. Good: timing-safe comparison. Bad: if `CRON_SECRET` env var is empty/unset, the route returns 401 (safe), but there's no secret rotation or expiry mechanism.

### C3. No middleware.ts for route protection
No `middleware.ts` exists at project root. All route protection is opt-in per handler, which led to C1.

## Important Issues (should fix)

### H1. No pagination on list endpoints — will break at scale
`listCustomers`, `loanService.list`, `invoiceService.listAll`, `beneficiaryService.list` all return unbounded `findMany` results. Only `disbursementService` has pagination.
**Fix:** Add `take`/`skip` with sensible defaults (e.g., 50) to all list endpoints.

### H2. `getCustomerSummary` loads ALL invoices into memory
`invoiceService.getCustomerSummary()` fetches every invoice, every disbursement beneficiary, and every loan into memory to compute aggregates in JS. With thousands of records this will OOM.
**Fix:** Use Prisma `groupBy` or raw SQL aggregation queries.

### H3. `getFullProfile` deep-includes entire loan/disbursement/invoice tree
`customerService.getFullProfile` does a 4-level nested include. For customers with many loans this generates a massive query and response payload.
**Fix:** Paginate or lazy-load sub-resources.

### H4. No Zod validation on many new KHCN sub-resource routes
`collaterals/route.ts`, `co-borrowers/route.ts`, `credit-agribank/route.ts`, `credit-other/route.ts`, `related-persons/route.ts` use raw `body` destructuring without Zod schemas. Allows arbitrary data injection.
**Fix:** Add Zod schemas matching Prisma model constraints.

### H5. `save-docx` route has no auth guard
`PUT /api/report/template/save-docx` allows any unauthenticated user to overwrite .docx template files on the server filesystem. Path traversal is mitigated but auth is missing entirely.

### H6. Inconsistent error handling in sub-resource routes
Sub-resource routes (collaterals, co-borrowers, etc.) catch errors with raw `e.message` instead of using `toHttpError()`, exposing internal error details to clients.

## Minor Issues (nice to fix)

### M1. `customer.service.ts` is 474 lines — exceeds 200-line limit
Consider splitting `saveFromDraft` and `toDraft` into a separate `customer-draft.service.ts`.

### M2. DRY violation in error handling pattern
Every route repeats the same try/catch + ZodError + handleAuthError + toHttpError boilerplate. Extract a `withErrorHandling(handler)` wrapper.

### M3. `data_json` stored as string, parsed manually
`customer.data_json` is stored as a JSON string and parsed with `JSON.parse()` in multiple places. Consider using Prisma's JSON type or a consistent parse utility.

### M4. `listAll` filter logic is convoluted
`invoiceService.listAll` mixes real and virtual invoice queries with complex branching. The `needs_supplement` status is a UI concern leaking into the service layer.

### M5. Notifications routes have no auth
`/api/notifications` endpoints are unprotected — anyone can read/mark notifications.

## Positive Patterns

1. **Auth guard design** — `requireSession`/`requireAdmin`/`requireEditorOrAdmin`/`requireOwnerOrAdmin` hierarchy is well-designed and clean. Just needs consistent application.
2. **Cron security** — timing-safe comparison for cron secret prevents timing attacks.
3. **OnlyOffice callback** — proper JWT verification, SSRF protection (origin validation), path traversal prevention.
4. **File access** — HMAC token-based file access with path validation under base directory.
5. **Zod validation** — consistently used in core CRUD routes (customers, loans, invoices, disbursements).
6. **Error hierarchy** — `NotFoundError`, `ValidationError`, `toHttpError` provide consistent HTTP error mapping.
7. **Transaction usage** — `saveFromDraft` correctly uses `prisma.$transaction` for multi-table writes.

## Summary Stats

| Metric | Value |
|--------|-------|
| API route files | ~98 |
| Service files | ~20 |
| Routes with auth guards | ~8 (~8%) |
| Routes WITHOUT auth on mutations | ~40+ |
| Routes with Zod validation | ~12 |
| Routes without Zod on POST/PATCH | ~15+ |
| List endpoints with pagination | 1 (disbursements) |
| List endpoints without pagination | ~10+ |
| Services exceeding 200 lines | 3 (customer, invoice, disbursement-report) |
