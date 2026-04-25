---
phase: 02
title: Service Layer
status: completed
effort: M
blockedBy: phase-01
---

# Phase 02 — Service Layer

## Files to Modify

- `src/services/customer.service.ts`

## Files to Create

- `src/services/customer-grant.service.ts`

---

## 1. `customer.service.ts` — `listCustomers`

Thêm `userId` + `isAdmin` vào filter type:

```ts
async listCustomers(filter?: {
  customer_type?: string;
  page?: number;
  limit?: number;
  userId?: string;   // session user id — required for non-admin
  isAdmin?: boolean;
})
```

Thêm ownership where clause trước khi query:

```ts
const ownershipWhere = filter?.isAdmin
  ? {}
  : {
      OR: [
        { createdById: filter?.userId ?? null },
        { grants: { some: { userId: filter?.userId ?? "" } } },
      ],
    };

const where = {
  ...(filter?.customer_type ? { customer_type: filter.customer_type } : {}),
  ...ownershipWhere,
};
```

Áp dụng `where` vào cả `prisma.customer.findMany` và `prisma.customer.count`.

---

## 2. `customer.service.ts` — `createCustomer`

Thêm `createdById?: string | null` vào input type (đầu hàm hoặc trong object param).

Trong `prisma.customer.create`, thêm:
```ts
data: {
  ...existingFields,
  createdById: input.createdById ?? null,
}
```

---

## 3. `customer.service.ts` — `checkCustomerAccess` (mới)

Thêm method mới — dùng bởi API routes để verify trước khi trả data:

```ts
async checkCustomerAccess(customerId: string, userId: string): Promise<boolean> {
  const hit = await prisma.customer.findFirst({
    where: {
      id: customerId,
      OR: [
        { createdById: userId },
        { grants: { some: { userId } } },
      ],
    },
    select: { id: true },
  });
  return !!hit;
},
```

> Admin bypass xử lý ở API route layer (kiểm tra role trước khi gọi hàm này).

---

## 4. `customer-grant.service.ts` (file mới)

Tách ra file riêng để giữ `customer.service.ts` < 200 LOC.

```ts
import { prisma } from "@/lib/prisma";

/** List all grants for a customer (admin use) */
export async function listGrants(customerId: string) {
  return prisma.customerGrant.findMany({
    where: { customerId },
    include: {
      user: { select: { id: true, name: true, email: true } },
      grantedBy: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "asc" },
  });
}

/** Grant user access to a customer. Idempotent (upsert). */
export async function grantAccess(customerId: string, userId: string, grantedById: string) {
  return prisma.customerGrant.upsert({
    where: { customerId_userId: { customerId, userId } },
    create: { customerId, userId, grantedById },
    update: { grantedById }, // refresh granter info on re-grant
  });
}

/** Revoke user access from a customer. */
export async function revokeAccess(customerId: string, userId: string) {
  return prisma.customerGrant.deleteMany({
    where: { customerId, userId },
  });
}
```

---

## Todo

- [ ] Cập nhật filter type của `listCustomers` (thêm `userId`, `isAdmin`)
- [ ] Thêm ownership where clause vào `listCustomers` query + count
- [ ] Thêm `createdById` vào `createCustomer` input + prisma.create
- [ ] Thêm `checkCustomerAccess()` method vào customer.service.ts
- [ ] Tạo `src/services/customer-grant.service.ts` với 3 functions
- [ ] Chạy `npx tsc --noEmit` — 0 errors

## Success Criteria

- `listCustomers({ userId: "x", isAdmin: false })` chỉ trả về KH của user x hoặc được grant
- `listCustomers({ isAdmin: true })` trả về toàn bộ (không filter)
- `checkCustomerAccess(id, userId)` trả về `true/false` đúng theo owner/grant
- `grantAccess` idempotent (gọi 2 lần không lỗi)
