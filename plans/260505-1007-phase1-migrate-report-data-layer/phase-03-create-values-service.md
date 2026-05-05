# Phase 03 — Create values.service.ts

## Context Links

- Plan: [plan.md](plan.md)
- Brainstorm: `plans/reports/brainstorm-260505-1007-report-module-data-model.md` § 6
- Phase 01 (DONE): schema fields đã ship — `customerProfileValuesJson`, `dossierValuesJson`, `LoanReportExport`
- Phase 02 (DONE): migration script backfill local
- Memory: `project_agribank_pii_compliance.md`, `feedback_prisma_select_new_columns.md`
- Reuse Zod: `src/lib/report/manual-values.ts` (scalar + repeaterItem schemas)
- Encryption helpers: `src/lib/field-encryption.ts`

## Overview

- **Priority**: P1
- **Status**: Not started
- **Effort**: 0.5–1d
- Service layer foundation: facade CRUD cho `Customer.customerProfileValuesJson` (shared) và `Loan.dossierValuesJson` (per-loan). KHÔNG swap consumers ở phase này (defer Phase 4).

## Key Insights

- Schema mới đã có. Phase 3 chỉ tạo service + tests, **không touch** `mapping.service.ts` / `build.service.ts` / API routes.
- Reuse `scalarValue` + `repeaterItem` Zod schemas từ `manual-values.ts` — promote sang shared module thay vì duplicate.
- 17 file hiện đang reference `manualValues` / `manual_values.json` — defer rewrite Phase 4. Phase 3 song song co-exist.
- PII trong customer profile: dùng **Option A — encrypt full JSON blob** (AES-256-GCM qua `encryptField` / `decryptField`). Lý do: KISS, blob nhỏ (<10KB), không cần whitelist key, đồng bộ với Agribank scan precedent.
- Optimistic concurrency: dùng `updatedAt` check (column đã có), reject với `Error('VERSION_CONFLICT')` để caller retry.

## Requirements

**Functional**:
- `getCustomerProfile(customerId)` → `Record<string, unknown>` (decrypted, parsed)
- `saveCustomerProfile(customerId, values, opts?: { expectedUpdatedAt? })` → full overwrite, encrypted-at-rest
- `patchCustomerProfile(customerId, partial)` → load → shallow merge → save → return merged
- `getDossierValues(loanId)`, `saveDossierValues`, `patchDossierValues` — same shape, scope per-loan
- `getMergedValuesForExport(loanId)` → `{ ...customerProfile, ...dossier }` (shallow, dossier wins)

**Non-functional**:
- Pure DB I/O, zero FS access
- Throw rõ: `CUSTOMER_NOT_FOUND`, `LOAN_NOT_FOUND`, `INVALID_VALUES_SHAPE`, `VERSION_CONFLICT`
- 100% TS strict, 0 `any`
- File <200 LOC (split nếu vượt)

## Architecture

```
src/services/report/values.service.ts        (~150 LOC)
├─ Encryption layer: encryptField / decryptField (full blob)
├─ Validation: valuesRecordSchema (reuse từ manual-values)
├─ Helpers
│   ├─ parseEncryptedJson(s): decrypt → parse → validate → fallback {}
│   └─ stringifyAndEncrypt(obj): validate → JSON.stringify → encrypt
├─ Customer profile API
│   ├─ getCustomerProfile(customerId)
│   ├─ saveCustomerProfile(customerId, values, opts?)
│   └─ patchCustomerProfile(customerId, partial)
├─ Dossier API
│   ├─ getDossierValues(loanId)
│   ├─ saveDossierValues(loanId, values, opts?)
│   └─ patchDossierValues(loanId, partial)
└─ Merge for export
    └─ getMergedValuesForExport(loanId)
        ├─ load loan + customer (single query w/ include)
        ├─ decrypt + parse cả hai
        └─ shallow merge, dossier overrides

src/services/report/values.types.ts          (~30 LOC)
└─ Zod schemas + TS types (promoted từ manual-values.ts)

src/services/report/__tests__/values.service.test.ts
└─ Vitest, in-memory SQLite hoặc mocked prisma
```

