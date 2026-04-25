# Brainstorm Report — Customer Ownership & ACL

**Date:** 2026-04-25  
**Status:** Agreed → Proceed to plan

---

## Problem Statement

Cần thêm phân quyền theo owner cho Customer:
- User tạo KH → chỉ user đó thấy và sửa được
- Admin → toàn quyền trên toàn bộ DB KH
- Admin có thể cấp quyền cho user B chỉnh sửa KH của user A

---

## Current State

| Aspect | Finding |
|--------|---------|
| `Customer.createdById` | ❌ Không có |
| `POST /api/customers` | `requireAdmin()` — cần đổi |
| `listCustomers` filter | Theo type only, không theo user |
| `requireOwnerOrAdmin()` | ✅ Đã có trong `auth-guard.ts` |

---

## Agreed Solution — Approach A: `createdById` + `CustomerGrant`

### Schema

```prisma
model Customer {
  // ... existing fields ...
  createdById  String?
  createdBy    User?           @relation(fields: [createdById], references: [id], onDelete: SetNull)
  grants       CustomerGrant[]
}

model CustomerGrant {
  id          String   @id @default(cuid())
  customerId  String
  userId      String
  grantedById String
  createdAt   DateTime @default(now())
  customer    Customer @relation(fields: [customerId], references: [id], onDelete: Cascade)
  user        User     @relation("grants", fields: [userId], references: [id], onDelete: Cascade)
  grantedBy   User     @relation("grantedGrants", fields: [grantedById], references: [id])

  @@unique([customerId, userId])
  @@index([userId])
  @@index([customerId])
}
```

### Access Logic

```
isAdmin                                       → full access
customer.createdById === userId               → owner access
CustomerGrant.exists(customerId, userId)      → delegated full-edit access
```

### Migration Strategy

- `createdById = null` cho KH cũ → set = adminUserId trong migration seed

### Changes Scope

| Layer | Change |
|-------|--------|
| Schema | `Customer.createdById?` + `CustomerGrant` model |
| Migration | Set `createdById = adminId` cho data cũ |
| `customer.service.ts` | `listCustomers` + `getCustomerById` filter theo user |
| `POST /api/customers` | `requireAdmin()` → `requireEditorOrAdmin()`, auto-set `createdById` |
| `GET/PATCH /api/customers/[id]` | Thêm `requireCustomerAccess()` check |
| `auth-guard.ts` | Thêm `requireCustomerAccess(customerId, userId)` helper |
| Admin API | `POST/DELETE /api/customers/[id]/grants` |
| Admin UI | Panel quản lý quyền trong customer detail (chỉ admin) |

---

## Risks

- `CustomerPickerModal` (field editor) dùng `listCustomers` → phải test không bị filter sai
- PII mask logic đảm bảo không bị bypass qua grant flow
- `onDelete: SetNull` trên `createdById` → KH không mất khi user bị xóa

---

## Success Criteria

- User editor tạo KH → chỉ thấy KH của mình trong list
- Admin thấy toàn bộ KH
- Admin grant user B → B thấy và sửa được KH của user A
- Data cũ vẫn accessible (assign về admin)
- `CustomerPickerModal` hoạt động bình thường
