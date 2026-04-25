---
status: pending
---

# Plan: PII Field Encryption (AES-256-GCM)

**Date:** 2026-03-26 | **Mode:** Fast | **Risk:** Medium-High

## Context

- Brainstorm: `plans/reports/brainstorm-260326-0844-pii-field-encryption.md`
- Approach: Application-layer AES-256-GCM encryption
- Fields: `customer_code` (CIF), `phone`, `cccd` — Customer + CoBorrower
- Existing: `maskMiddle()` in `security.service.ts`

## Architecture

```
Write: raw → encrypt(AES-256-GCM) → DB stores "enc:<base64>"
Read:  DB "enc:<base64>" → decrypt → maskMiddle() → API response
Toggle: GET /api/customers/[id]?reveal=cif,phone,cccd → return raw (auth required)
DOCX:  service layer decrypt → raw → docxtemplater.render()
```

## Phases

| # | Phase | Priority | Effort | Status |
|---|-------|----------|--------|--------|
| 1 | [Encryption lib](phase-01-encryption-lib.md) | Critical | S | Pending |
| 2 | [Service layer integration](phase-02-service-layer.md) | Critical | M | Pending |
| 3 | [API masking + reveal toggle](phase-03-api-masking.md) | High | M | Pending |
| 4 | [UI toggle reveal](phase-04-ui-toggle.md) | High | M | Pending |
| 5 | [Data migration script](phase-05-data-migration.md) | Critical | S | Pending |

## Key Decisions

- Prefix `enc:` to distinguish encrypted vs plaintext (backward compat during migration)
- `maskMiddle()` reused from security.service.ts — export it
- CoBorrower phone encrypted same way (same phase 2)
- DOCX export already reads from service layer → auto-decrypted
- No search by encrypted fields (YAGNI)

## Dependencies

- `ENCRYPTION_KEY` env var (32-byte hex) must be set before deploy
- Backup key separately from DB — key loss = data loss

## Risk Mitigations

| Risk | Mitigation |
|------|------------|
| Key loss | Document backup procedure, `.env.example` reminder |
| Migration data corruption | Script has dry-run mode, backup DB first |
| Performance | AES-GCM <1ms per field, negligible |
| Backward compat | `enc:` prefix detection: decrypt if prefixed, passthrough if not |
