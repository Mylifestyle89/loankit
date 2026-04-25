---
phase: 03
title: API Routes
status: completed
effort: M
blockedBy: phase-02
---

# Phase 03 — API Routes

## Files to Modify

- `src/app/api/customers/route.ts` — GET list + POST create
- `src/app/api/customers/[id]/route.ts` — GET detail + PATCH update

## Files to Create

- `src/app/api/customers/[id]/grants/route.ts` — GET list + POST grant
- `src/app/api/customers/[id]/grants/[userId]/route.ts` — DELETE revoke

---

## 1. `GET /api/customers` — Pass user context to service

```ts
export async function GET(req: NextRequest) {
  const session = await requireSession();
  const isAdmin = session.user.role === "admin";
  const rawType = req.nextUrl.searchParams.get("type");
  const type = rawType === "corporate" || rawType === "individual" ? rawType : undefined;
  const page = Number(req.nextUrl.searchParams.get("page")) || 1;
  const limit = Number(req.nextUrl.searchParams.get("limit")) || 50;

  const result = await customerService.listCustomers({
    customer_type: type,
    page,
    limit,
    userId: session.user.id,
    isAdmin,
  });
  // ... rest unchanged
}
```

---

## 2. `POST /api/customers` — Editor có thể tạo, set createdById

```ts
export async function POST(req: NextRequest) {
  const session = await requireEditorOrAdmin(); // was requireAdmin()
  const body = await req.json();
  const parsed = createCustomerSchema.parse(body);
  const customer = await customerService.createCustomer({
    ...parsed,
    createdById: session.user.id, // owner = người tạo
  });
  // ...
}
```

---

## 3. `GET /api/customers/[id]` — Check ownership cho non-admin

```ts
export async function GET(req, { params }) {
  const session = await requireSession();
  const { id } = await params;

  // Non-admin: verify ownership or grant
  if (session.user.role !== "admin") {
    const hasAccess = await customerService.checkCustomerAccess(id, session.user.id);
    if (!hasAccess) {
      return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
    }
  }
  // ... rest unchanged (full/reveal logic stays)
}
```

---

## 4. `PATCH /api/customers/[id]` — Check ownership cho non-admin

```ts
export async function PATCH(req, { params }) {
  const session = await requireEditorOrAdmin();
  const { id } = await params;

  if (session.user.role !== "admin") {
    const hasAccess = await customerService.checkCustomerAccess(id, session.user.id);
    if (!hasAccess) {
      return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
    }
  }
  // ... rest unchanged
}
```

---

## 5. `GET /api/customers/[id]/grants` — Liệt kê grants (admin only)

```ts
import { listGrants } from "@/services/customer-grant.service";

export async function GET(_req, { params }) {
  try {
    await requireAdmin();
    const { id } = await params;
    const grants = await listGrants(id);
    return NextResponse.json({ ok: true, grants });
  } catch (error) {
    const authResponse = handleAuthError(error);
    if (authResponse) return authResponse;
    return NextResponse.json({ ok: false, error: "Failed" }, { status: 500 });
  }
}
```

---

## 6. `POST /api/customers/[id]/grants` — Cấp quyền (admin only)

Body: `{ userId: string }`

```ts
export async function POST(req, { params }) {
  try {
    const session = await requireAdmin();
    const { id } = await params;
    const { userId } = await req.json();
    if (!userId) return NextResponse.json({ ok: false, error: "userId required" }, { status: 400 });

    // Cannot grant to owner or self-grant
    const customer = await prisma.customer.findUnique({ where: { id }, select: { createdById: true } });
    if (customer?.createdById === userId) {
      return NextResponse.json({ ok: false, error: "User is already the owner" }, { status: 400 });
    }

    const grant = await grantAccess(id, userId, session.user.id);
    return NextResponse.json({ ok: true, grant });
  } catch (error) { /* ... */ }
}
```

---

## 7. `DELETE /api/customers/[id]/grants/[userId]` — Thu hồi quyền (admin only)

```ts
export async function DELETE(_req, { params }) {
  try {
    await requireAdmin();
    const { id, userId } = await params;
    await revokeAccess(id, userId);
    return NextResponse.json({ ok: true });
  } catch (error) { /* ... */ }
}
```

---

## Edge Cases

| Case | Handling |
|------|---------|
| User bị xóa | `onDelete: Cascade` trên CustomerGrant — grant tự xóa |
| KH bị xóa | `onDelete: Cascade` — grants tự xóa |
| Grant owner của KH | Block tại POST /grants: `customer.createdById === userId → 400` |
| Viewer role | `requireEditorOrAdmin()` trên POST/PATCH block viewer; GET trả 403 qua checkCustomerAccess |
| CustomerPickerModal | Gọi `GET /api/customers` — đã pass userId, filter đúng theo owner |

---

## Todo

- [ ] `GET /api/customers`: thêm `userId` + `isAdmin` vào `listCustomers` call
- [ ] `POST /api/customers`: đổi `requireAdmin()` → `requireEditorOrAdmin()`, thêm `createdById`
- [ ] `GET /api/customers/[id]`: thêm ownership check cho non-admin
- [ ] `PATCH /api/customers/[id]`: thêm ownership check cho non-admin
- [ ] Tạo `src/app/api/customers/[id]/grants/route.ts` (GET + POST)
- [ ] Tạo `src/app/api/customers/[id]/grants/[userId]/route.ts` (DELETE)
- [ ] `npx tsc --noEmit` — 0 errors
- [ ] Test manual: editor tạo KH → chỉ thấy KH đó; admin thấy tất cả

## Success Criteria

- Editor tạo KH → `GET /api/customers` trả về đúng KH của họ
- Editor truy cập `GET /api/customers/[id]` KH của người khác → 403
- Admin `POST /api/customers/[id]/grants` với `{ userId }` → grant tồn tại trong DB
- Admin `DELETE /api/customers/[id]/grants/[userId]` → grant bị xóa
- User được grant truy cập `GET /api/customers/[id]` của người khác → 200
