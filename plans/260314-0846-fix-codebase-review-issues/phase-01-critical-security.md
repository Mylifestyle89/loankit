# Phase 1: Critical Security Fixes

**Priority:** CRITICAL | **Effort:** 3h | **Status:** pending

## Overview

Fix auth gaps on ~40+ unprotected mutation endpoints, add Next.js middleware, fix command injection and path traversal vectors.

## Reports Reference

- Backend C1, C2, C3, H5, M5
- Core Lib #1, #3

## Implementation Steps

### 1.1 Create Next.js middleware for route protection

- [ ] Create `src/middleware.ts` at project root
- [ ] Match all `/api/*` routes except public ones (`/api/auth/*`, `/api/cron/*`, `/api/report/file-access/*`)
- [ ] Check session token; return 401 if missing
- [ ] This provides a safety net so individual route guards become defense-in-depth

### 1.2 Add auth guards to all unprotected mutation endpoints

Add `await requireEditorOrAdmin()` (or `requireAdmin()` for destructive ops) to every POST/PUT/PATCH/DELETE handler in:

- [ ] `src/app/api/loans/[id]/route.ts` — PATCH, DELETE
- [ ] `src/app/api/invoices/[id]/route.ts` — PATCH, DELETE (if exists)
- [ ] `src/app/api/disbursements/[id]/route.ts` — PATCH, DELETE (if exists)
- [ ] `src/app/api/customers/[id]/co-borrowers/route.ts` — all mutations
- [ ] `src/app/api/customers/[id]/collaterals/route.ts` — all mutations
- [ ] `src/app/api/customers/[id]/credit-agribank/route.ts` — all mutations
- [ ] `src/app/api/customers/[id]/credit-other/route.ts` — all mutations
- [ ] `src/app/api/customers/[id]/related-persons/route.ts` — all mutations
- [ ] `src/app/api/branches/route.ts` — POST/PUT/DELETE
- [ ] `src/app/api/branches/[branchId]/route.ts` — PUT/DELETE
- [ ] `src/app/api/config/branch-staff/route.ts` — PUT
- [ ] `src/app/api/report/template/save-docx/route.ts` — PUT (requireAdmin)
- [ ] `src/app/api/report/backups/restore/route.ts` — POST (requireAdmin)
- [ ] `src/app/api/report/snapshots/restore/route.ts` — POST (requireAdmin)
- [ ] `src/app/api/report/import/bk/route.ts` — POST
- [ ] `src/app/api/report/import/apc/route.ts` — POST
- [ ] `src/app/api/report/build/route.ts` — POST
- [ ] `src/app/api/report/export/route.ts` — POST
- [ ] `src/app/api/report/mapping/*/route.ts` — all mutations
- [ ] `src/app/api/report/auto-process/*/route.ts` — all mutations
- [ ] `src/app/api/report/auto-tagging/*/route.ts` — all mutations
- [ ] `src/app/api/loan-plans/templates/route.ts` — POST
- [ ] `src/app/api/loan-plans/templates/[id]/route.ts` — PATCH, DELETE
- [ ] `src/app/api/loans/[id]/beneficiaries/import/route.ts` — POST
- [ ] `src/app/api/notifications/route.ts` — all mutations

### 1.3 Fix command injection in pipeline-client.ts

**File:** `src/lib/report/pipeline-client.ts`
- [ ] Add allowlist for `script` parameter (only allow known script paths)
- [ ] Validate args contain no shell metacharacters
- [ ] Use `{shell: false}` explicitly in spawn options (verify current)

### 1.4 Fix path traversal in docx-engine.ts

**File:** `src/lib/docx-engine.ts`
- [ ] Add `validatePathUnderBase()` call before `fs.readFile` in `generateDocx` (~line 52)
- [ ] Add same validation in `generateDocxBuffer`
- [ ] Base directory: `report_assets/` or configured template root

### 1.5 Fix raw error exposure in bk-importer.ts

**File:** `src/lib/import/bk-importer.ts`
- [ ] Line 170: replace `error.message` with generic "Failed to parse import data"
- [ ] Log original error with `console.error`

## Success Criteria

- All mutation endpoints require authentication
- `middleware.ts` blocks unauthenticated API access
- No user input reaches `spawn()` args without validation
- No path traversal possible in docx generation
