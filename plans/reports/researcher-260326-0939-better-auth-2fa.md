---
name: Better Auth v1.5.4 twoFactor Plugin TOTP Research
description: Comprehensive guide to Better Auth's twoFactor plugin for TOTP implementation including server config, client API, Prisma schema, login flow, QR code generation, and backup codes
type: reference
---

# Better Auth v1.5.4 twoFactor Plugin Research Report

**Date:** 2026-03-26
**Research Focus:** TOTP implementation for 2FA in Better Auth v1.5.4

---

## 1. Server-Side Plugin Configuration

### Import & Setup
```typescript
import { betterAuth } from "better-auth"
import { twoFactor } from "better-auth/plugins"

export const auth = betterAuth({
    appName: "My App",           // Required: displayed in authenticator apps
    plugins: [
        twoFactor({
            issuer: "My App Name",        // Optional: default uses appName
            skipVerificationOnEnable: false, // Optional: default false
            twoFactorTable: "twoFactor",  // Optional: custom table name
            otpOptions: {
                async sendOTP({ user, otp }) {
                    // Implement OTP delivery (e.g., via Resend, SendGrid)
                    await resend.emails.send({
                        from: 'your-app@example.com',
                        to: user.email,
                        subject: "Two-Factor Authentication (2FA)",
                        html: `Your OTP is <b>${otp}</b>`
                    })
                }
            }
        })
    ]
})
```

**Key Notes:**
- `issuer` parameter is displayed in authenticator apps (Google Authenticator, Authy, etc.)
- `skipVerificationOnEnable` allows enabling 2FA without password verification (use cautiously)
- `otpOptions.sendOTP` is required if using OTP-based 2FA (email/SMS); not required for TOTP-only

---

## 2. Client-Side API Methods

### Import & Setup
```typescript
import { createAuthClient } from "better-auth/client"
import { twoFactorClient } from "better-auth/client/plugins"

export const authClient = createAuthClient({
    baseURL: process.env.NEXT_PUBLIC_APP_URL,
    plugins: [
        twoFactorClient({
            twoFactorPage: "/two-factor",  // Redirect path for 2FA verification
            onTwoFactorRedirect() {         // Or use callback for programmatic redirect
                // Handle redirect programmatically
            }
        })
    ]
})
```

### Core Methods

#### Enable 2FA (TOTP)
```typescript
const { data, error } = await authClient.twoFactor.enable({
    password: "user-password"  // Required: user's password for verification
})

// Response data contains:
// - totpUri: "otpauth://totp/My%20App:user@example.com?secret=XXXXX&issuer=My%20App"
// - backupCodes: ["code1", "code2", ...] (typically 10 codes)
// - secret: "XXXXX" (raw TOTP secret)
```

#### Disable 2FA
```typescript
const { data, error } = await authClient.twoFactor.disable({
    password: "user-password"  // Required
})
```

#### Verify TOTP Code
```typescript
const { data, error } = await authClient.twoFactor.verifyTotp({
    code: "012345",        // 6-digit TOTP code from authenticator app
    trustDevice: true      // Optional: remember device for 30 days
})
```

#### Verify OTP Code (Email/SMS)
```typescript
const { data, error } = await authClient.twoFactor.verifyOtp({
    code: "012345",        // OTP sent via email/SMS
    trustDevice: true      // Optional: remember device
})
```

#### Verify Backup Code
```typescript
const { data, error } = await authClient.twoFactor.verifyBackupCode({
    code: "123456",        // Backup code from user's saved list
    trustDevice: true      // Optional: remember device
})
```

#### Get QR Code URI
```typescript
const { data } = await authClient.twoFactor.getTotpUri({
    password: "user-password"
})
// Returns: { totpUri: "otpauth://totp/..." }
```

#### Generate Backup Codes
```typescript
const { data } = await authClient.twoFactor.generateBackupCodes({
    password: "user-password"
})
// Returns: { backupCodes: ["code1", "code2", ...] }
```

#### Send OTP
```typescript
const { data } = await authClient.twoFactor.sendOtp({
    // Sends OTP via configured email/SMS provider
})
```

---

## 3. Prisma Schema Changes

### Required Database Schema

