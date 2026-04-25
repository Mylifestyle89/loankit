---
phase: 04
title: Admin UI — Grants Panel
status: completed
effort: M
blockedBy: phase-03
---

# Phase 04 — Admin UI: Grants Panel

## Files to Create

- `src/app/report/customers/[id]/components/customer-access-grants-section.tsx`

## Files to Modify

- `src/app/report/customers/[id]/page.tsx` — mount grants section khi `isAdmin`

---

## 1. New Component: `customer-access-grants-section.tsx`

Component client-side, chỉ render khi admin. Hiển thị:
- Owner hiện tại (createdBy)
- Danh sách user được grant (tên, email, granted by, ngày cấp)
- Form thêm grant: dropdown chọn user + nút "Cấp quyền"
- Nút "Thu hồi" trên mỗi grant row

### Data fetching

```ts
// Fetch grants
GET /api/customers/[id]/grants
→ { ok: true, grants: [{ id, user: { id, name, email }, grantedBy: { name }, createdAt }] }

// Fetch users list (dùng authClient.admin.listUsers — cùng pattern admin-users-tab.tsx)
authClient.admin.listUsers({ query: { limit: 100 } })
```

### Grant action

```ts
// Cấp quyền
POST /api/customers/[id]/grants
body: { userId: selectedUserId }

// Thu hồi
DELETE /api/customers/[id]/grants/[userId]
```

### Component structure

```tsx
"use client";
import { authClient } from "@/lib/auth-client";
// ...

export function CustomerAccessGrantsSection({ customerId, ownerName }: {
  customerId: string;
  ownerName: string | null;
}) {
  const { data: session } = authClient.useSession();
  const isAdmin = session?.user?.role === "admin";

  // Không render gì nếu không phải admin
  if (!isAdmin) return null;

  // State: grants[], users[], selectedUserId, loading, error
  // useEffect: fetchGrants(), fetchUsers()

  return (
    <section>
      <h3>Quản lý quyền truy cập</h3>

      {/* Owner info */}
      <div>Owner: {ownerName ?? "Admin"}</div>

      {/* Grants list */}
      <table>
        {/* user name | email | granted by | date | action */}
        {grants.map(g => (
          <tr key={g.id}>
            <td>{g.user.name}</td>
            <td>{g.user.email}</td>
            <td>{g.grantedBy.name}</td>
            <td>{formatDate(g.createdAt)}</td>
            <td>
              <button onClick={() => handleRevoke(g.user.id)}>Thu hồi</button>
            </td>
          </tr>
        ))}
      </table>

      {/* Add grant form */}
      <select value={selectedUserId} onChange={...}>
        <option value="">Chọn user...</option>
        {users
          .filter(u => u.id !== session?.user?.id) // exclude self
          .map(u => <option key={u.id} value={u.id}>{u.name} ({u.email})</option>)
        }
      </select>
      <button onClick={handleGrant} disabled={!selectedUserId}>Cấp quyền</button>
    </section>
  );
}
```

### Styling

Dùng cùng pattern với `customer-staff-section.tsx` hoặc `customer-credit-info-section.tsx`:
- Container: `rounded-xl border border-zinc-200 dark:border-white/[0.07] bg-white dark:bg-[#161616] p-4`
- Header: `text-sm font-semibold text-zinc-700 dark:text-slate-300`
- Table: `w-full text-sm`, row `border-t border-zinc-100 dark:border-white/[0.05]`
- Revoke button: `text-xs text-red-600 hover:bg-red-50 px-2 py-0.5 rounded`
- Grant button: `text-xs bg-brand-500 text-white px-3 py-1.5 rounded-lg hover:bg-brand-600`

---

## 2. `src/app/report/customers/[id]/page.tsx` — Mount section

Thêm import + render ở cuối page, sau các section hiện tại:

```tsx
import { CustomerAccessGrantsSection } from "./components/customer-access-grants-section";

// Trong render, sau section cuối cùng:
<CustomerAccessGrantsSection
  customerId={customerId}
  ownerName={customer?.createdBy?.name ?? null}
/>
```

Component tự hide nếu không phải admin (check bên trong) — page không cần biết role.

> **Lưu ý:** `customer.createdBy` cần được include trong `getFullProfile()` response.  
> Thêm `createdBy: { select: { id: true, name: true } }` vào `customerService.getFullProfile()`.

---

## Todo

- [ ] Tạo `customer-access-grants-section.tsx` với đầy đủ fetch/grant/revoke logic
- [ ] Style nhất quán với các section hiện có (dark mode, border, typography)
- [ ] Thêm `createdBy: { select: { id: true, name: true } }` vào `getFullProfile()` trong customer.service.ts
- [ ] Mount `<CustomerAccessGrantsSection>` vào cuối `customers/[id]/page.tsx`
- [ ] Test: admin thấy section, editor/viewer không thấy
- [ ] Test: cấp quyền → user được grant thấy KH trong list
- [ ] Test: thu hồi → user không còn thấy KH
- [ ] `npx tsc --noEmit` — 0 errors

## Success Criteria

- Admin vào trang KH → thấy section "Quản lý quyền truy cập" ở cuối
- Section hiển thị đúng owner + danh sách grants hiện tại
- Admin cấp quyền cho user B → B thấy KH trong list ngay sau khi reload
- Admin thu hồi → B không còn thấy KH
- Editor/viewer không thấy section (component tự hide)
- Không có TypeScript errors
