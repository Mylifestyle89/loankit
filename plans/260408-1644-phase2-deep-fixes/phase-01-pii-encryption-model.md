# Phase 01 — PII Encryption Model Overhaul

## Context Links
- Backend report C1 (`plans/reports/code-reviewer-260408-1556-backend.md` L18-23)
- Backend report C3 (L44-56) — incomplete PII scope
- MEMORY: `project_agribank_pii_compliance.md` — Agribank scan quét plaintext PII
- MEMORY: `project_dual_devdb_location.md` — luôn target `prisma/dev.db`

## Overview
**Priority:** P1 / **Risk:** HIGH / **Effort:** ~5h / **Status:** pending

Sửa 2 lỗi compounding:
1. **C1** — `customer_code` được encrypt với random IV nhưng schema có `@unique` + lookup vẫn dùng plaintext → import silently tạo duplicate, unique constraint vô nghĩa.
2. **C3** — Coverage encryption chỉ 4/15 PII fields → compliance gap với Agribank security scan.

Giải pháp: thêm cột HMAC-SHA256 deterministic `customer_code_hash` cho lookup/uniqueness, giữ ciphertext ở `customer_code` cho display. Mở rộng `PII_*_FIELDS` sang CoBorrower, RelatedPerson, và các Customer fields còn thiếu. Migration script re-encrypt + backfill hash cho rows đã có.

**Window:** cần downtime ngắn (~5 phút) để chạy migration trên Vercel — chạy ngoài giờ hành chính.

**DB stack (user confirmed 2026-04-08):** SQLite via Turso (libsql) ở production, local `prisma/dev.db`. Migration phải chạy được trên cả 2. SQLite không hỗ trợ `ALTER TABLE DROP CONSTRAINT` → Prisma sẽ generate pattern "tạo bảng mới → copy data → drop cũ → rename" tự động khi đổi unique. Verify kết quả migrate SQL trước khi apply production.

## Key Insights
- Schema hiện tại: `customer_code String @unique` (line 103). SQLite không hỗ trợ `IF NOT EXISTS` khi thêm column unique → phải drop unique → add column → backfill → add unique trên column hash.
- `toCreateDbData` (L43-73) + `toUpdateDbData` (L75-109) hiện chỉ gọi `encryptCustomerPii` ở cuối — chưa tính hash.
- `data-io-import.service.ts:147` query `where: { customer_code: { in: allCustomerCodes } }` với plaintext — phải đổi sang `customer_code_hash`.
- `field-encryption.ts:80` chỉ có `PII_CUSTOMER_FIELDS = [customer_code, phone, cccd, spouse_cccd]`. Cần thêm: `cccd_old, bank_account, spouse_name, date_of_birth, email`.
- CoBorrower và RelatedPerson không có batch encrypt helper — phải tạo mới.
- Encryption key đã có ở env (`ENCRYPTION_KEY` 64 hex). HMAC dùng key thứ 2 hoặc derive từ key chính (HKDF) để tách concern. Đề xuất: derive `HMAC_KEY = sha256(ENCRYPTION_KEY || "hmac-v1")` để khỏi thêm env var.
- Single-user Vercel → migration đơn giản hơn, không cần coordinate nhiều client.

## Requirements
**Functional**
- Customer lookup theo CIF plaintext phải tìm đúng row sau migration.
- `findUnique({ where: { customer_code: <plain> } })` thay bằng `findUnique({ where: { customer_code_hash: hash(plain) } })`.
- Tất cả PII fields liệt kê dưới được encrypt khi write, decrypt khi read.
- Không được mất dữ liệu nào trong migration.

**Non-functional**
- Migration idempotent (re-run safe — kiểm tra `isEncrypted` trước khi encrypt lại).
- Rollback script available.
- Không phá API contract — masking response giữ nguyên.

## Architecture
```
Write path:
  input plaintext → toCreateDbData → encryptCustomerPii (mở rộng)
                                    → addCustomerHashes (mới: cccd_hash, customer_code_hash)
                                    → DB

Read path:
  DB row → decryptCustomerPii (mở rộng) → response (mask theo revealFields)

Lookup path:
  plain CIF → hashCustomerCode(plain) → findUnique({ customer_code_hash })
```