```prisma
model User {
  id            String  @id @default(cuid())
  email         String  @unique
  password      String
  // ... other user fields

  // 2FA support
  twoFactorEnabled Boolean? @default(false)
  twoFactor     TwoFactor[]

  @@map("user")
}

model TwoFactor {
  id          String @id @default(cuid())
  secret      String                    // TOTP secret key
  backupCodes String                    // JSON array of backup codes
  userId      String @unique            // One 2FA config per user
  user        User   @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("twoFactor")
}
```

### Migration Steps
```bash
# Generate Prisma client with new schema
pnpm prisma generate

# Create migration for 2FA tables/fields
pnpm prisma migrate dev --name add_two_factor_authentication

# Or auto-generate via Better Auth CLI
npx auth@latest generate
```

**Key Points:**
- `userId` in TwoFactor is **unique** (one 2FA per user)
- `backupCodes` stored as JSON string in database
- `twoFactorEnabled` field tracks 2FA status in User table
- `onDelete: Cascade` ensures 2FA data removed when user deleted

---

## 4. Login Flow with 2FA

### Step-by-Step Flow

**Step 1: Initial Sign In (Email/Password)**
```typescript
const result = await authClient.signIn.email({
    email: "user@example.com",
    password: "password123"
}, {
    async onSuccess(context) {
        // Check if 2FA is enabled for this user
        if (context.data.twoFactorRedirect) {
            // User has 2FA enabled; redirect to verification page
            router.push("/two-factor")
        } else {
            // No 2FA; user is fully authenticated
            router.push("/dashboard")
        }
    },
    onError(error) {
        // Handle login failure (wrong password, user not found, etc.)
    }
})
```

**Response Structure (from signIn):**
```typescript
{
    data: {
        user: { id, email, ... },
        session: { token, ... },
        twoFactorRedirect: true,  // Flag indicating 2FA required
        // If twoFactorRedirect is false/missing, user is fully logged in
    },
    error: null
}
```

**Step 2: 2FA Verification Page**

User enters TOTP code from authenticator app:
```typescript
const { data, error } = await authClient.twoFactor.verifyTotp({
    code: "123456"
}, {
    onSuccess() {
        router.push("/dashboard")  // User fully authenticated
    },
    onError(ctx) {
        setError(ctx.error.message)  // Invalid code
    }
})
```

**Step 3: Device Trust (Optional)**
```typescript
await authClient.twoFactor.verifyTotp({
    code: "123456",
    trustDevice: true  // Skip 2FA on this device for 30 days
})
```

### Full Login Component Example
```typescript
export function LoginForm() {
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [error, setError] = useState("")
    const router = useRouter()

    async function handleLogin() {
        const { data, error: signInError } = await authClient.signIn.email({
            email,
            password
        })

        if (signInError) {
            setError(signInError.message)
            return
        }

        if (data?.twoFactorRedirect) {
            // Store session token temporarily
            sessionStorage.setItem("pendingSession", data.session?.token)
            router.push("/two-factor")
        } else {
            router.push("/dashboard")
        }
    }

    return (
        <form onSubmit={(e) => { e.preventDefault(); handleLogin() }}>
            <input value={email} onChange={(e) => setEmail(e.target.value)} />
            <input value={password} type="password" onChange={(e) => setPassword(e.target.value)} />
            <button type="submit">Sign In</button>
            {error && <p className="error">{error}</p>}
        </form>
    )
}
```

---

## 5. QR Code Generation for TOTP Setup

### Getting the QR Code URI
```typescript
async function setupTOTP() {
    const { data, error } = await authClient.twoFactor.enable({
        password: userPassword
    })

    if (error) {
        console.error("Failed to enable 2FA:", error)
        return
    }

    // data.totpUri = "otpauth://totp/My%20App:user@example.com?secret=XXXXX&issuer=My%20App"
    return {
        totpUri: data.totpUri,
        backupCodes: data.backupCodes,
        secret: data.secret
    }
}
```

### QR Code Rendering (using react-qr-code)
```typescript
import QRCode from "react-qr-code"

export function TOTPSetup({ totpUri, backupCodes }) {
    return (
        <div>
            <h2>Set Up Two-Factor Authentication</h2>

            {/* QR Code for scanning */}
            <div className="qr-container">
                <QRCode value={totpUri} size={256} />
            </div>

            {/* Manual entry alternative */}
            <div>
                <p>Can't scan? Enter manually:</p>
                <code>{totpUri.match(/secret=([A-Z0-9]+)/)?.[1]}</code>
            </div>

            {/* Backup codes display */}
            <div className="backup-codes">
                <p>Save these backup codes in a safe place:</p>
                {backupCodes.map((code) => (
                    <code key={code}>{code}</code>
                ))}
            </div>
        </div>
    )
}
```

