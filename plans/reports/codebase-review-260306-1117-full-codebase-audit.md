# Full Codebase Review Report

**Date:** 2026-03-06 | **Branch:** Disbursement-Invoice-tracking-implement
**Scope:** 263 TS/TSX files, ~39,500 LOC | **Reviewers:** 4 parallel agents
**Stack:** Next.js 16, React 19, TypeScript, Prisma/SQLite, Zustand, Zod, Tailwind 4

---

## Executive Summary

| Domain | Critical | Important | Minor | Files |
|--------|----------|-----------|-------|-------|
| API Routes & Security | 3 | 16 | 8 | 65+ |
| Services & Business Logic | 4 | 9 | 10 | 41 |
| Frontend Components & Pages | 4 | 11 | ~8 | 68 |
| Database & Lib & Config | 4 | 10 | 12 | 40+ |
| **TOTAL** | **15** | **46** | **~38** | **214+** |

---

## Critical Issues (15) -- Must Fix

### Security

| # | Domain | File | Issue |
|---|--------|------|-------|
| C-SEC-1 | API | `report/export/route.ts:83-94` | Error detail leak -- raw `error.message` sent to client, undermines `toHttpError()` pattern |
| C-SEC-2 | Lib | `pipeline-client.ts` | Command injection -- args passed unsanitized to `spawn("python",...)` |
| C-SEC-3 | Lib | `next.config.ts` | CSP `'unsafe-eval'` in production -- negates XSS protection |
| C-SEC-4 | Service | `auto-tagging.service.ts:503` | Path traversal -- `outputName` sanitize misses `/` character |

### Data Integrity

| # | Domain | File | Issue |
|---|--------|------|-------|
| C-DATA-1 | Service | `disbursement.service.ts:283` | Cascading delete race -- orphan invoices when beneficiary lines deleted |
| C-DATA-2 | Frontend | `system-operations/page.tsx:111-114` | Fake metrics -- `customersNew/Updated` computed via `Math.floor(count * 0.6)` |

### Runtime Errors

| # | Domain | File | Issue |
|---|--------|------|-------|
| C-RT-1 | Lib | `onlyoffice/config.ts` | Module-level `throw` when `ONLYOFFICE_JWT_SECRET` missing -- crashes entire app |
| C-RT-2 | Service | `ocr.service.ts:61` | Wrong `pdf-parse` API usage -- `new PDFParse({data:buffer})` not matching npm API |
| C-RT-3 | Service | `document-extraction.service.ts:203` | Unprotected `JSON.parse` on AI response -- swallows error silently |

### Memory / Stability

| # | Domain | File | Issue |
|---|--------|------|-------|
| C-MEM-1 | Frontend | `notification-bell.tsx` | `startPolling()` without `stopPolling()` on unmount -- interval leaks forever |
| C-MEM-2 | API | ~12 POST/PUT/PATCH routes | No Zod validation -- `as` type assertions give zero runtime safety |

### Error Handling

| # | Domain | File | Issue |
|---|--------|------|-------|
| C-ERR-1 | Frontend | `disbursements/[id]/page.tsx` | `handleMarkPaid`/`handleDeleteInvoice` -- no try-catch, no `res.ok` check |
| C-ERR-2 | Frontend | `loans/page.tsx:42-46` | Fetch customers without `.catch()` -- unhandled promise rejection |
| C-ERR-3 | Lib | `api-helpers.ts` | Duplicate rate limiter -- 2 separate Map stores, client can bypass |
| C-ERR-4 | Lib | `security.service.ts` | `timingSafeEqual` crashes when buffer lengths differ -- attacker detectable |

---

## Important Issues (Top 20 of 46)

### Performance
| # | File | Issue |
|---|------|-------|
| H-PERF-1 | `customer.service.ts` | `getCustomerSummary` loads entire customer+loan+disbursement+invoice graph into memory |
| H-PERF-2 | `mapping/page.tsx` (576 LOC) | Subscribes 40+ store fields, passes 100+ props -- full re-render on any change |
| H-PERF-3 | `deadline-scheduler.ts` | N+1 query pattern in notification check loop |

