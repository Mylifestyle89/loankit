# Next.js 16: Proxy Convention Research Report

**Date:** 2026-03-23 | **Version:** 16.2.1

## Executive Summary

Next.js 16 deprecates `middleware.ts` in favor of `proxy.ts`. The proxy convention is a clearer naming for edge-deployed request interceptors that run **before routes render**. It executes at network boundary (Edge Runtime by default) and replaces middleware's confusing Express.js terminology.

---

## 1. What is the `proxy.ts` Convention?

**Purpose:** Intercept and transform requests before they reach application routes.

**Key Characteristics:**
- Runs at network boundary (Edge Runtime by default, can use Node.js)
- Executes **before routes are rendered**
- Can redirect, rewrite, modify headers, set cookies, or respond directly
- Recommended as **last resort** — Next.js prefers better ergonomic APIs in routes/handlers

**Why renamed from middleware:**
- "Middleware" confuses developers with Express.js middleware patterns
- "Proxy" clarifies actual behavior: request interception at network boundary
- Emphasizes that proxy is edge-deployed, separate from app region

---

## 2. API Signature (Exact)

### Function Export

```typescript
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Named export required (or default export)
export function proxy(request: NextRequest) {
  // Logic here
  return NextResponse.redirect(new URL('/login', request.url))
}

export const config = {
  matcher: '/protected/:path*',
}
```

### Shorthand Type (NextProxy)

```typescript
import type { NextProxy } from 'next/server'

export const proxy: NextProxy = (request, event) => {
  event.waitUntil(Promise.resolve())
  return Response.json({ pathname: request.nextUrl.pathname })
}
```

### Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `request` | `NextRequest` | Incoming HTTP request with cookies, headers, URL |
| `event` (optional) | `NextFetchEvent` | Extends native FetchEvent; has `waitUntil()` for background work |

### Return Types

- `NextResponse.redirect(url)` — Redirect to different URL
- `NextResponse.rewrite(url)` — Rewrite to different route (preserve URL)
- `NextResponse.next()` — Pass through to next handler
- `Response.json()` — Return JSON directly (auth failure, etc.)
- `NextResponse` with modified headers/cookies

---

## 3. Auth Session Check with Redirect to /login

### Minimal Example

```typescript
// src/proxy.ts (or project root)
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname

  // Check for session cookie
  const sessionCookie = request.cookies.get('session')

  // Unprotected paths
  const publicPaths = ['/', '/login', '/signup', '/api/auth']
  const isPublicPath = publicPaths.some(path =>
    pathname.startsWith(path)
  )

  // If protected path & no session → redirect to login
  if (!isPublicPath && !sessionCookie) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    // Protect all routes except public ones
    '/((?!_next/static|_next/image|favicon.ico|login|signup|api/auth).*)',
  ],
}
```

### Advanced: Token Validation with Redirect

```typescript
// src/proxy.ts
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function proxy(request: NextRequest) {
  const token = request.cookies.get('auth-token')?.value

  // Skip check for public routes
  if (request.nextUrl.pathname.startsWith('/login')) {
    return NextResponse.next()
  }

  // If no token, redirect to login
  if (!token) {
    return NextResponse.redirect(new URL('/login?from=' + request.nextUrl.pathname, request.url))
  }

  // Optional: Validate token (if API accessible)
  try {
    const isValid = await validateTokenAtEdge(token)
    if (!isValid) {
      return NextResponse.redirect(new URL('/login', request.url))
    }
  } catch (err) {
    // Token validation failed
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Add user info to request headers for downstream
  const response = NextResponse.next()
  response.headers.set('X-User-Token', token)
  return response
}

async function validateTokenAtEdge(token: string) {
  // Edge-safe token validation (call external auth service if needed)
  return token.length > 0 // Minimal example
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|login|signup).*)',
  ],
}
```

---

## 4. File Placement

### Location Rules

**Choose one:**

