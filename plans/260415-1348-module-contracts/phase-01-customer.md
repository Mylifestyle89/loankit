# Phase 1: Customer Contract

## Priority: HIGH | Effort: L | Status: pending

## Goal

Viết contract đầy đủ cho Customer module — foundation của hệ thống, phức tạp nhất (PII encryption, co-borrowers, related persons, data_json extension, KHCN vs KHDN).

## Files to scout

- `prisma/schema.prisma` — models: Customer, CoBorrower, RelatedPerson
- `src/services/customer.service.ts`
- `src/services/customer-service-helpers.ts`
- `src/services/customer-service-types.ts`
- `src/services/customer-draft.service.ts`
- `src/app/api/customers/[id]/route.ts`
- `src/app/api/customers/route.ts`
- `src/lib/field-encryption.ts` (PII fields list)
- `src/app/report/customers/[id]/components/customer-info-form.tsx` (UI form = source of truth for fields)

## Sections to cover

### Purpose
Quản lý toàn bộ thông tin KH (cá nhân + doanh nghiệp), bao gồm PII được encrypt, mối quan hệ (đồng vay, liên quan), và data_json để extend fields mới không cần migration.

### Entities & Relations

```
Customer (KHCN or KHDN)
  ├── has many → CoBorrower (đồng vay)
  ├── has many → RelatedPerson (liên quan)
  ├── has many → Collateral (TSBĐ)
  ├── has many → Loan
  ├── has many → CreditAgribank / CreditOther (dư nợ TCTD)
  └── has many → LoanPlan
```

Key fields table — list đủ field + type + encrypt status + required.

### Business Rules

- **PII encryption**: customer_code (HMAC), cccd, phone, bank_account encrypted AES-256-GCM
- **Dual type**: `customer_type = individual | corporate` → field visibility khác nhau
- **data_json**: lưu extended fields (occupation, nationality, id_type...) không cần migration
- **customer_code unique**: via customer_code_hash (HMAC index)

### Permissions
- `admin/editor` — create, update, delete
- `viewer` — read (PII masked by default, need `?reveal=` param + editor+ role)

### Validation
Reference: `src/services/customer-service-types.ts` (Zod schemas)

### API Contract
List endpoints: GET/POST/PATCH/DELETE `/api/customers`, `/api/customers/[id]`, `?reveal=all` behavior

### Edge Cases

- Dual dev.db location (root vs prisma/)
- Data_json fallback values (nationality default "Việt Nam", id_type default "CCCD")
- PII reveal only for editor+ with explicit `?reveal=` param

### Open Questions

- Soft delete vs hard delete? (Hiện hard delete)
- KHCN vs KHDN validation: nên tách thành 2 schema riêng?

## Output

`docs/contracts/customer.contract.md` (~200-250 lines)

## Success Criteria

- Tất cả PII fields listed với encrypt status
- co_borrowers, related_persons relations documented
- data_json extension pattern explained
- Reveal/mask logic rõ ràng
