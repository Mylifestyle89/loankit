---
phase: 01
title: Schema + Migration
status: completed
effort: S
completed: 2026-04-25
---

# Phase 01 — Schema + Migration

## Changes to `prisma/schema.prisma`

Thêm 2 fields vào `model Invoice`:

```prisma
model Invoice {
  // ... existing fields (không thay đổi) ...

  // NEW: retail invoice line items (CostItem[])
  items_json   String?  // JSON: [{ name, unit, qty, unitPrice, amount }]
  // NEW: retail invoice template type
  templateType String?  // tap_hoa | vlxd | y_te | nong_san
}
```

> Giữ nguyên `qty` và `unitPrice` hiện có (backward compat với single-item invoices).

## Migration SQL

```sql
ALTER TABLE "Invoice" ADD COLUMN "items_json" TEXT;
ALTER TABLE "Invoice" ADD COLUMN "templateType" TEXT;
```

### Thực hiện

```bash
# Tạo migration file
mkdir prisma/migrations/20260425020000_add_invoice_retail_fields

# Viết SQL vào file migration.sql

# Apply lên local dev.db
npx prisma db execute --file prisma/migrations/20260425020000_add_invoice_retail_fields/migration.sql

# Apply lên prisma/dev.db (runtime)
DATABASE_URL="file:./prisma/dev.db" npx prisma db execute --file ...

# Regenerate Prisma client
npx prisma generate

# Turso production (sau khi test xong)
npm run db:migrate:turso
```

## Todo

- [ ] Thêm `items_json String?` vào model Invoice trong schema.prisma
- [ ] Thêm `templateType String?` vào model Invoice trong schema.prisma
- [ ] Tạo migration SQL file
- [ ] Apply migration lên cả 2 dev.db
- [ ] `npx prisma generate`
- [ ] `npx tsc --noEmit` — 0 errors

## Success Criteria

- `prisma studio` thấy 2 cột mới trên bảng Invoice
- TypeScript không có lỗi type nào liên quan đến Invoice model
