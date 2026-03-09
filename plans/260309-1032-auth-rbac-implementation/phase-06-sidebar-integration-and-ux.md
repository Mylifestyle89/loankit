# Phase 6: Sidebar Integration & UX

## Context Links
- Phase 1-5 should be complete (or at least 1-3)
- Report layout: `src/app/report/layout.tsx`
- Auth client: `src/lib/auth-client.ts`

## Overview
- **Priority:** P2
- **Status:** complete
- **Description:** Add user info, logout button, and admin link to sidebar. Show/hide nav items based on role.

## Key Insights
- Sidebar is client component (`"use client"`) — can use `useSession()` hook
- Need: user avatar/initials, user name, logout button at bottom of sidebar
- Admin link (`/report/admin/users`) only visible to admin role
- Viewer role: hide certain nav items or mark them read-only (future consideration)
- Current sidebar is 222 lines — close to 200 line limit. May need to extract user section as separate component.

## Requirements
### Functional
- Display logged-in user name/email at bottom of sidebar
- Logout button that signs out and redirects to `/login`
- "User Management" link visible only to admin role users
- Graceful loading state while session is being fetched

### Non-functional
- Sidebar animation still smooth
- Consistent with existing sidebar design (collapsed/expanded states)

## Related Code Files
### Files to modify
- `src/app/report/layout.tsx` — Add user section, admin link, logout

### Files to create (optional, for modularization)
- `src/app/report/components/sidebar-user-section.tsx` — User info + logout

## Implementation Steps

### 1. Add useSession to report layout
```typescript
import { useSession, authClient } from "@/lib/auth-client";

// Inside component:
const { data: session, isPending } = useSession();
```

### 2. Add admin link to navigation (conditional)
```typescript
const links = [
  // ... existing links
  { href: "/report/guide", label: t("nav.guide"), icon: BookOpen },
];

// Admin-only links
if (session?.user?.role === "admin") {
  links.push({ href: "/report/admin/users", label: t("nav.users"), icon: Shield });
}
```

### 3. Add user section at bottom of sidebar
Below the language toggle, before closing `</motion.aside>`:

```tsx
{/* User section */}
<div className="shrink-0 px-1.5 pb-2.5">
  <div className="mx-0 mb-1.5 h-px bg-slate-100 dark:bg-white/[0.06]" />

  {session?.user && (
    <>
      {/* User info */}
      <div className={`flex items-center rounded-lg py-1.5 text-xs ${
        hovered ? "gap-2.5 px-2.5" : "justify-center px-0"
      }`}>
        {/* Avatar circle with initials */}
        <div className="flex h-[17px] w-[17px] shrink-0 items-center justify-center rounded-full bg-indigo-100 text-[9px] font-semibold text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300">
          {session.user.name?.charAt(0)?.toUpperCase() || "U"}
        </div>
        <AnimatePresence>
          {hovered && (
            <motion.span ...>
              {session.user.name || session.user.email}
            </motion.span>
          )}
        </AnimatePresence>
      </div>

      {/* Logout button */}
      <button
        onClick={async () => {
          await authClient.signOut();
          router.push("/login");
        }}
        className={`flex w-full items-center rounded-lg py-1.5 text-xs ... ${
          hovered ? "gap-2.5 px-2.5" : "justify-center px-0"
        }`}
      >
        <LogOut className="h-[17px] w-[17px] shrink-0" />
        {hovered && <motion.span ...>{t("nav.logout")}</motion.span>}
      </button>
    </>
  )}
</div>
```

### 4. Extract sidebar-user-section component (modularization)
Since layout.tsx is already 222 lines, extract the user section + bottom controls into a separate component to stay under 200 lines.

### 5. Add translation keys
```
nav.users: "Quan ly nguoi dung" / "User Management"
nav.logout: "Dang xuat" / "Sign Out"
```

### 6. Add `LogOut` and `Shield` to lucide-react imports

## Todo List
- [x] Add `useSession()` to report layout
- [x] Add admin-only nav link for user management
- [x] Add user info display (name/initials)
- [x] Add logout button
- [x] Extract user section component (if layout > 200 lines)
- [x] Add translation keys
- [x] Test: admin sees admin link, viewer does not
- [x] Test: logout redirects to /login

## Success Criteria
- [x] User name/initials visible in sidebar
- [x] Logout works and redirects to /login
- [x] Admin link visible only to admin users
- [x] Sidebar animation unchanged
- [x] Layout file stays under 200 lines (with extraction)

## Risk Assessment
- **Session loading flash:** Brief moment where session is undefined -> hide user section until loaded (isPending state).

## Next Steps
- Phase 7: Migration & Seed Data
