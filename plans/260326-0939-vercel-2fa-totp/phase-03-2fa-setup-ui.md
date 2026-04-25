# Phase 3: 2FA Setup UI

**Priority:** High | **Effort:** M | **Status:** Pending | **Blocked by:** Phase 1

## Overview

Settings page for users to enable/disable 2FA. Shows QR code for Authenticator app setup and backup codes.

## Related Code Files

**Create:**
- `src/app/report/settings/two-factor-setup.tsx` — 2FA setup component

**Modify:**
- Settings page (or user profile) — embed TwoFactorSetup component

## Implementation Steps

### Step 1: 2FA Setup component

Multi-step flow:

```
Step 1: "Bật xác thực 2 lớp" button
  → Confirm password
  → authClient.twoFactor.enable({ password })
  → Returns: { totpUri, backupCodes }

Step 2: Show QR code
  → <QRCode value={totpUri} /> (react-qr-code)
  → "Quét mã QR bằng Google Authenticator"
  → Manual secret display for copy

Step 3: Verify setup
  → Enter 6-digit code from authenticator
  → authClient.twoFactor.verifyTotp({ code })
  → If OK: show backup codes

Step 4: Backup codes
  → Display 10 backup codes in grid
  → "Lưu mã dự phòng — mỗi mã chỉ dùng 1 lần"
  → Copy all / download button
  → "Hoàn tất" button
```

### Step 2: Disable 2FA

```typescript
// In settings, when 2FA is enabled:
// "Tắt xác thực 2 lớp" button
// → Confirm password
// → authClient.twoFactor.disable({ password })
// → Remove 2FA from account
```

### Step 3: Regenerate backup codes

```typescript
// "Tạo lại mã dự phòng" button
// → Confirm password
// → authClient.twoFactor.generateBackupCodes({ password })
// → Show new codes, old codes invalidated
```

### Step 4: Admin visibility

Admin can see which users have 2FA enabled via user list.
Check `user.twoFactorEnabled` field.

## Todo

- [ ] Create TwoFactorSetup component (multi-step)
- [ ] QR code display with react-qr-code
- [ ] Manual secret copy option
- [ ] Verify step (6-digit input)
- [ ] Backup codes display + copy/download
- [ ] Disable 2FA option
- [ ] Regenerate backup codes option
- [ ] Embed in settings/profile page
- [ ] Match existing dark UI style
- [ ] Compile check

## Success Criteria

- [ ] User can enable 2FA via QR scan
- [ ] Backup codes displayed and downloadable
- [ ] User can disable 2FA with password
- [ ] User can regenerate backup codes
- [ ] Admin can see 2FA status per user
- [ ] Works on Vercel deployment
