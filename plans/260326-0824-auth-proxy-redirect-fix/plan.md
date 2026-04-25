---
status: complete
---

# Plan: Auth Proxy Redirect Fix

**Date:** 2026-03-26 | **Mode:** Fast | **Risk:** Low

## Context

- Brainstorm: `plans/reports/brainstorm-260326-0824-auth-proxy-redirect-fix.md`
- Research: `plans/reports/researcher-260323-0937-nextjs16-proxy-convention.md`

## Problem

`proxy.ts` ở root → Next.js 16 không detect → no auth redirect.

## Solution

Move `./proxy.ts` → `./src/proxy.ts`. Logic giữ nguyên.

## Phase 1: Move & Verify

**Files:**
- Move: `proxy.ts` → `src/proxy.ts`

**Steps:**
1. `git mv proxy.ts src/proxy.ts`
2. `npm run build` — verify no errors
3. `npm run dev` — test manually:
   - Clear cookies / incognito
   - Access `/report/khdn/mapping` → expect redirect to `/login?callbackUrl=/report/khdn/mapping`
   - Login → expect redirect back to `/report/khdn/mapping`
   - Access `/api/report/field-templates` without cookie → expect 401

**Rollback:** `git mv src/proxy.ts proxy.ts`

## Success Criteria

- [ ] Build passes
- [ ] Unauthenticated page access → redirect `/login`
- [ ] Unauthenticated API access → 401
- [ ] Authenticated access → normal page load
- [ ] Login callbackUrl works
