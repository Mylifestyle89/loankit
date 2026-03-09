# Phase 3: Middleware & Page Protection

## Context Links
- Phase 1, 2 must be complete
- [Better Auth Next.js middleware](https://better-auth.com/docs/integrations/next)
- Report layout: `src/app/report/layout.tsx`
- Next.js config: `next.config.ts`

## Overview
- **Priority:** P1
- **Status:** complete
- **Description:** Add Next.js middleware to protect all `/report/**` pages, redirect unauthenticated users to `/login`

## Key Insights
- Next.js 16 renamed middleware to "proxy" but the file convention (`middleware.ts` at project root) still works
- Best practice: only check cookie existence in middleware (fast, no DB call). Full session validation happens in API routes/server components.
- Better Auth provides `getSessionCookie()` helper for lightweight cookie checks
- Public routes: `/`, `/login`, `/api/auth/**` — everything else requires auth
- `/api/cron/**` already has its own secret-based auth — keep that, but also require session for manual access

## Requirements
### Functional
- Unauthenticated users accessing `/report/**` -> redirect to `/login`
- Unauthenticated users accessing `/api/**` (except `/api/auth/**`, `/api/cron/**`) -> return 401
- Authenticated users accessing `/login` -> redirect to `/report/mapping`
- Public routes: `/`, `/login`, `/api/auth/**`

### Non-functional
- Middleware must be fast (cookie check only, no DB)
- No impact on static assets, `_next/`, favicon, etc.

## Architecture
```
middleware.ts (project root)
  |
  |--> /report/** : check session cookie -> redirect /login if missing
  |--> /login     : check session cookie -> redirect /report/mapping if present
  |--> /api/**    : check session cookie -> 401 if missing (except /api/auth/**)
  |--> everything else: pass through
```

## Related Code Files
### Files to create
- `middleware.ts` (project root) — Route protection middleware

### Files to modify
- None (middleware is standalone)

## Implementation Steps

### 1. Create `middleware.ts` at project root

```typescript
import { NextRequest, NextResponse } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

const PUBLIC_PATHS = ["/", "/login", "/api/auth"];
const CRON_PATH = "/api/cron";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip public paths
  if (PUBLIC_PATHS.some(p => pathname === p || pathname.startsWith(p + "/"))) {
    // If user is on /login and has session cookie, redirect to app
    if (pathname === "/login") {
      const sessionCookie = getSessionCookie(request);
      if (sessionCookie) {
        return NextResponse.redirect(new URL("/report/mapping", request.url));
      }
    }
    return NextResponse.next();
  }

  // Skip cron routes (they have their own secret-based auth)
  if (pathname.startsWith(CRON_PATH)) {
    return NextResponse.next();
  }

  // Check session cookie
  const sessionCookie = getSessionCookie(request);
  if (!sessionCookie) {
    // API routes: return 401
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    // Pages: redirect to login
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico, sitemap.xml, robots.txt
     * - public folder assets
     */
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
```

### 2. Handle callbackUrl in login page
Update login page (Phase 2) to read `callbackUrl` from search params and redirect there after login instead of always `/report/mapping`.

```typescript
const searchParams = useSearchParams();
const callbackUrl = searchParams.get("callbackUrl") || "/report/mapping";
// After successful login:
router.push(callbackUrl);
```

### 3. Test middleware behavior
- Visit `/report/mapping` without login -> redirected to `/login?callbackUrl=/report/mapping`
- Visit `/login` while logged in -> redirected to `/report/mapping`
- Call `/api/customers` without session -> 401
- Call `/api/auth/get-session` -> passes through (public)
- Call `/api/cron/invoice-deadlines` with secret -> passes through

## Todo List
- [x] Create `middleware.ts` at project root
- [x] Test page redirect flow (unauthenticated -> /login)
- [x] Test API 401 response (unauthenticated)
- [x] Test /login redirect when already authenticated
- [x] Test callbackUrl parameter
- [x] Verify static assets, _next/ not affected
- [x] Verify /api/cron routes still work with secret

## Success Criteria
- [x] All `/report/**` pages require authentication
- [x] API routes return 401 without session cookie
- [x] `/login` redirects authenticated users away
- [x] No impact on public routes or static assets
- [x] Cron routes unaffected

## Risk Assessment
- **getSessionCookie config mismatch:** If Better Auth cookie name is customized, `getSessionCookie()` needs matching config. Stick with defaults to avoid this.
- **Cookie-only check is not full validation:** A user with an expired/revoked session cookie can reach pages but API calls will fail (full session check happens there). This is acceptable — pages will show empty state and redirect.

## Next Steps
- Phase 4: API Route Protection
