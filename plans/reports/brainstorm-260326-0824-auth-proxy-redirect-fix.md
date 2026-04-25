# Brainstorm: Auth Proxy Redirect Fix

**Date:** 2026-03-26 | **Status:** Agreed

## Problem

User truy cập protected routes (`/report/*`) mà không bị redirect về `/login` dù chưa login.

## Root Cause

`proxy.ts` đặt ở root (`./proxy.ts`). Next.js 16 convention yêu cầu file ở cùng cấp với `app/` directory → `./src/proxy.ts`. Do sai vị trí, Next.js không detect proxy → không chạy auth check.

## Evaluated Approaches

| Approach | Verdict |
|----------|---------|
| Tạo `middleware.ts` import proxy | ❌ `middleware.ts` deprecated trong Next.js 16 |
| Rename proxy → middleware | ❌ Same reason |
| **Move `./proxy.ts` → `./src/proxy.ts`** | ✅ Đúng convention, logic giữ nguyên |

## Solution

Move `./proxy.ts` → `./src/proxy.ts`. Không cần sửa code bên trong.

## Risk Assessment

- Không file nào import proxy.ts → no broken imports
- `next.config.ts` line 46 reference `/proxy` route, không phải file path → unaffected
- Rollback: `git checkout`

## Existing Logic (already correct)

- Public: `/`, `/login`, `/api/auth`
- Skip: `/api/cron`, `/api/onlyoffice/callback`
- No session cookie → page: redirect `/login?callbackUrl=...`, API: 401
- Has session → pass through

## Next Steps

1. `git mv proxy.ts src/proxy.ts`
2. Run `npm run build` verify
3. Test: access `/report/khdn/mapping` without login → expect redirect to `/login`