### URI Structure
The `otpauth://` URI contains:
- **Scheme:** `otpauth://totp/`
- **Account:** `My%20App:user@example.com` (Issuer:Email)
- **Secret:** `secret=XXXXX` (Base32-encoded TOTP secret)
- **Issuer:** `issuer=My%20App` (Displayed in authenticator apps)

---

## 6. Backup Codes Implementation

### How Backup Codes Work

**Generation:**
- Automatically generated when user enables 2FA via `enable()` method
- Typically 10 codes per user (e.g., "ABC123", "DEF456", etc.)
- Stored as JSON array in `TwoFactor.backupCodes` field

**Recovery:**
- User saves/prints codes during 2FA setup
- Used if user loses access to authenticator app
- Each code is single-use; deleted from database after use
- Cannot be reused after consumed

### Using Backup Codes During Login
```typescript
async function verifyWith2FA(code: string) {
    // Try TOTP first
    let result = await authClient.twoFactor.verifyTotp({
        code,
        trustDevice: false
    })

    // If TOTP fails, try backup code
    if (result.error && code.length > 6) {
        result = await authClient.twoFactor.verifyBackupCode({
            code,
            trustDevice: false
        })
    }

    return result
}
```

### Regenerating Backup Codes
```typescript
async function regenerateBackupCodes(password: string) {
    const { data, error } = await authClient.twoFactor.generateBackupCodes({
        password
    })

    if (error) return

    // Display new codes to user
    // Old codes become invalid
    return data.backupCodes
}
```

### Key Limitations
- User cannot disable 2FA without knowing password (prevents account hijacking)
- Backup codes must be saved before 2FA confirmation
- No API to retrieve previously-saved backup codes (intentional security feature)
- Each verification consumes one backup code; cannot be reused

---

## Summary Table

| Feature | Method | Authentication Required | Returns |
|---------|--------|------------------------|---------|
| Enable 2FA | `enable({ password })` | Yes (password) | TOTP URI, backup codes, secret |
| Disable 2FA | `disable({ password })` | Yes (password) | Success response |
| Verify TOTP | `verifyTotp({ code })` | No (code-based) | Session data |
| Verify OTP | `verifyOtp({ code })` | No (code-based) | Session data |
| Verify Backup | `verifyBackupCode({ code })` | No (code-based) | Session data |
| Get QR URI | `getTotpUri({ password })` | Yes (password) | TOTP URI |
| Generate Codes | `generateBackupCodes({ password })` | Yes (password) | New backup codes |
| Send OTP | `sendOtp()` | No | Success response |

---

## Database Considerations

**Backup Codes Storage:**
- Stored as JSON string: `["ABC123DEF", "GHI456JKL", ...]`
- Index userId for fast lookups during login
- Consider encrypting codes at rest for sensitive applications

**Session Management:**
- After 2FA verification, full session established
- `trustDevice` option stores device ID in database for bypass
- Device trust expires after 30 days

**Data Cleanup:**
- Deleting user cascades to TwoFactor record (onDelete: Cascade)
- Consumed backup codes removed immediately; no audit trail

---

## Unresolved Questions

1. Does `skipVerificationOnEnable: true` allow enabling 2FA without initial password verification? (Security implications for compromised session?)
2. What is the exact backup code format/length? (6 chars? 8 chars? alphanumeric?)
3. Can backup codes be regenerated while 2FA is active without temporarily disabling?
4. Is there a server-side method to retrieve user's 2FA status without client-side calls?
5. What happens if user loses access to both authenticator app AND backup codes?

---

## Sources

- [Better Auth - Two-Factor Authentication Docs](https://better-auth.com/docs/plugins/2fa)
- [Better Auth GitHub - 2FA Plugin](https://github.com/better-auth/better-auth/blob/main/docs/content/docs/plugins/2fa.mdx)
- [Two-Factor Authentication Using Better Auth, Next.js, Prisma](https://dev.to/daanish2003/two-factor-authentication-using-betterauth-nextjs-prisma-shadcn-and-resend-1b5p)
- [Better Auth - Prisma Adapter](https://better-auth.com/docs/adapters/prisma)
- [Prisma Documentation - Better Auth Integration](https://www.prisma.io/docs/guides/betterauth-nextjs)