## Related Code Files
**Read:**
- `prisma/schema.prisma` (Customer L98-157, CoBorrower L461-485, RelatedPerson L488-504)
- `src/lib/field-encryption.ts` (toàn bộ)
- `src/services/customer-service-helpers.ts` (toàn bộ)
- `src/services/customer.service.ts`
- `src/services/report/data-io-import.service.ts:147`
- `src/services/bk-to-customer-relations.ts`

**Modify:**
- `prisma/schema.prisma` — thêm `customer_code_hash String @unique`, `cccd_hash String?` (cho dedup CCCD nếu cần). Bỏ `@unique` khỏi `customer_code` cũ.
- `src/lib/field-encryption.ts` — mở rộng `PII_CUSTOMER_FIELDS`, thêm `PII_COBORROWER_FIELDS`, `PII_RELATED_PERSON_FIELDS`, `encryptCoBorrowerPii`, `decryptCoBorrowerPii`, etc., thêm `hashCustomerCode(plain)` HMAC helper.
- `src/services/customer-service-helpers.ts` — sau encryptCustomerPii thêm `customer_code_hash: hashCustomerCode(input.customer_code)`.
- `src/services/customer.service.ts` — đổi mọi `findUnique({customer_code})` sang `customer_code_hash`.
- `src/services/report/data-io-import.service.ts` — L147 đổi sang hash lookup.
- Mọi service touch CoBorrower/RelatedPerson — wrap encrypt/decrypt.

**Create:**
- `prisma/migrations/<timestamp>_pii_hash_and_extended/migration.sql` — manual SQL.
- `scripts/migrate-pii-backfill.ts` — re-encrypt rows + backfill hash. Run via `tsx`.
- `scripts/migrate-pii-rollback.ts` — đảo ngược: decrypt PII đã extended back sang plaintext, drop hash columns.

## Implementation Steps
1. **Backup DB** trước mọi thứ: copy `prisma/dev.db` → `prisma/dev.db.bak-<date>`. Trên Vercel: export Postgres dump (hoặc chỉ áp dụng cho file SQLite nếu vẫn SQLite — confirm với user).
2. **Schema change**:
   - Thêm `customer_code_hash String?` (nullable tạm thời).
   - Drop `@unique` khỏi `customer_code`.
   - Generate migration với `prisma migrate dev --create-only --name pii_hash_and_extended`.
   - Edit migration SQL nếu Prisma không xử đúng việc drop unique trong SQLite (SQLite require table rebuild).
3. **Implement helpers** trong `field-encryption.ts`:
   - `hashCustomerCode(plain: string): string` — HMAC-SHA256 với key derive từ `ENCRYPTION_KEY`.
   - Mở rộng `PII_CUSTOMER_FIELDS` đầy đủ.
   - Thêm `PII_COBORROWER_FIELDS = [full_name, id_number, id_old, phone, current_address, permanent_address, birth_year]`.
   - Thêm `PII_RELATED_PERSON_FIELDS = [id_number, address]`.
   - Tạo `encrypt/decryptCoBorrowerPii`, `encrypt/decryptRelatedPersonPii` (copy pattern từ Customer helpers).
4. **Update service helpers**:
   - `customer-service-helpers.ts` toCreateDbData/toUpdateDbData: sau khi `encryptCustomerPii(raw)`, thêm `result.customer_code_hash = hashCustomerCode(input.customer_code)`.
   - Trong `customer.service.ts` mọi `findUnique({where: {customer_code}})` đổi sang `{customer_code_hash: hashCustomerCode(plain)}`.
   - Trong CoBorrower create/update services (grep `prisma.coBorrower.create|update`) — wrap với `encryptCoBorrowerPii`.
   - Tương tự RelatedPerson.
5. **Update import service** `data-io-import.service.ts:147`:
   - `allCustomerCodeHashes = allCustomerCodes.map(hashCustomerCode)`.
   - Query `where: { customer_code_hash: { in: allCustomerCodeHashes } }`.
   - Map result back về plaintext via decrypt for downstream comparison.
6. **Backfill script** `scripts/migrate-pii-backfill.ts`:
   - Read all Customer rows.
   - For each: nếu `customer_code` chưa encrypted → encrypt; tính `customer_code_hash`. Encrypt mọi field mới mở rộng nếu chưa encrypt.
   - Cập nhật `prisma.customer.update` từng row trong transaction.
   - Read all CoBorrower → encrypt PII fields nếu plaintext.
   - Read all RelatedPerson → encrypt PII fields nếu plaintext.
   - Log số rows updated, skipped (đã encrypt), errors.
