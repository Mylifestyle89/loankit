# Brainstorm: 2FA TOTP for Vercel Deployment

**Date:** 2026-03-26 | **Status:** Agreed

## Problem

App deploy trên Vercel cần bảo mật 2 lớp. Offline (máy trạm) không cần.

## Chosen Approach: Better Auth twoFactor Plugin (TOTP)

### Why TOTP

- Built-in Better Auth v1.5.4
- Hoạt động offline (authenticator app không cần internet)
- Toggle on/off qua `ENABLE_2FA` env var
- Vercel compatible (Edge + Node)
- ~3-4h effort

### Rejected

- Email OTP: offline không gửi được
- Passkey/WebAuthn: over-engineering

## UX Flow

- Setup: Settings → QR scan → 6-digit verify → backup codes
- Login: email/pass → TOTP 6-digit → app
- Recovery: backup code (1-time use)

## Schema

Better Auth auto-adds to User: `twoFactorEnabled`, `twoFactorSecret`, `twoFactorBackupCodes`

## Toggle

```env
ENABLE_2FA=true   # Vercel
ENABLE_2FA=false  # Offline
```

## Vercel: No Limitations

TOTP uses HMAC-SHA1 (Web Crypto API), works on Edge + Serverless.

## Implementation Scope

1. Add twoFactor plugin (conditional on env)
2. Schema migration
3. Auth client update
4. UI: 2FA setup page (QR + verify + backup codes)
5. UI: Login TOTP input step
6. UI: Admin settings toggle
7. Test on Vercel