| Scenario | Path |
|----------|------|
| Standard setup | `src/proxy.ts` (or root if no `src/`) |
| If `pageExtensions` customized to `.page.ts` | `src/proxy.page.ts` |
| Project root | `./proxy.ts` (if no `src/` folder) |

**Requirement:** Must be at **same level as `pages/` or `app/`** directory.

### Correct Structure

```
src/
├── app/                  ← App Router
├── proxy.ts              ← Proxy file (CORRECT)
├── middleware.ts         ← OLD (deprecated)
└── lib/
```

---

## 5. Matcher & Config

### Config Export

```typescript
export const config = {
  matcher: '/about/:path*',
  // Optional advanced flags
  skipTrailingSlashRedirect: true,
  skipProxyUrlNormalize: true,
}
```

### Matcher Patterns

#### Simple Paths
```typescript
matcher: '/admin'                    // Matches /admin and /admin/team
matcher: ['/admin', '/dashboard']    // Multiple paths
```

#### Wildcards
```typescript
matcher: '/about/:path*'             // * = zero or more
matcher: '/blog/:slug?'              // ? = zero or one
matcher: '/docs/:page+'              // + = one or more
```

#### Regex
```typescript
matcher: [
  // All routes EXCEPT public ones
  '/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)',
]
```

#### Advanced Object Syntax
```typescript
matcher: [
  {
    source: '/api/:path*',
    locale: false,  // Ignore locale routing
    has: [
      { type: 'header', key: 'Authorization', value: 'Bearer Token' },
      { type: 'query', key: 'admin', value: 'true' },
      { type: 'cookie', key: 'session', value: 'active' },
    ],
    missing: [
      { type: 'header', key: 'x-bypass' },
    ],
  },
]
```

#### Condition Types
- `header` — HTTP header
- `query` — URL query parameter
- `cookie` — HTTP cookie
- `locale` — i18n locale

### Execution Order

Proxy runs **3rd** in this chain:

1. `headers` (next.config.js)
2. `redirects` (next.config.js)
3. **→ Proxy (this is where your logic runs)**
4. `beforeFiles` rewrites
5. Filesystem routes (`public/`, `app/`, etc.)
6. Dynamic routes
7. `afterFiles` rewrites
8. `fallback` rewrites

### Important Notes

- Matchers must be **static constants** (no variables)
- For backward compatibility: `/public` → `/public/index`
- **Server Functions:** Proxy change may silently affect RSC coverage — **always verify auth in handlers, not just proxy**

---

## 6. Complete Auth Example (Production-Ready)

```typescript
// src/proxy.ts
import { NextResponse } from 'next/server'
import type { NextRequest, NextFetchEvent } from 'next/server'

const PUBLIC_ROUTES = ['/login', '/signup', '/forgot-password']
const API_ROUTE_PREFIX = '/api'

export async function proxy(
  request: NextRequest,
  event: NextFetchEvent
) {
  const pathname = request.nextUrl.pathname
  const hostname = request.nextUrl.hostname

  // Skip proxy for API routes, static files
  if (
    pathname.startsWith(API_ROUTE_PREFIX) ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api/auth')
  ) {
    return NextResponse.next()
  }

  // Allow public routes
  if (PUBLIC_ROUTES.some(route => pathname.startsWith(route))) {
    return NextResponse.next()
  }

  // Check authentication
  const authToken = request.cookies.get('auth-token')?.value
  const refreshToken = request.cookies.get('refresh-token')?.value

  if (!authToken && !refreshToken) {
    // No token → redirect to login with return URL
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('returnUrl', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // Optional: token validation (background work)
  if (authToken) {
    event.waitUntil(
      fetch('/api/auth/verify', {
        method: 'POST',
        headers: { Authorization: `Bearer ${authToken}` },
      }).catch(err => console.error('Token verification failed:', err))
    )
  }

  // Pass through to route handler
  const response = NextResponse.next()

  // Add auth header for downstream handlers
  if (authToken) {
    response.headers.set('X-Auth-Token', authToken)
  }

  return response
}

export const config = {
  matcher: [
    // Protect all routes except: public files, api auth, next internals
    '/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|api/auth|login|signup|forgot-password).*)',
  ],
}
```