7. **Add unique constraint** sau backfill:
   - Tạo migration thứ 2: `ALTER TABLE customers ADD CONSTRAINT customer_code_hash_unique UNIQUE(customer_code_hash)` (SQLite: rebuild table).
8. **Rollback script** `scripts/migrate-pii-rollback.ts`:
   - Decrypt mọi field mới mở rộng → plaintext.
   - Drop hash column (manual SQL).
9. **Smoke tests**:
   - Chạy backfill trên `dev.db` copy.
   - Verify: `prisma.customer.findFirst()` sau decrypt match plaintext gốc.
   - Test create customer → read → CIF round-trip.
   - Test import service với CSV mẫu — không tạo duplicate.
10. **Document migration window** trong README + log run command + rollback command.

## Todo List
- [ ] Backup DB
- [ ] Edit `prisma/schema.prisma` thêm `customer_code_hash`, mở rộng nullable
- [ ] Generate migration `pii_hash_and_extended` (create-only)
- [ ] Sửa SQL migration cho SQLite drop unique
- [ ] Mở rộng `PII_*_FIELDS` trong `field-encryption.ts`
- [ ] Thêm `hashCustomerCode` HMAC helper
- [ ] Thêm encrypt/decrypt helpers cho CoBorrower, RelatedPerson
- [ ] Update `customer-service-helpers.ts` (thêm hash field)
- [ ] Update `customer.service.ts` lookup paths
- [ ] Update CoBorrower/RelatedPerson services
- [ ] Update `data-io-import.service.ts:147` lookup
- [ ] Viết `scripts/migrate-pii-backfill.ts`
- [ ] Viết `scripts/migrate-pii-rollback.ts`
- [ ] Test backfill trên dev.db copy
- [ ] Tạo migration thứ 2 cho UNIQUE constraint
- [ ] Manual smoke test (create / read / import)
- [ ] Document run/rollback commands
- [ ] Schedule production migration window

## Success Criteria
- `prisma.customer.findUnique({where: {customer_code_hash: hashCustomerCode(plain)}})` trả về row đúng.
- Import 1 CSV với 10 customer 2 lần → KHÔNG tạo duplicate (count vẫn 10).
- Đọc 1 CoBorrower → `id_number` được mask đúng định dạng cccd.
- Backfill script idempotent: chạy 2 lần ra cùng 1 kết quả.
- Rollback script chạy thành công trên dev.db copy.
- `vitest run` (test PII helpers nếu có) pass.

## Risk Assessment
| Risk | Impact | Mitigation |
|---|---|---|
| Migration corrupts data | CRITICAL | Backup trước; chạy backfill trên copy trước; rollback script ready |
| HMAC key thay đổi → toàn bộ hash sai | CRITICAL | Derive từ `ENCRYPTION_KEY` (đã stable) + version tag `"hmac-v1"`; document |
| SQLite drop unique fail | HIGH | Test migration trên dev.db trước; nếu fail, dùng table-rebuild pattern |
| Quên một service đang query plaintext | HIGH | Grep `customer_code:` trong services + components, audit thủ công |
| CoBorrower decrypt thiếu chỗ → display ciphertext lên UI | MED | Test đọc full profile xong render; thêm guard `isEncrypted` warning |
| Backfill chạy lâu trên >10k rows | LOW | App single-user, dataset nhỏ; nhưng vẫn dùng transaction batch 100 |

## Security Considerations
- HMAC key MUST derive deterministic từ env var; không random per process.
- Hash collision: SHA-256 → khả năng collision negligible cho dataset <10k.
- Hash KHÔNG reverse được nhưng CIF có entropy thấp (~7 chars) → kẻ tấn công có DB dump có thể brute force. Acceptable trade-off (compliance > brute-force resistance), document trong code comment.
- Key rotation: nếu sau này cần rotate, viết script riêng decrypt-with-old → encrypt-with-new.

## Next Steps
- Sau khi merge: monitor 1 tuần, watch error logs cho ciphertext bị leak ra UI.
- Phase 3 có thể consider audit log cho mọi customer mutation (compliance).
