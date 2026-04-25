# Phase 1: Auth Config + Schema Migration

**Priority:** Critical | **Effort:** S | **Status:** Pending

## Overview

Add twoFactor plugin to Better Auth server + client. Migrate Prisma schema.

## Related Code Files

**Modify:**
- `src/lib/auth.ts` — add twoFactor plugin (conditional)
- `src/lib/auth-client.ts` — add twoFactorClient plugin
- `prisma/schema.prisma` — add TwoFactor model + User fields
- `.env.example` — add ENABLE_2FA

## Implementation Steps

### Step 1: Install dependency

```bash
npm install react-qr-code
```
No extra auth deps — twoFactor is built-in to better-auth.

### Step 2: Server auth config

```typescript
// src/lib/auth.ts
import { twoFactor } from "better-auth/plugins";

export const auth = betterAuth({
  // ...existing config
  plugins: [
    admin({ defaultRole: "viewer", adminRoles: ["admin"] }),
    // 2FA: only active when env flag is set (Vercel=true, offline=false)
    ...(process.env.ENABLE_2FA === "true"
      ? [twoFactor({ issuer: "LoanKit" })]
      : []),
  ],
});
```

### Step 3: Client auth config

```typescript
// src/lib/auth-client.ts
import { twoFactorClient } from "better-auth/client/plugins";

export const authClient = createAuthClient({
  plugins: [adminClient(), twoFactorClient()],
});
```

### Step 4: Prisma schema

```prisma
model User {
  // ...existing fields
  twoFactorEnabled  Boolean?  @default(false)
}

model TwoFactor {
  id          String  @id @default(cuid())
  secret      String
  backupCodes String  // JSON array of hashed backup codes
  userId      String  @unique
  user        User    @relation(fields: [userId], references: [id], onDelete: Cascade)
}
```

### Step 5: Generate + migrate

```bash
npx prisma generate
npx prisma db push
```

### Step 6: Add env var

```env
# .env.example
ENABLE_2FA=false  # Set true on Vercel for 2FA enforcement
```

## Todo

- [ ] Install react-qr-code
- [ ] Add twoFactor plugin to auth.ts (conditional)
- [ ] Add twoFactorClient to auth-client.ts
- [ ] Update Prisma schema
- [ ] Run migration
- [ ] Add ENABLE_2FA to .env.example
- [ ] Compile check

## Success Criteria

- [ ] `npx prisma generate` succeeds
- [ ] Build passes with ENABLE_2FA=true and ENABLE_2FA=false
- [ ] TwoFactor table exists in DB