**Data flow** (export):
```
Loan ──include──▶ Customer
  │                  └─ customerProfileValuesJson (encrypted)
  └─ dossierValuesJson (encrypted)
                  ▼
       decrypt + parse + validate
                  ▼
          shallow merge (dossier wins)
                  ▼
       Record<string, unknown> → caller (build pipeline)
```

## Related Code Files

**Create**:
- `src/services/report/values.service.ts`
- `src/services/report/values.types.ts`
- `src/services/report/__tests__/values.service.test.ts`

**Modify** (minimal, Phase 3 scope):
- `src/lib/report/manual-values.ts` — re-export `scalarValue`, `repeaterItem`, `manualValuesSchema` từ `values.types.ts` để DRY (không xoá file này, Phase 4 mới deprecate)

**Read-only reference**:
- `src/lib/field-encryption.ts` — `encryptField`, `decryptField`, `isEncrypted`
- `prisma/schema.prisma` — confirm column types

**Out of scope** (Phase 4):
- `src/services/report/build.service.ts`
- `src/services/report/snapshot.service.ts`
- `src/services/report/field-values.service.ts`
- `src/app/api/report/values/route.ts`
- `src/app/api/report/snapshots/route.ts`
- 12 file UI/hook khác

## Implementation Steps

1. **Create `values.types.ts`**: move `scalarValue`, `repeaterItem`, `manualValuesSchema` từ `manual-values.ts` ra. Export type `ValuesRecord`.
2. **Re-export trong `manual-values.ts`** từ types mới (zero behavior change cho consumers cũ).
3. **Create `values.service.ts` skeleton**: imports prisma, encryption helpers, types.
4. **Implement `parseEncryptedJson(s)`**: nếu null/empty → `{}`. Nếu `isEncrypted` → `decryptField` → `JSON.parse` → Zod validate → fallback `{}` on error (log warn).
5. **Implement `stringifyAndEncrypt(obj)`**: Zod validate (throw `INVALID_VALUES_SHAPE` on fail) → `JSON.stringify` → `encryptField`.
6. **Implement getter pair `getCustomerProfile` / `getDossierValues`**: `findUniqueOrThrow` với `select` field cụ thể, throw `*_NOT_FOUND` nếu null.
7. **Implement setter pair `saveCustomerProfile` / `saveDossierValues`**: nếu `opts.expectedUpdatedAt` → check current `updatedAt` match, throw `VERSION_CONFLICT`. Update với encrypted blob.
8. **Implement patcher pair**: `getX` → shallow merge `{ ...current, ...partial }` → `saveX`. Return merged object.
9. **Implement `getMergedValuesForExport(loanId)`**: 1 query `loan.findUniqueOrThrow` với `include: { customer: { select: { customerProfileValuesJson: true } } }`. Decrypt cả hai. Shallow merge.
10. **Write unit tests** (8 cases tối thiểu):
    - `getCustomerProfile`: empty → `{}`; populated → decrypted record
    - `saveCustomerProfile`: round-trip preserves shape; encrypted at rest (read raw col → `isEncrypted` === true)
    - `patchCustomerProfile`: shallow merge giữ key cũ + override key mới
    - `saveCustomerProfile` invalid shape (function value) → throw `INVALID_VALUES_SHAPE`
    - `saveCustomerProfile` stale `expectedUpdatedAt` → throw `VERSION_CONFLICT`
    - `getMergedValuesForExport`: dossier override customer khi key trùng
    - `getCustomerProfile` not found → throw `CUSTOMER_NOT_FOUND`
    - Dossier symmetric tests (1 case smoke)
11. **Compile check**: `npm run build` (hoặc `npx tsc --noEmit`).
12. **Test run**: `npx vitest run src/services/report/__tests__/values.service.test.ts`.

## Todo List