### Code Quality / Modularization (>200 LOC violations)
| # | File | Lines | Recommendation |
|---|------|-------|----------------|
| H-MOD-1 | `bctc-extractor.ts` | 605 | Split by extraction type |
| H-MOD-2 | `field-calc.ts` | 738 | Extract formula groups |
| H-MOD-3 | `FinancialAnalysisModal.tsx` | 772 | Extract sub-components |
| H-MOD-4 | `disbursement-form-modal.tsx` | 563 | Extract form sections |
| H-MOD-5 | `mapping/page.tsx` | 576 | Already has hooks, needs prop reduction |

### Business Logic
| # | File | Issue |
|---|------|-------|
| H-BIZ-1 | `disbursement.service.ts` | `getSurplusDeficit` only counts direct invoices, ignores beneficiary-line invoices |
| H-BIZ-2 | `auto-process.service.ts` | In-memory job store without TTL -- memory leak on long-running server |
| H-BIZ-3 | `financial-analysis.service.ts` | AI call missing timeout -- can hang indefinitely |

### Schema
| # | File | Issue |
|---|------|-------|
| H-SCH-1 | `schema.prisma` | `Float` for money fields -- floating point errors on financial calculations |
| H-SCH-2 | `schema.prisma` | `disbursementCount` is `String?` for a numeric value |

### Frontend
| # | File | Issue |
|---|------|-------|
| H-FE-1 | `template/page.tsx:257-294` | 3 useEffects overwriting each other, 1 is dead code |
| H-FE-2 | invoice-tracking modals | Custom modals skip `BaseModal` -- missing a11y (role, aria-modal, focus trap) |
| H-FE-3 | customer new/edit pages | ~120 lines JSX duplicated |
| H-FE-4 | API routes | Missing security headers on CRUD routes (only rate-limited routes have them) |

---

## Positive Patterns

- **Error hierarchy** (`AppError` subclasses) -- clean, consistent
- **Transaction usage** correct for financial multi-step operations
- **Zustand architecture** -- 7 stores with `persist` + `partialize`, batch updates
- **Mapping hooks** -- 14 custom hooks modularization is excellent
- **DOCX extraction pipeline** -- well-modularized (6 extraction modules)
- **PII scrubbing** before external API calls
- **File locking** with stale-lock detection
- **HMAC tokens** with `timingSafeEqual` + TTL
- **Zod validation** on config schemas
- **Path traversal protection** using `path.relative()` in docx engine
- **Dark mode** fully supported and consistent
- **Prisma singleton** pattern correct for dev HMR

---

## Detailed Reports

1. [API Routes & Security](code-reviewer-260306-1113-api-routes-security-review.md)
2. [Services & Business Logic](code-reviewer-260306-1113-services-business-logic-review.md)
3. [Frontend Components & Pages](code-reviewer-260306-1113-frontend-components-pages-review.md)
4. [Database & Lib & Config](code-reviewer-260306-1114-db-lib-config-review.md)

---

## Priority Fix Order

### Phase 1: Security (immediate)
1. Fix error detail leak in export route
2. Sanitize pipeline-client spawn args
3. Remove `unsafe-eval` from prod CSP
4. Fix path traversal in auto-tagging

### Phase 2: Runtime Stability
5. Defer OnlyOffice config check to runtime
6. Fix pdf-parse API usage
7. Add cleanup to NotificationBell polling
8. Add Zod validation to 12 unvalidated routes

### Phase 3: Data Integrity
9. Fix cascading delete race in disbursement service
10. Remove fake metrics from system-operations page
11. Fix `getSurplusDeficit` to include beneficiary-line invoices
12. Fix `timingSafeEqual` buffer length check

### Phase 4: Performance & Quality
13. Optimize `getCustomerSummary` query
14. Modularize 5 oversized files
15. Consolidate duplicate rate limiters
16. Add global security headers via middleware

---

## Unresolved Questions

1. `unsafe-eval` in CSP -- required by Turbopack dev or OnlyOffice SDK?
2. `disbursementCount` String -- intentional or oversight?
3. `pdf-parse` -- which fork/version is used? API doesn't match npm standard.
4. `getSurplusDeficit` -- business rule: direct invoices only or include beneficiary-line?
5. Python pipeline (`run_pipeline.py`) -- still in use or replaced by TS pipeline?
6. Plans to migrate SQLite -> PostgreSQL? Should fix Float->Decimal before data grows.
