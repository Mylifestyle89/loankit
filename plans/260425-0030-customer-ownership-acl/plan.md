---
title: Customer Ownership & ACL
status: completed
created: 2026-04-25
brainstorm: plans/reports/brainstorm-260425-0030-customer-ownership-acl.md
---

# Customer Ownership & ACL

## Overview

Phân quyền theo owner cho Customer:
- Editor tạo KH → chỉ user đó thấy và sửa được
- Admin → toàn quyền trên toàn bộ DB
- Admin cấp quyền cho user B chỉnh sửa KH của user A (full edit, không xóa/transfer)
- Data cũ → assign về admin

## Approach

`Customer.createdById` (nullable FK) + bảng `CustomerGrant` (delegation).  
Access: `isAdmin OR createdById === userId OR grants.some(userId)`.

## Phases

| Phase | Title | Status | Effort |
|-------|-------|--------|--------|
| [01](phase-01-schema-migration.md) | Prisma Schema + Migration | ✅ | S |
| [02](phase-02-service-layer.md) | Service Layer | ✅ | M |
| [03](phase-03-api-routes.md) | API Routes | ✅ | M |
| [04](phase-04-admin-ui-grants.md) | Admin UI — Grants Panel | ✅ | M |

## Key Files

- `prisma/schema.prisma` — add `Customer.createdById` + `CustomerGrant` model
- `src/services/customer.service.ts` — filter ownership, new `checkCustomerAccess()`
- `src/lib/auth-guard.ts` — no change needed (access check in service)
- `src/app/api/customers/route.ts` — relax POST guard, set createdById
- `src/app/api/customers/[id]/route.ts` — add ownership check on GET/PATCH
- `src/app/api/customers/[id]/grants/route.ts` — NEW: admin grant management
- `src/app/report/customers/[id]/page.tsx` or components — admin grants panel

## Dependencies

- Phase 01 → Phase 02 → Phase 03 → Phase 04 (sequential)
- Phase 04 cần Phase 03 API hoạt động để UI gọi được
