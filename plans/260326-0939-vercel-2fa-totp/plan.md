---
status: pending
---

# Plan: 2FA TOTP via Better Auth

**Date:** 2026-03-26 | **Mode:** Standard | **Risk:** Medium

## Context

- Brainstorm: `plans/reports/brainstorm-260326-0939-vercel-2fa-totp.md`
- Research: `plans/reports/researcher-260326-0939-better-auth-2fa.md`
- Toggle: `ENABLE_2FA=true/false` env var
- Vercel deploy (online) + offline (máy trạm) dual mode

## Architecture

```
Login flow (2FA enabled):
  email/pass → API returns { twoFactorRedirect: true }
    → redirect /login/verify-2fa
      → user enters 6-digit TOTP → verifyTotp() → session → app

Setup flow:
  Settings → "Bật 2FA" → password confirm
    → QR code + backup codes displayed
      → user scans QR → enters verify code → 2FA active
```

## Phases

| # | Phase | Priority | Effort | Status |
|---|-------|----------|--------|--------|
| 1 | [Auth config + schema](phase-01-auth-config-schema.md) | Critical | S | Pending |
| 2 | [Login 2FA verify page](phase-02-login-2fa-verify.md) | Critical | M | Pending |
| 3 | [2FA setup UI](phase-03-2fa-setup-ui.md) | High | M | Pending |

## Key Decisions

- Conditional plugin: `twoFactor()` only when `ENABLE_2FA=true`
- Client: `twoFactorClient()` always loaded (no-op when server plugin absent)
- QR: `react-qr-code` (lightweight, no canvas dep)
- Trust device: 30 days cookie to skip 2FA on trusted browsers
- Backup codes: shown once on setup, user must save them
