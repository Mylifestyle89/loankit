# Phase 5: Admin Panel Enhancements

## Overview
- Priority: P2
- Status: complete
- Effort: 1h
- Depends on: Phase 1, Phase 4

Admin can change email/password of ANY user from admin panel. ✓ DONE

## Key Insights
- Current admin panel (`src/app/report/admin/users/page.tsx`) has: list users, create user, toggle role, delete user
- Need to add: edit email, set password for any user
- Better Auth admin plugin: `authClient.admin.setPassword({ userId, newPassword })` — no current password needed
- For email: use custom admin API or Prisma direct update
- Page is already 281 lines — MUST extract components to stay under 200 lines

## Architecture

```
AdminUsersPage (page.tsx) — ~120 lines
  ├── CreateUserForm (extracted component) — ~80 lines
  ├── UserRow (extracted component) — ~80 lines
  │   ├── Role cycle button (admin/editor/viewer)
  │   ├── Edit email/password button → opens inline form
  │   └── Delete button
  └── EditUserModal (new component) — ~100 lines
      ├── Change email field
      └── Set new password field (no current password needed for admin)
```

## Related Code Files

### Modify
- `src/app/report/admin/users/page.tsx` — refactor + add edit functionality

### Create (extract from existing)
- `src/app/report/admin/users/create-user-form.tsx` — extracted from page
- `src/app/report/admin/users/user-row.tsx` — extracted from page
- `src/app/report/admin/users/edit-user-dialog.tsx` — new: admin edit email/password

### Create (API)
- `src/app/api/user/admin-manage/route.ts` — admin endpoint to change user email/password

## Implementation Steps

1. **Create admin manage API** (`src/app/api/user/admin-manage/route.ts`)
   ```typescript
   // PATCH — admin changes another user's email and/or password
   // Body: { userId: string, email?: string, newPassword?: string }
   // Uses requireAdmin()
   // Email: check uniqueness, update via Prisma
   // Password: use auth.api admin setPassword or Prisma + hash
   ```

2. **Extract components from admin page** (modularization)
   - Move `CreateUserForm` to `create-user-form.tsx`
   - Move `UserRow` to `user-row.tsx`
   - Update imports in page.tsx
   - Add "editor" to role options in CreateUserForm (if not done in Phase 1)

3. **Create EditUserDialog** (`edit-user-dialog.tsx`)
   - Simple inline expandable form or modal
   - Fields: new email (pre-filled), new password (optional)
   - Save button calls admin manage API
   - Success: close dialog, refresh user list

4. **Add edit button to UserRow**
   - Pencil/Edit icon button next to role toggle
   - onClick: toggle EditUserDialog for that user
   - Don't show for self (self-service is on profile page)

5. **Update role toggle** in UserRow
   - Current: toggles between admin ↔ viewer
   - New: cycles admin → editor → viewer → admin
   - Use Better Auth `authClient.admin.setRole()`

## Todo List
- [x] Create admin manage API endpoint
- [x] Extract CreateUserForm to separate file
- [x] Extract UserRow to separate file
- [x] Add "editor" to CreateUserForm role select
- [x] Update toggleRole to cycle 3 roles
- [x] Create EditUserDialog component
- [x] Add edit button to UserRow
- [x] Wire up API calls in EditUserDialog
- [x] Verify each file under 200 lines
- [x] Test admin changing other user's email
- [x] Test admin setting other user's password

## Success Criteria
- Admin can change any user's email from admin panel
- Admin can set any user's password (no current password needed)
- Role toggle cycles through admin/editor/viewer
- CreateUserForm includes editor role option
- Each component file under 200 lines
- No regression in existing admin functionality

## Risk Assessment
- Low-medium: extracting components is mechanical but needs care with state/props
- Better Auth admin `setPassword` API may need specific config — verify at implementation
- Password hashing: if using custom API, must hash with same algorithm Better Auth uses (bcrypt)

## Security Considerations
- All admin operations behind `requireAdmin()` guard
- Admin can set password without knowing current — intentional for admin override
- Email uniqueness enforced server-side
- Self-edit prevented in admin panel (use profile page instead)
