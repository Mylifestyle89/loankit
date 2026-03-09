# Phase 4: Email/Password Change API + Profile Page

## Overview
- Priority: P2
- Status: complete
- Effort: 2h
- Depends on: Phase 1

Self-service email/password change for users + profile/account settings page. ✓ DONE

## Key Insights
- Better Auth has built-in `changePassword` API — need to enable it in config
- Better Auth `changeEmail` — check if available or implement custom
- For self-service: user changes their OWN email/password using session
- Better Auth admin plugin: `auth.api.setPassword`, `updateUser` — for admin changing other users
- Need new page: `/report/profile` or `/report/account` for user self-service

## Better Auth APIs Available
- `authClient.changePassword({ currentPassword, newPassword })` — built-in, needs `password.enabled: true` (already set via `emailAndPassword.enabled`)
- `authClient.changeEmail({ newEmail })` — may need verification flow; check docs
- `authClient.updateUser({ name, image })` — update profile fields
- Server-side: `auth.api.changePassword`, `auth.api.updateUser`

## Architecture

```
User Profile Page (/report/account)
  ├── Display: name, email, role (read-only)
  ├── Change Name (authClient.updateUser)
  ├── Change Email (custom API or authClient.changeEmail)
  └── Change Password (authClient.changePassword)
```

## Related Code Files

### Modify
- `src/lib/auth.ts` — enable changeEmail if needed

### Create
- `src/app/report/account/page.tsx` — user profile/account settings page

### Reference
- `src/lib/auth-client.ts` — Better Auth client with admin plugin

## Implementation Steps

1. **Check Better Auth changeEmail support**
   - If `authClient.changeEmail` exists — use it directly
   - If not — create custom API: `POST /api/auth/change-email` that updates user email via Prisma
   - Simpler approach for internal app: custom API endpoint (no email verification needed for internal tool)

2. **Create custom email/password change API** (`src/app/api/user/account/route.ts`)
   - `PATCH` — change email and/or password for SELF
   ```typescript
   // Body: { email?: string, currentPassword?: string, newPassword?: string }
   // Uses requireSession() to get user
   // For password: validate currentPassword, then update
   // For email: check uniqueness, then update
   ```

3. **Create profile page** (`src/app/report/account/page.tsx`)
   - Show current user info (name, email, role as read-only badge)
   - Form sections:
     - **Change Name**: input + save button
     - **Change Email**: new email input + save button
     - **Change Password**: current password + new password + confirm + save button
   - Use `authClient.useSession()` for current data
   - Use `authClient.updateUser()` for name change
   - Use custom API or authClient methods for email/password

4. **Add navigation link** to profile page
   - Find existing nav/sidebar component
   - Add "Account" or "Profile" link (icon: User or Settings)

5. **Password change flow** (self-service)
   - Require current password for security
   - Validate new password (min 8 chars)
   - Use Better Auth's `authClient.changePassword({ currentPassword, newPassword })`
   - If Better Auth doesn't expose this client-side, use custom API

6. **Email change flow** (self-service)
   - Simple for internal app: no verification email
   - Check email uniqueness
   - Update via Prisma directly in custom API
   - Invalidate session after email change (re-login)

## Todo List
- [x] Check Better Auth changePassword/changeEmail client APIs
- [x] Create custom account API endpoint if needed
- [x] Create profile page at /report/account
- [x] Implement change name form
- [x] Implement change email form
- [x] Implement change password form (with current password validation)
- [x] Add navigation link to profile page
- [x] Handle success/error states in UI
- [x] Keep page under 200 lines (extract form components if needed)

## Success Criteria
- User can view their profile info
- User can change their own name
- User can change their own email (with uniqueness check)
- User can change their own password (requires current password)
- Proper error messages on failure
- Session remains valid after name change

## Risk Assessment
- Medium: Better Auth's changePassword/changeEmail client APIs may have different signatures than expected
- Mitigation: check at implementation time, fall back to custom API
- Email change may need session refresh — handle gracefully

## Security Considerations
- Password change requires current password (prevents unauthorized changes)
- Email uniqueness enforced server-side
- All operations require active session
- No admin escalation possible (role is read-only on profile page)
