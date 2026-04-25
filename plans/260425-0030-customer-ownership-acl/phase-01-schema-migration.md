---
phase: 01
title: Prisma Schema + Migration
status: completed
effort: S
---

# Phase 01 — Prisma Schema + Migration

## Changes

### 1. `prisma/schema.prisma` — User model

Thêm 3 relations vào `model User`:

```prisma
ownedCustomers  Customer[]      @relation("CustomerOwner")
customerGrants  CustomerGrant[] @relation("CustomerGrantee")
grantedGrants   CustomerGrant[] @relation("GrantedBy")
```

### 2. `prisma/schema.prisma` — Customer model

Thêm sau field `updatedAt`:

```prisma
createdById String?
createdBy   User?           @relation("CustomerOwner", fields: [createdById], references: [id], onDelete: SetNull)
grants      CustomerGrant[]
```

Thêm index (sau @@index hiện có):
```prisma
@@index([createdById])
```

### 3. `prisma/schema.prisma` — CustomerGrant model (mới)

Thêm sau `model Customer`:

```prisma
model CustomerGrant {
  id          String   @id @default(cuid())
  customerId  String
  userId      String
  grantedById String
  createdAt   DateTime @default(now())

  customer  Customer @relation(fields: [customerId], references: [id], onDelete: Cascade)
  user      User     @relation("CustomerGrantee", fields: [userId], references: [id], onDelete: Cascade)
  grantedBy User     @relation("GrantedBy", fields: [grantedById], references: [id], onDelete: Cascade)

  @@unique([customerId, userId])
  @@index([userId])
  @@index([customerId])
}
```

### 4. Migration SQL

Tạo migration file mới. Nội dung:

```sql
-- Add createdById to Customer
ALTER TABLE "Customer" ADD COLUMN "createdById" TEXT REFERENCES "user"("id") ON DELETE SET NULL;
CREATE INDEX "Customer_createdById_idx" ON "Customer"("createdById");

-- Create CustomerGrant table
CREATE TABLE "CustomerGrant" (
    "id"          TEXT NOT NULL PRIMARY KEY,
    "customerId"  TEXT NOT NULL REFERENCES "Customer"("id") ON DELETE CASCADE,
    "userId"      TEXT NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
    "grantedById" TEXT NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
    "createdAt"   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE("customerId", "userId")
);
CREATE INDEX "CustomerGrant_userId_idx"     ON "CustomerGrant"("userId");
CREATE INDEX "CustomerGrant_customerId_idx" ON "CustomerGrant"("customerId");

-- Backfill: assign existing customers to first admin user
UPDATE "Customer"
SET "createdById" = (SELECT "id" FROM "user" WHERE "role" = 'admin' ORDER BY "createdAt" ASC LIMIT 1)
WHERE "createdById" IS NULL;
```

> **Lưu ý Turso:** Sau khi tạo migration local, chạy `npm run db:migrate:turso` để push lên production.

## Todo

- [ ] Thêm relations vào `model User` trong schema.prisma
- [ ] Thêm `createdById` + `createdBy` + `grants` vào `model Customer`
- [ ] Thêm `@@index([createdById])` vào Customer
- [ ] Thêm `model CustomerGrant` vào schema.prisma
- [ ] Tạo migration file với SQL trên
- [ ] Chạy `npx prisma migrate dev` locally
- [ ] Verify backfill: kiểm tra `SELECT createdById FROM Customer LIMIT 5` đều có giá trị
- [ ] Chạy `npx prisma generate` để cập nhật Prisma client

## Success Criteria

- `prisma studio` hoặc query thấy `createdById` trên mọi Customer row
- `CustomerGrant` table tồn tại với đúng indexes
- `npx prisma validate` pass, 0 errors
