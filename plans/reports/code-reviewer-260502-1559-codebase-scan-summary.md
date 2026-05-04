# Codebase Scan Summary — 2026-05-02

Full scan across 3 scopes: API Security, Frontend Quality, Architecture & Data Layer.

---

## CRITICAL — 8 issues (must fix)

### Security
| # | File | Issue |
|---|------|-------|
| S-C1 | 8+ API routes | Raw `error.message` returned to client — bypasses `toHttpError` sanitize; leaks Prisma errors, internal paths, AI config |
| S-C2 | `notifications/[id]/read`, `notifications/mark-all-read` | IDOR — no userId ownership check; any user can mark others' notifications read |
| S-C3 | `loans/[id]` PATCH | `AuthError` from `requireEditorOrAdmin()` caught by generic catch → returns 500 instead of 401/403 |

### Architecture / Data Integrity
| # | File | Issue |
|---|------|-------|
| A-C1 | `mapping.service.ts:92–100` | Non-atomic dual-write: `fieldTemplateMaster.update` + `mappingInstance.update` outside transaction — partial failure corrupts data permanently |
| A-C2 | `customer-draft.service.ts:109` | `saveFromDraft` looks up customer by `customer_name` (non-unique) — two customers with same name → wrong record updated |
| A-C3 | DB migration guard | `isMigrationChecked` is module-level boolean — concurrent cold-starts both see `false` → duplicate FieldTemplateMaster/MappingInstance rows |

### Frontend
| # | File | Issue |
|---|------|-------|
| F-C1 | `collateral-form.tsx` `handleSave` | Calls `onSaved()` even when server returns error — form closes "successfully" but data not saved |
| F-C2 | `useMappingEffects.ts` | 3 `useEffect([])` with eslint-disable suppressing real stale closures; customer-change effect can use stale `loadAllFieldTemplates` |

---

## IMPORTANT — 19 issues

### Security (5)
| # | File | Issue |
|---|------|-------|
| S-I1 | `cron/invoice-deadlines` | `CRON_SECRET` passed as query param `?secret=` → logged in access logs |
| S-I2 | `lib/rate-limiter.ts` | In-memory rate limiter — ineffective on multi-instance deploys (Vercel) |
| S-I3 | `disbursements/[id]` PATCH | Editor can PATCH any disbursement — no ownership check (GET has check, PATCH doesn't) |
| S-I4 | `report/export` | `details` field returns raw `error.message` after `toHttpError()` call |
| S-I5 | `branches`, `config/branch-staff` | Raw error message + missing `handleAuthError` → AuthError → 500 |

### Architecture (9)
| # | File | Issue |
|---|------|-------|
| A-I1 | `master-template.service.ts`, `template-field-operations.service.ts` | No pagination on list endpoints — can OOM on large datasets |
| A-I2 | Same | `groupBy` all instances for usage count — O(n) full scan |
| A-I3 | `data-io-export.service.ts:91` | `exportData` loads all customers + nested relations in one query — no streaming/pagination |
| A-I4 | `data-io-import.service.ts:250–284` | `for...of` with individual `create` — N×5 round-trips per customer; should use `createMany` |
| A-I5 | `prisma.ts:86` | `console.log("[PRISMA] DB:", dbUrl)` runs in production — leaks DB file path |
| A-I6 | Multiple files | 8 files exceed 200 LOC (worst: `financial-field-catalog.ts` 471 LOC, `data-io-import.service.ts` 410 LOC) |
| A-I7 | `data-io-import.service.ts` | 6× `as never` casts bypass Prisma type safety |
| A-I8 | `schema.prisma` | `Branch` model missing index on `name` and `branch_code` |
| A-I9 | `schema.prisma` | `Verification` model missing index on `identifier` and `expiresAt` — impacts auth performance |

### Frontend (5)
| # | File | Issue |
|---|------|-------|
| F-I1 | `customer-detail-view.tsx` | `loadCustomer()` after save has no AbortController — memory leak on unmount |
| F-I2 | `AiPasteExtractor` | No abort on collapse; `onExtracted: any` loses type safety |
| F-I3 | `useAutoTagging.analyzeDocument` | No cancel on file change — stale response overwrites fresh data |
| F-I4 | `useMappingEffects` customer change | Race condition on fast customer switch — stale response overwrites correct data |
| F-I5 | `co-borrower handleSave` | Missing `finally { setSaving(false) }` → button permanently disabled on network error |

---

## MINOR / Edge Cases

- `ai/extract-text`: no `text` length limit → unbounded Gemini API cost
- `customers/import-docx`: no file count limit
- `branches` POST: no Zod schema validation
- `useOcrStore`: OCR suggestions from old customer not cleared on customer switch → flash wrong data
- `AiPasteExtractor` textarea: no `maxLength` → large paste → 413/timeout
- AutoSave 5s: can snapshot empty `fieldCatalog` if data not loaded yet

---

## Unresolved Questions

1. Is `notificationService.markAllRead()` filtered by `userId` internally? (affects S-C2 severity)
2. Single-instance deployment (offline máy trạm) or multi-worker? (affects S-I2, A-C3 severity)
3. `saveFromDraft` called from mapping pipeline or general UI? (confirms A-C2 blast radius)
4. Max customer count per branch? (prioritizes A-I3 fix)

---

## Suggested Fix Priority

1. **S-C1** — sanitize all `error.message` returns (broad impact, quick fix)
2. **A-C1** — wrap dual-write in `prisma.$transaction` (data integrity)
3. **F-C1** — check `res.ok` before calling `onSaved()` (silent data loss)
4. **S-C2** — add userId filter to notification endpoints (IDOR)
5. **A-C2** — switch customer lookup to `customer_code_hash`
6. **S-C3 + S-I5** — add `handleAuthError` to affected catch blocks
7. **A-I5** — remove `console.log` DB path in production
8. **A-I8/I9** — add missing DB indexes (migration)
