# Phase 01 — Add New Schema Fields (non-breaking)

## Context Links

- Plan overview: [plan.md](plan.md)
- Brainstorm: `plans/reports/brainstorm-260505-1007-report-module-data-model.md` § 9 (Schema FINAL)
- Memory: `feedback_prisma_select_new_columns.md` — Turso sync mandatory

## Overview

- **Priority**: P1 (foundation cho Phase 02-05)
- **Status**: Not started
- **Effort**: 0.5d
- Add fields mới + table mới + rename `FieldTemplateMaster` → `MasterTemplate`. Tất cả non-breaking, default values cho code cũ.

## Key Insights

- Rename `FieldTemplateMaster` → `MasterTemplate` qua Prisma `@@map` (DB table name giữ hoặc rename — chốt: rename luôn cho sạch, single migration)
- `MappingInstance` GIỮ NGUYÊN ở phase này (drop ở Phase 5)
- SQLite không hỗ trợ rename column trực tiếp — Prisma sẽ tạo migration ALTER TABLE phù hợp
- Turso phải chạy migration trước Vercel deploy code mới

## Requirements

**Functional**:
- Customer có field `customerProfileValuesJson` default `"{}"`
- Loan có `masterTemplateId` (nullable FK), `dossierValuesJson` default `"{}"`, `exportedDocxBlobRef` (nullable)
- `MasterTemplate` có `companyType`, `reportKind`, `placeholderSchemaJson` default `"[]"`
- Bảng `LoanReportExport` mới với rotate-5 logic chuẩn bị cho Phase 3

**Non-functional**:
- Migration deploy được trên Turso (libSQL)
- Code cũ không cần sửa để chạy được sau migration

## Architecture

```
Customer (existing) ──── + customerProfileValuesJson (String, "{}")
   │
   └─< Loan (existing) ─ + masterTemplateId? FK
                         + dossierValuesJson  (String, "{}")
                         + exportedDocxBlobRef?
                              │
                              └─< LoanReportExport (NEW)
                                  id, loanId, exportedAt, exportedBy
                                  docxPath?, valuesSnapshot, status

MasterTemplate (rename from FieldTemplateMaster)
  + companyType (CTCP|TNHH1TV|TNHH2TV|HKD|CN_individual)
  + reportKind  (BCDX|GiayNhanNo|DanhMucHoSo|UNC|...)
  + placeholderSchemaJson ("[]")
```

## Related Code Files

**Modify**:
- `prisma/schema.prisma` — main schema changes
- `src/services/report/mapping.service.ts` — update type imports nếu reference `FieldTemplateMaster`
- `src/services/report/_migration-internals.ts` — type updates
- Bất kỳ file nào import `FieldTemplateMaster` (search trước)

**Create**:
- `prisma/migrations/{timestamp}_report_module_v2/migration.sql` (Prisma sinh)

**Delete**: none (Phase 5)

## Implementation Steps

1. **Audit usage** — `Grep "FieldTemplateMaster" --type ts` lấy danh sách file phải đổi tên type/import
2. **Edit `prisma/schema.prisma`**:
   ```prisma
   model MasterTemplate {
     id                    String  @id @default(cuid())
     // ... existing fields ...
     companyType           String  // CTCP|TNHH1TV|TNHH2TV|HKD|CN_individual
     reportKind            String  // BCDX|GiayNhanNo|DanhMucHoSo|UNC|...
     placeholderSchemaJson String  @default("[]")
     loans                 Loan[]
     @@map("FieldTemplateMaster") // giữ table name cũ để tránh data move
   }

   model Customer {
     // ... existing ...
     customerProfileValuesJson String @default("{}")
   }

   model Loan {
     // ... existing ...
     masterTemplateId      String?
     masterTemplate        MasterTemplate? @relation(fields: [masterTemplateId], references: [id])
     dossierValuesJson     String  @default("{}")
     exportedDocxBlobRef   String?
     reportExports         LoanReportExport[]
   }

   model LoanReportExport {
     id              String   @id @default(cuid())
     loanId          String
     loan            Loan     @relation(fields: [loanId], references: [id], onDelete: Cascade)
     exportedAt      DateTime @default(now())
     exportedBy      String
     docxPath        String?
     valuesSnapshot  String   // JSON
     status          String   @default("active") // active | rotated_out
     @@index([loanId, exportedAt])
   }
   ```
3. **Decide**: rename type ONLY (keep table name via `@@map`) → giữ data, đổi code dần. Chốt phương án này.
4. **Generate migration**: `npx prisma migrate dev --name report_module_v2 --create-only` — review SQL trước
5. **Inspect SQL** — confirm chỉ có `ALTER TABLE ADD COLUMN` + `CREATE TABLE LoanReportExport`, không có DROP/RENAME table
6. **Apply local**: `npx prisma migrate dev`
7. **Update type imports**: `FieldTemplateMaster` → `MasterTemplate` qua codebase (Grep + replace)
8. **Test compile**: `npm run build` (hoặc `tsc --noEmit`) — đảm bảo 0 lỗi
9. **Test runtime**: chạy app dev, mở 1 customer + 1 loan — không error
10. **Document Turso step**: ghi note trong commit message rằng deploy phải chạy `npm run db:migrate:turso` trước

## Todo List

- [ ] Grep `FieldTemplateMaster` lấy danh sách file ảnh hưởng
- [ ] Edit `prisma/schema.prisma` thêm fields + model
- [ ] `prisma migrate dev --create-only` review SQL
- [ ] Apply migration local SQLite
- [ ] Replace type imports `FieldTemplateMaster` → `MasterTemplate`
- [ ] `npm run build` — 0 lỗi compile
- [ ] Smoke test app dev
- [ ] Commit (chưa push) — chuẩn bị Phase 02
- [ ] Note: Turso migration phải chạy trước deploy

## Success Criteria

- `npm run build` pass
- App dev mở customer/loan không lỗi
- Migration SQL chỉ ADD, không DROP
- Tất cả file imports type cũ đã đổi tên

## Risk Assessment

| Risk | Mitigation |
|---|---|
| Prisma sinh migration RENAME TABLE → mất data | Dùng `@@map("FieldTemplateMaster")` giữ table name |
| Code khác import `FieldTemplateMaster` chưa đổi | Grep audit bước 1, build check bước 8 |
| Turso fail deploy | Memory note: chạy `db:migrate:turso` trước Vercel deploy |

## Security Considerations

- Field mới chứa JSON values từ user input → phase 03 service layer phải JSON.parse safe + zod validate
- `valuesSnapshot` có thể chứa PII (email, mã khách) → Phase 03 đảm bảo encrypt theo chuẩn Agribank PII (memory `project_agribank_pii_compliance.md`)

## Next Steps

- Phase 02 viết migration script backfill data từ `MappingInstance` + `manual_values.json` vào field mới