- [ ] `values.types.ts` — promote Zod schemas
- [ ] `manual-values.ts` re-export shim
- [ ] `values.service.ts` — helpers (parse/stringify+encrypt)
- [ ] Customer profile getters/setters/patcher
- [ ] Dossier getters/setters/patcher
- [ ] `getMergedValuesForExport`
- [ ] Optimistic lock với `expectedUpdatedAt`
- [ ] 8 unit tests pass
- [ ] `npm run build` clean
- [ ] Verify file <200 LOC; nếu vượt, split helpers ra `values.helpers.ts`

## Success Criteria

- `npx tsc --noEmit` 0 lỗi
- Vitest 8/8 pass
- Encrypted-at-rest verified: raw column read trả `isEncrypted === true`
- CRUD round-trip preserves data shape (deep equal)
- Shallow merge: dossier override customer top-level keys
- Zod reject invalid shapes (function/symbol values)
- File <200 LOC, kebab-case naming
- 0 import từ `node:fs` trong service
- `manual-values.ts` consumers không break (re-export shim)

## Risk Assessment

| Risk | Likelihood | Mitigation |
|---|---|---|
| Shallow merge gây data loss khi nested object override | Med | Document rõ trong JSDoc: top-level shallow only, nested = full replacement. Test case explicit. |
| Race condition concurrent save same customer | Low (single-user mostly) | Optimistic lock `expectedUpdatedAt` opt-in; Phase 5 auto-save sẽ enforce |
| Encryption overhead khi blob lớn | Low (blob <10KB) | Benchmark trong test; nếu >50ms → revisit Option B (selective) ở Phase 4 |
| Service quá thin = abstraction overhead | Med | Justify: encryption + Zod + optimistic lock + audit hook (Phase 5) — không chỉ proxy Prisma |
| `manual-values.ts` re-export break circular import | Low | Types-only file, no runtime deps |
| Existing data trong DB (Phase 2 backfill) plaintext, service expect encrypted | High | `parseEncryptedJson` graceful: nếu `!isEncrypted` → parse plaintext fallback. Phase 4 có script re-encrypt batch. |

## Security Considerations

**PII Encryption Decision: Option A — Full JSON Blob Encryption**

- Apply `encryptField` cho toàn bộ `customerProfileValuesJson` + `dossierValuesJson` trước ghi DB
- Apply `decryptField` khi đọc, fallback gracefully nếu plaintext (cho legacy data từ Phase 2 backfill)
- Lý do chọn A vs B (selective):
  - KISS: không cần maintain whitelist PII keys
  - Blob nhỏ, overhead encryption negligible
  - Đồng bộ với Agribank scan precedent: column không xuất hiện plaintext
- Lý do KHÔNG chọn C (no encrypt): vi phạm `project_agribank_pii_compliance.md`
- `getMergedValuesForExport` trả plaintext → caller (build pipeline) phải log access (Phase 5 audit hook)
- Validation Zod chặn function/symbol values trước stringify (prevent prototype pollution)
- Throw errors KHÔNG include values content (avoid PII leak vào logs)

## Next Steps (Phase 4 preview)

- Swap consumers (17 file đã grep) sang `valuesService.*` API
- Deprecate `loadManualValues` / `saveManualValues` từ `manual-values.ts`
- Bỏ FS dual-write trong `mapping.service.ts` + `build.service.ts`
- Feature flag `REPORT_LEGACY_FALLBACK` để rollback nếu cần
- Script batch re-encrypt cho rows Phase 2 backfill (nếu plaintext)

## Unresolved Questions

1. **Promote Zod schemas — đặt ở đâu?** `src/services/report/values.types.ts` (service-local) hay `src/lib/report/values-schema.ts` (lib-shared)? Plan giả định service-local; nếu Phase 4 cần share rộng → move sang lib.
2. **Optimistic lock default ON hay opt-in?** Plan đề xuất opt-in qua `opts.expectedUpdatedAt` để giữ KISS cho callers Phase 4. User confirm?
3. **Audit logging Phase 3 hay defer Phase 5?** `getMergedValuesForExport` đọc PII bulk — có cần log access ngay Phase 3 không, hay đợi `LoanReportExport` table được wire ở Phase 5?
