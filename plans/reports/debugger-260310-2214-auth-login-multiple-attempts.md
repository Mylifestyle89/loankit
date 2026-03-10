# Debug Report: Better Auth Login Requires 3-4 Attempts

**Date:** 2026-03-10
**Severity:** High (UX-blocking)

---

## Executive Summary

Login cần 3-4 lần thử do **race condition giữa cookie set và middleware redirect**. Sau khi `signIn.email()` thành công, `router.push(callbackUrl)` được gọi ngay lập tức — nhưng middleware (`proxy.ts`) chạy trước khi browser có thể gửi cookie session trong request tiếp theo, dẫn đến redirect về `/login` lặp lại.

---

## Root Cause Analysis

### 1. PRIMARY: Race condition — cookie chưa set khi middleware kiểm tra

**File:** `src/app/login/page.tsx` lines 29–41

```ts
const result = await authClient.signIn.email({ email, password });
setLoading(false);
if (result.error) { ... return; }
router.push(callbackUrl);  // ← navigate ngay sau signIn
```

**Vấn đề:**
- `authClient.signIn.email()` là client-side fetch đến `/api/auth/sign-in/email`
- Better Auth server set `Set-Cookie` header trong response
- Browser nhận response và lưu cookie **bất đồng bộ**
- `router.push()` có thể fire trước khi cookie được commit vào cookie jar
- Next.js middleware (`proxy.ts`) chạy trên request mới → `getSessionCookie()` trả về null → redirect về login

**Kết quả:** `/report/mapping` → middleware → no cookie → redirect `/login?callbackUrl=/report/mapping` → user đăng nhập lại.

### 2. SECONDARY: `proxy.ts` không phải là Next.js middleware hợp lệ

**Files:**
- `proxy.ts` (root) — export `proxy` function và `config`
- `src/proxy.ts` — bản sao giống hệt
- **KHÔNG có `middleware.ts`** ở root hoặc `src/`

Theo Next.js docs, middleware **bắt buộc phải đặt tên là `middleware.ts`** ở root hoặc `src/`. Nếu không có `middleware.ts`, code trong `proxy.ts` **KHÔNG chạy**. Điều này có nghĩa:
- Nếu middleware không chạy: mọi route đều accessible không cần auth → login redirect loop không xảy ra
- **Nhưng** nếu có `middleware.ts` khác đang import `proxy.ts` (không tìm thấy trong search) thì race condition vẫn áp dụng

> NOTE: Có thể file `middleware.ts` đã bị xóa hoặc chưa được tạo. Cần xác minh.

### 3. TERTIARY: `BETTER_AUTH_URL` không có trong `.env.example`

**File:** `src/lib/auth.ts` lines 10–33

```ts
const configuredAuthUrl = sanitizeEnv(process.env.BETTER_AUTH_URL);
const resolvedBaseUrl = configuredAuthUrl || vercelProjectUrl || vercelUrl;
export const auth = betterAuth({
  ...(resolvedBaseUrl ? { baseURL: resolvedBaseUrl } : {}),
  ...
});
```

Nếu `BETTER_AUTH_URL` không set trong `.env.local`, Better Auth dùng `VERCEL_URL` (nếu có) hoặc không set baseURL. Khi baseURL sai:
- Cookie domain bị set sai → browser không gửi cookie trong các request sau
- `getSessionCookie()` trong middleware trả về null → redirect loop

`.env.example` không có `BETTER_AUTH_URL` hay `BETTER_AUTH_SECRET` — thiếu documentation về required vars.

### 4. Session cookie cache (ít likely nhưng đáng chú ý)

```ts
session: {
  cookieCache: {
    enabled: true,
    maxAge: 5 * 60, // 5 min
  },
},
```

`cookieCache` enabled giúp giảm DB calls, nhưng nếu có vấn đề với cookie signing (BETTER_AUTH_SECRET sai/missing), cookie cache không validate được → fallback DB check → nếu DB chậm trên Vercel (cold start SQLite/Turso) → timeout → session invalid.

---

## Evidence

| Finding | File | Line |
|---|---|---|
| Race condition: `router.push` ngay sau signIn | `src/app/login/page.tsx` | 41 |
| Middleware không có file `middleware.ts` | root + src/ | — |
| `BETTER_AUTH_URL` missing từ env example | `.env.example` | — |
| `getSessionCookie` dùng để check (fast, no DB) | `src/proxy.ts` | 29 |
| Session cookie cache 5min | `src/lib/auth.ts` | 43-47 |

---

## Recommendations

### Fix 1 (CRITICAL): Tạo `middleware.ts` đúng cách

Nếu `proxy.ts` được dùng như middleware nhưng không có `middleware.ts`:

```ts
// middleware.ts (root hoặc src/)
export { proxy as middleware, config } from "./src/proxy";
```

Hoặc rename `proxy.ts` thành `middleware.ts`.

### Fix 2 (CRITICAL): Thêm await/delay sau signIn trước khi navigate

**`src/app/login/page.tsx`** — thêm small delay hoặc dùng `router.refresh()`:

```ts
const result = await authClient.signIn.email({ email, password });
setLoading(false);
if (result.error) { ... return; }

// Option A: small delay để cookie commit
await new Promise(r => setTimeout(r, 100));
router.push(callbackUrl);

// Option B (better): dùng Next.js router để hard navigate
window.location.href = callbackUrl;
```

`window.location.href` là full page reload — đảm bảo browser gửi đầy đủ cookies trong request mới. Đây là cách reliable nhất.

### Fix 3 (IMPORTANT): Document và verify `BETTER_AUTH_URL` + `BETTER_AUTH_SECRET`

Thêm vào `.env.example`:

```env
# --- Auth ---
BETTER_AUTH_URL=http://localhost:3000
BETTER_AUTH_SECRET=your-random-secret-32-chars-min
```

Verify trong `.env.local` đã có đúng giá trị.

### Fix 4 (NICE-TO-HAVE): Log middleware khi cookie missing

Trong `src/proxy.ts`, add logging để dễ debug:

```ts
if (!sessionCookie) {
  console.log(`[MIDDLEWARE] No session cookie for ${pathname}, redirecting to login`);
  ...
}
```

---

## Timeline of Login Failure

```
User submits credentials
  → POST /api/auth/sign-in/email (200 OK, Set-Cookie: better-auth.session_token=...)
  → browser: "saving cookie..."
  → router.push("/report/mapping")  ← too fast!
  → GET /report/mapping
  → middleware: getSessionCookie() = null  ← cookie not yet committed
  → redirect to /login?callbackUrl=/report/mapping
  → User sees login page again
  [repeats 2-3 more times until browser finally commits cookie]
```

---

## Unresolved Questions

1. Có `middleware.ts` ở đâu không (worktree, git history)? `proxy.ts` không được gọi nếu không có `middleware.ts`.
2. `BETTER_AUTH_URL` và `BETTER_AUTH_SECRET` trong `.env.local` có giá trị gì? (blocked by privacy hook)
3. Bug xảy ra trên local hay chỉ production/Vercel? (Nếu chỉ production → cookie Secure/SameSite issue)
4. Database là SQLite local hay Turso? Cold start của Turso có thể làm session validation timeout.
