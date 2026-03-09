# Phase 5: Admin User Management Panel

## Context Links
- Phase 1, 2, 3, 4 must be complete
- [Better Auth Admin Plugin](https://better-auth.com/docs/plugins/admin)
- Auth client: `src/lib/auth-client.ts`
- Existing page pattern: `src/app/report/customers/page.tsx` (CRUD table reference)

## Overview
- **Priority:** P2
- **Status:** complete
- **Description:** Create admin-only page for user management: list users, create new users (invite-only), change roles, ban/unban

## Key Insights
- Better Auth admin plugin provides all CRUD operations client-side: `authClient.admin.createUser()`, `listUsers()`, `setRole()`, `banUser()`, etc.
- Invite-only: admin fills out name + email + password, no signup link sent. Admin gives credentials to user directly (internal tool).
- Page at `/report/admin/users` — fits existing `/report/**` structure.
- Only visible to admin role users. Sidebar link hidden for viewers (Phase 6).

## Requirements
### Functional
- List all users with name, email, role, status (active/banned), createdAt
- Create user form: name, email, password, role (admin/viewer)
- Edit user: change role
- Ban/unban user
- Delete user (with confirmation)
- Only accessible by admin role

### Non-functional
- Consistent with existing table/form patterns in the app
- Responsive, dark mode
- Bilingual (vi/en)

## Architecture
```
src/app/report/admin/
  users/
    page.tsx                    <-- User management page (client component)
    components/
      user-table.tsx            <-- User list table
      create-user-dialog.tsx    <-- Create user modal/dialog
```

## Related Code Files
### Files to create
- `src/app/report/admin/users/page.tsx`
- `src/app/report/admin/users/components/user-table.tsx`
- `src/app/report/admin/users/components/create-user-dialog.tsx`

### Files to reference (pattern)
- `src/app/report/customers/page.tsx` — Table layout reference
- `src/components/ui/` — Reusable UI components

## Implementation Steps

### 1. Create page layout `src/app/report/admin/users/page.tsx`
```typescript
"use client";
import { useEffect, useState } from "react";
import { authClient, useSession } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import { UserTable } from "./components/user-table";
import { CreateUserDialog } from "./components/create-user-dialog";

export default function AdminUsersPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [users, setUsers] = useState([]);
  const [showCreate, setShowCreate] = useState(false);

  // Redirect non-admin users
  useEffect(() => {
    if (session && session.user.role !== "admin") {
      router.push("/report/mapping");
    }
  }, [session, router]);

  // Fetch users
  async function loadUsers() {
    const { data } = await authClient.admin.listUsers({
      query: { limit: 100, sortBy: "createdAt", sortDirection: "desc" }
    });
    if (data) setUsers(data.users);
  }

  useEffect(() => { loadUsers(); }, []);

  return (
    <div>
      <header>
        <h1>{t("admin.users.title")}</h1>
        <button onClick={() => setShowCreate(true)}>
          {t("admin.users.create")}
        </button>
      </header>
      <UserTable users={users} onRefresh={loadUsers} />
      {showCreate && (
        <CreateUserDialog
          onClose={() => setShowCreate(false)}
          onCreated={loadUsers}
        />
      )}
    </div>
  );
}
```

### 2. Create `user-table.tsx`
Table columns: Name, Email, Role, Status, Actions
- Role: badge (admin = indigo, viewer = gray)
- Status: active (green) / banned (red)
- Actions dropdown: Change Role, Ban/Unban, Delete

Key operations:
```typescript
// Change role
await authClient.admin.setRole({ userId, role: newRole });

// Ban user
await authClient.admin.banUser({ userId, banReason: "Admin action" });

// Unban user
await authClient.admin.unbanUser({ userId });

// Delete — use server-side: await authClient.admin.removeUser({ userId })
```

### 3. Create `create-user-dialog.tsx`
Modal form with fields:
- Name (required)
- Email (required, validated)
- Password (required, min 8 chars)
- Role (select: admin / viewer, default: viewer)

On submit:
```typescript
const { data, error } = await authClient.admin.createUser({
  email, password, name, role,
});
```

### 4. Add admin route protection
The page uses client-side role check (redirect non-admins). API calls go through Better Auth admin plugin which already enforces admin role server-side.

Additionally, middleware (Phase 3) ensures only authenticated users reach this page.

### 5. Add translation keys
```
admin.users.title: "Quan ly nguoi dung" / "User Management"
admin.users.create: "Tao nguoi dung" / "Create User"
admin.users.name: "Ten" / "Name"
admin.users.email: "Email"
admin.users.role: "Vai tro" / "Role"
admin.users.status: "Trang thai" / "Status"
admin.users.actions: "Thao tac" / "Actions"
admin.users.changeRole: "Doi vai tro" / "Change Role"
admin.users.ban: "Khoa" / "Ban"
admin.users.unban: "Mo khoa" / "Unban"
admin.users.delete: "Xoa" / "Delete"
admin.users.confirmDelete: "Ban co chac muon xoa?" / "Are you sure?"
admin.users.createSuccess: "Tao thanh cong" / "User created"
admin.users.roleAdmin: "Quan tri vien" / "Admin"
admin.users.roleViewer: "Nguoi xem" / "Viewer"
```

## Todo List
- [x] Create admin users page (`src/app/report/admin/users/page.tsx`)
- [x] Create user table component
- [x] Create user dialog component
- [x] Add role change functionality
- [x] Add ban/unban functionality
- [x] Add delete user functionality
- [x] Add translation keys (vi/en)
- [x] Test: admin can access, viewer cannot
- [x] Test: CRUD operations work

## Success Criteria
- [x] Admin can list, create, edit-role, ban/unban, delete users
- [x] Viewer users are redirected away from admin page
- [x] Better Auth admin plugin enforces admin role server-side
- [x] UI matches app design (dark mode, responsive, bilingual)

## Risk Assessment
- **Admin deletes themselves:** Better Auth should prevent this. Verify behavior.
- **No users left:** If all admins are deleted/banned, need seed script to recover. Document recovery procedure.

## Next Steps
- Phase 6: Sidebar Integration & UX
