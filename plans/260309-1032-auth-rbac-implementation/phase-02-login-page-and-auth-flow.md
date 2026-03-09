# Phase 2: Login Page & Auth Flow

## Context Links
- Phase 1 must be complete first
- Landing page: `src/app/page.tsx`
- Root layout: `src/app/layout.tsx`
- Design system: existing Tailwind + dark mode support
- Language system: `src/components/language-provider.tsx`

## Overview
- **Priority:** P1
- **Status:** complete
- **Description:** Create login page, wire up sign-in flow, handle redirects

## Key Insights
- No public signup — only admin creates users. Login page = email + password only.
- Landing page (`/`) currently links directly to `/report/mapping`. After auth: redirect logged-in users to `/report/mapping`, show login for unauthenticated.
- Must support dark mode and bilingual (vi/en) like rest of app.
- Use `authClient.signIn.email()` from Better Auth client.

## Requirements
### Functional
- Login page at `/login` with email + password fields
- Error handling: wrong credentials, banned user, server error
- Redirect to `/report/mapping` after successful login
- "Remember me" not needed (sessions last 7 days by default)
- Logout functionality (wired in Phase 6 sidebar)

### Non-functional
- Consistent with existing dark mode + design system
- Bilingual support (vi/en)
- Accessible (form labels, keyboard navigation)

## Architecture
```
src/app/
  login/
    page.tsx           <-- Login page (client component)
  page.tsx             <-- Update: redirect if logged in
```

## Related Code Files
### Files to modify
- `src/app/page.tsx` — Add auth check, redirect logged-in users

### Files to create
- `src/app/login/page.tsx` — Login form page

### Translation keys to add
- `login.title`, `login.email`, `login.password`, `login.submit`, `login.error.*`

## Implementation Steps

### 1. Create `src/app/login/page.tsx`
Client component with:
- Email input, password input, submit button
- Use `authClient.signIn.email({ email, password })` on submit
- Handle errors: display message below form
- On success: `router.push("/report/mapping")`
- Styling: centered card, matches app design (indigo gradient accents, dark mode)
- Use `useLanguage()` for i18n

```typescript
"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { useLanguage } from "@/components/language-provider";

export default function LoginPage() {
  const { t } = useLanguage();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const { error } = await authClient.signIn.email({ email, password });
    setLoading(false);
    if (error) {
      setError(error.message || t("login.errorGeneric"));
      return;
    }
    router.push("/report/mapping");
  }

  return (
    // Centered card form with dark mode support
    // See existing page.tsx for gradient/styling reference
  );
}
```

### 2. Update landing page (`src/app/page.tsx`)
- Keep current design but change "Get Started" button:
  - If logged in: link to `/report/mapping`
  - If not logged in: link to `/login`
- Since landing page is a server component, use `auth.api.getSession()` to check
- Or convert to client component and use `useSession()`

**Simpler approach (KISS):** Keep as server component, always link to `/report/mapping`. Middleware (Phase 3) will redirect to `/login` if not authenticated. The "Get Started" button already goes to `/report/mapping`.

### 3. Add translation keys
Add to language provider's translation objects:
```
login.title: "Dang nhap" / "Sign In"
login.email: "Email"
login.password: "Mat khau" / "Password"
login.submit: "Dang nhap" / "Sign In"
login.errorGeneric: "Sai email hoac mat khau" / "Invalid email or password"
login.errorBanned: "Tai khoan da bi khoa" / "Account is banned"
```

## Todo List
- [x] Create `src/app/login/page.tsx` with login form
- [x] Add translation keys for login page
- [x] Style login page (dark mode, responsive, consistent with app)
- [x] Test login flow: success redirect, error display
- [x] Test with wrong credentials

## Success Criteria
- [x] Login page renders at `/login`
- [x] Valid credentials -> redirect to `/report/mapping`
- [x] Invalid credentials -> error message displayed
- [x] Dark mode and language toggle work on login page

## Risk Assessment
- **No user exists yet:** Need Phase 7 (seed) to create initial admin. During dev, manually create via Better Auth API or Prisma Studio.
- **Login page styling:** Keep minimal. Card with form, don't over-engineer.

## Next Steps
- Phase 3: Middleware & Page Protection
