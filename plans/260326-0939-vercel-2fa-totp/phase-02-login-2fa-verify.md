# Phase 2: Login 2FA Verify Page

**Priority:** Critical | **Effort:** M | **Status:** Pending | **Blocked by:** Phase 1

## Overview

After email/password login, if user has 2FA enabled, redirect to `/login/verify-2fa` to enter TOTP code.

## Related Code Files

**Modify:**
- `src/app/login/page.tsx` — detect `twoFactorRedirect` in response, redirect

**Create:**
- `src/app/login/verify-2fa/page.tsx` — TOTP input page

## Implementation Steps

### Step 1: Modify login page

After `authClient.signIn.email()` succeeds, check for 2FA redirect:

```typescript
// src/app/login/page.tsx — inside handleSubmit
const result = await authClient.signIn.email({ email, password });

if (result.error) {
  setError(result.error.message || t("login.errorGeneric"));
  return;
}

// 2FA redirect: user has TOTP enabled, needs verification
if (result.data?.twoFactorRedirect) {
  router.push(`/login/verify-2fa?callbackUrl=${encodeURIComponent(callbackUrl)}`);
  return;
}

router.push(callbackUrl);
```

### Step 2: Create verify-2fa page

```
/login/verify-2fa?callbackUrl=/report/khdn/mapping
```

UI: Centered card with 6-digit input, "Xác minh" button, backup code fallback link.

```typescript
// src/app/login/verify-2fa/page.tsx
"use client";

// State: code (6 digits), error, loading
// On submit: authClient.twoFactor.verifyTotp({ code, trustDevice: true })
// Success: router.push(callbackUrl)
// Error: show "Mã không đúng, thử lại"
// Backup code link: toggle to backup code input mode
//   → authClient.twoFactor.verifyBackupCode({ code })
```

### Step 3: Trust device

`trustDevice: true` sets a cookie, skips 2FA for 30 days on same browser.

## Todo

- [ ] Modify login page to detect twoFactorRedirect
- [ ] Create /login/verify-2fa/page.tsx
- [ ] 6-digit TOTP input with auto-submit on 6th digit
- [ ] Backup code fallback
- [ ] Trust device option
- [ ] Match existing login page styling (glassmorphism dark)
- [ ] Compile check

## Success Criteria

- [ ] Login with 2FA-enabled user → redirects to verify-2fa
- [ ] Enter correct TOTP → logs in
- [ ] Enter wrong TOTP → shows error
- [ ] Backup code works
- [ ] Trust device skips 2FA next login
- [ ] Login without 2FA → normal flow unchanged
