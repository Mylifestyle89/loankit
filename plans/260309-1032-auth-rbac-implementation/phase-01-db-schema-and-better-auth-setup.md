# Phase 1: DB Schema & Better Auth Setup

## Context Links
- [Better Auth Installation](https://better-auth.com/docs/installation)
- [Prisma Adapter](https://better-auth.com/docs/adapters/prisma)
- [Admin Plugin](https://better-auth.com/docs/plugins/admin)
- Current schema: `prisma/schema.prisma`
- Prisma client: `src/lib/prisma.ts`

## Overview
- **Priority:** P1 (blocker for all other phases)
- **Status:** complete
- **Description:** Install Better Auth, add auth models to Prisma, configure auth instance with admin plugin

## Key Insights
- Better Auth requires 4 core tables: User, Session, Account, Verification
- Admin plugin adds `role` and `banned`/`banReason`/`banExpires` fields to User
- Prisma adapter needs `provider: "sqlite"` for our setup
- Use `npx auth@latest generate` to auto-generate schema, then review/adjust
- Cookie caching with `compact` encoding avoids DB queries on every request (important for Turso latency)

## Requirements
### Functional
- Better Auth instance configured with email/password + admin plugin
- Prisma schema includes User, Session, Account, Verification models
- Auth route handler at `/api/auth/[...all]/route.ts`
- Client-side auth helper at `src/lib/auth-client.ts`

### Non-functional
- Session cookie caching enabled (reduce DB round-trips)
- Works with both local SQLite and Turso

## Architecture

```
src/lib/
  auth.ts              <-- Better Auth server instance
  auth-client.ts       <-- Better Auth client (React hooks)
  prisma.ts            <-- Existing (no changes)

src/app/api/auth/
  [...all]/route.ts    <-- Catch-all auth API route

prisma/
  schema.prisma        <-- Add User, Session, Account, Verification models
```

## Related Code Files
### Files to modify
- `prisma/schema.prisma` — Add 4 auth models
- `package.json` — Add `better-auth` dependency
- `.env` / `.env.local` — Add BETTER_AUTH_SECRET, BETTER_AUTH_URL

### Files to create
- `src/lib/auth.ts` — Server auth config
- `src/lib/auth-client.ts` — Client auth helper
- `src/app/api/auth/[...all]/route.ts` — Auth API route handler

## Implementation Steps

### 1. Install Better Auth
```bash
npm install better-auth
```

### 2. Add environment variables to `.env.local`
```env
BETTER_AUTH_SECRET=<generate with: openssl rand -base64 32>
BETTER_AUTH_URL=http://localhost:3000
```

### 3. Add auth models to `prisma/schema.prisma`
Add these models (Better Auth convention, using `@@map` for table names):

```prisma
model User {
  id            String    @id @default(cuid())
  name          String
  email         String    @unique
  emailVerified Boolean   @default(false)
  image         String?
  role          String    @default("viewer")
  banned        Boolean?
  banReason     String?
  banExpires    DateTime?
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  sessions      Session[]
  accounts      Account[]

  @@map("users")
}

model Session {
  id        String   @id @default(cuid())
  token     String   @unique
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  expiresAt DateTime
  ipAddress String?
  userAgent String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([userId])
  @@index([token])
  @@map("sessions")
}

model Account {
  id                String   @id @default(cuid())
  userId            String
  user              User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  accountId         String
  providerId        String
  accessToken       String?
  refreshToken      String?
  accessTokenExpiresAt  DateTime?
  refreshTokenExpiresAt DateTime?
  scope             String?
  idToken           String?
  password          String?
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  @@index([userId])
  @@map("accounts")
}

model Verification {
  id         String   @id @default(cuid())
  identifier String
  value      String
  expiresAt  DateTime
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt

  @@map("verifications")
}
```

### 4. Run Prisma migration
```bash
npx prisma migrate dev --name add-auth-models
```

### 5. Create `src/lib/auth.ts`
```typescript
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { admin } from "better-auth/plugins";
import { prisma } from "./prisma";

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "sqlite",
  }),
  emailAndPassword: {
    enabled: true,
    // Disable public signup — admin creates users via admin plugin
    signUp: { enabled: false },
  },
  session: {
    cookieCache: {
      enabled: true,
      strategy: "compact",
      maxAge: 5 * 60, // 5 min cache before DB re-check
    },
  },
  plugins: [
    admin(),
  ],
});
```

### 6. Create `src/app/api/auth/[...all]/route.ts`
```typescript
import { auth } from "@/lib/auth";
import { toNextJsHandler } from "better-auth/next-js";

export const { GET, POST } = toNextJsHandler(auth);
```

### 7. Create `src/lib/auth-client.ts`
```typescript
import { createAuthClient } from "better-auth/react";
import { adminClient } from "better-auth/client/plugins";

export const authClient = createAuthClient({
  plugins: [adminClient()],
});

// Export commonly used hooks/methods
export const {
  signIn,
  signOut,
  useSession,
} = authClient;
```

### 8. Verify setup
```bash
npm run build
```
Ensure no compile errors and auth route responds at `/api/auth/ok`.

## Todo List
- [x] Install better-auth package
- [x] Add env variables (BETTER_AUTH_SECRET, BETTER_AUTH_URL)
- [x] Add User, Session, Account, Verification models to Prisma schema
- [x] Run Prisma migration
- [x] Create `src/lib/auth.ts` with Better Auth config
- [x] Create `src/app/api/auth/[...all]/route.ts`
- [x] Create `src/lib/auth-client.ts`
- [x] Verify build passes

## Success Criteria
- [x] `npm run build` passes (0 TypeScript errors)
- [x] `/api/auth/ok` returns 200
- [x] Prisma schema has 4 new auth tables
- [x] Auth config has email/password + admin plugin
- [x] disableSignUp: true added to prevent public registration

## Risk Assessment
- **Prisma adapter compatibility:** Better Auth's Prisma adapter should work with Prisma 7 + SQLite. If issues, fallback to Better Auth's built-in `better-sqlite3` adapter (package already installed).
- **Schema conflicts:** No existing User model, so no conflicts.

## Next Steps
- Phase 2: Login Page & Auth Flow