---

## 7. Key Differences from Middleware

| Aspect | middleware.ts | proxy.ts |
|--------|---------------|----------|
| File name | `middleware.ts` | `proxy.ts` |
| Export | `export function middleware()` | `export function proxy()` |
| Status | **Deprecated** in v16 | **Standard** in v16+ |
| Purpose clarity | Confuses with Express | Clarifies edge interception |
| Runtime | Can use Edge/Node | Node.js by default (Edge on Vercel) |

**Migration codemod:**
```bash
npx @next/codemod@canary middleware-to-proxy .
```

---

## 8. Gotchas & Best Practices

### ⚠️ Critical Security Note

Proxy matchers must exclude `_next/data` even when using negative lookahead:

```typescript
// WRONG: _next/data routes bypass proxy even if excluded
matcher: '/((?!api|_next/static|_next/image|favicon.ico).*)',

// CORRECT: explicitly exclude to prevent bypass
matcher: '/((?!api|_next/data|_next/static|_next/image|favicon.ico).*)',
```

### RSC Header Handling

During Server Component revalidation, Next.js strips internal Flight headers (`rsc`, `next-router-state-tree`) from request. If using `NextResponse.rewrite()`, headers propagate automatically. For custom `fetch()` rewrites, manually forward headers.

### Server Function Coverage

Proxy may silently stop protecting Server Functions if routes change. **Always verify auth inside Server Functions too:**

```typescript
// ❌ Don't rely only on proxy
async function deleteUser() {
  'use server'
  // Vulnerable if proxy matcher changes
}

// ✅ Always verify auth inside
async function deleteUser() {
  'use server'
  const session = await getSession()
  if (!session) throw new Error('Unauthorized')
  // Safe
}
```

### Background Work with waitUntil

For analytics, logging, cleanup operations:
```typescript
event.waitUntil(
  fetch('https://analytics.example.com', {
    method: 'POST',
    body: JSON.stringify({ pathname: request.nextUrl.pathname }),
  })
)
```

---

## 9. Testing (Next.js 15.1+)

```typescript
import { unstable_doesProxyMatch, isRewrite } from 'next/experimental/testing/server'

// Check if proxy will run for a URL
expect(
  unstable_doesProxyMatch({
    config,
    nextConfig,
    url: '/protected',
  })
).toEqual(true)

// Test rewrite behavior
const request = new NextRequest('https://nextjs.org/docs')
const response = await proxy(request)
expect(isRewrite(response)).toEqual(true)
```

---

## Summary Table

| Question | Answer |
|----------|--------|
| **File name?** | `proxy.ts` (at `src/` or root level) |
| **Function signature?** | `export function proxy(request: NextRequest, event?: NextFetchEvent)` |
| **Return type?** | `NextResponse` or `Response` |
| **Auth check with redirect?** | Check `request.cookies`, return `NextResponse.redirect(new URL('/login', request.url))` |
| **Matcher syntax?** | `matcher: '/protected/:path*'` or regex; advanced: object with `has`/`missing` |
| **Runs where?** | 3rd in request chain (after next.config headers/redirects, before routes) |
| **Default runtime?** | Edge on Vercel; Node.js elsewhere |

---

## Unresolved Questions

None — documentation is complete and current (v16.2.1 as of 2026-03-13).

---

## Resources

- [Next.js Proxy File Convention](https://nextjs.org/docs/app/api-reference/file-conventions/proxy)
- [Middleware to Proxy Migration](https://nextjs.org/docs/messages/middleware-to-proxy)
- [NextRequest API](https://nextjs.org/docs/app/api-reference/functions/next-request)
- [NextResponse API](https://nextjs.org/docs/app/api-reference/functions/next-response)
