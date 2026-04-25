# Brainstorm: PII Field Encryption

**Date:** 2026-03-26 | **Status:** Agreed

## Problem

CIF, phone, CCCD stored as plaintext in DB. Deep research tools (AI agents, grep, DB queries) can extract raw PII. Need real encryption so tools only see ciphertext.

## Requirements

- **Fields:** `customer_code` (CIF), `phone`, `cccd` — Customer + CoBorrower
- **DB:** AES-256-GCM encrypted at rest
- **UI:** Default masked (`****-123...`, `091****678`), toggle button to reveal
- **DOCX export:** Decrypt to raw values for template rendering
- **Search:** Not required now (YAGNI). Can upgrade to hybrid hash approach later.

## Chosen Approach: Application-Layer Encryption (A)

### Architecture

```
Write: raw → encrypt(AES-256-GCM) → DB stores ciphertext
Read:  DB ciphertext → decrypt → maskMiddle() → API response (masked)
Toggle: API ?reveal=true + auth check → return decrypted raw
DOCX:  DB ciphertext → decrypt → raw → docxtemplater.render()
```

### Key Management

- `ENCRYPTION_KEY` in `.env` (32-byte hex)
- NEVER commit to git
- Backup key separately from DB

### Files to Create/Modify

| File | Action |
|------|--------|
| `src/lib/field-encryption.ts` | NEW — encrypt/decrypt/mask helpers using AES-256-GCM |
| `src/services/customer.service.ts` | MODIFY — encrypt before save, decrypt after read |
| `src/app/api/customers/[id]/route.ts` | MODIFY — mask by default, ?reveal=true for toggle |
| `src/services/khcn-report.service.ts` | MODIFY — ensure decrypt for DOCX export |
| UI components (profile-card, info-form) | MODIFY — add toggle reveal button |
| `scripts/encrypt-existing-data.ts` | NEW — one-time migration script |

### Existing Assets

- `maskMiddle()` in `security.service.ts` — reuse for UI masking pattern
- `scrubSensitiveData()` — already has phone regex pattern

### Migration Plan

1. Add `ENCRYPTION_KEY` to `.env`
2. Run migration script to encrypt existing plaintext data
3. Deploy code that reads encrypted + writes encrypted
4. Verify DOCX export still works with decrypted values

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| Key loss = data loss | Critical | Backup key in separate secure location |
| Performance (decrypt on every read) | Low | AES-GCM fast, <1ms per field |
| Existing data migration | Medium | One-time script, test on staging first |
| Search by CIF broken | Medium | Accepted tradeoff. Upgrade to hash later if needed |

## Rejected Approaches

- **B. Prisma middleware:** Deprecated in Prisma 6+
- **C. Hybrid hash:** Over-engineering for current needs, violates YAGNI
- **UI-only masking:** Doesn't protect against DB/tool scanning

## Success Criteria

- [ ] DB contains only ciphertext for CIF/phone/CCCD
- [ ] `grep` or DB query shows encrypted strings
- [ ] UI shows masked values by default
- [ ] Toggle reveals full value (with auth)
- [ ] DOCX export contains correct raw values
- [ ] Existing data migrated successfully

## Unresolved Questions

1. CoBorrower phone scope — same encryption or separate phase?
2. Should toggle require re-authentication (e.g., password confirm)?
