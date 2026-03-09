# Phase 7: Migration & Seed Data

## Context Links
- Phase 1 must be complete (schema exists)
- Prisma schema: `prisma/schema.prisma`
- Environment: local SQLite + Turso (production)

## Overview
- **Priority:** P1 (need initial admin to use the app)
- **Status:** complete
- **Description:** Create seed script for initial admin user, handle MappingInstance.createdBy migration, document deployment steps

## Key Insights
- After adding auth, the app is **unusable without at least one admin user**
- Seed script must create admin user via Better Auth API (not raw Prisma insert, because password needs to be hashed by Better Auth)
- `MappingInstance.createdBy` currently has "web-user" for all records — migrate to a default admin user ID
- Turso (production) needs migration applied separately from local SQLite

## Requirements
### Functional
- Seed script creates initial admin user (configurable email/password via env vars)
- Existing MappingInstance records get createdBy updated to admin user ID
- Deployment documentation for production migration

### Non-functional
- Seed script is idempotent (safe to run multiple times)
- Works with both local SQLite and Turso

## Related Code Files
### Files to create
- `prisma/seed-admin.ts` — Seed script for initial admin user

### Files to modify
- `package.json` — Add seed script command
- `.env.local` — Add seed admin credentials (for dev only)

## Implementation Steps

### 1. Create seed script `prisma/seed-admin.ts`

```typescript
import { auth } from "../src/lib/auth";

const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL || "admin@company.com";
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD || "changeme123!";
const ADMIN_NAME = process.env.SEED_ADMIN_NAME || "Admin";

async function seed() {
  console.log("Seeding admin user...");

  // Check if admin already exists
  // Use auth server-side API to create user with admin role
  const ctx = await auth.api.signUpEmail({
    body: {
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
      name: ADMIN_NAME,
    },
  });

  if (ctx?.user) {
    // Set role to admin
    // Better Auth admin plugin: use internal method or direct DB update
    const { prisma } = await import("../src/lib/prisma");
    await prisma.user.update({
      where: { id: ctx.user.id },
      data: { role: "admin" },
    });
    console.log(`Admin user created: ${ADMIN_EMAIL}`);
  }
}

seed().catch(console.error);
```

**Note:** Since signup is disabled in auth config, the seed script may need to:
- Temporarily enable signup, or
- Use `auth.api.createUser()` (internal), or
- Use Prisma directly with manual password hashing from Better Auth utils

The exact approach depends on Better Auth's internal API. Alternative:
```typescript
// Direct approach using Better Auth's internal context
const user = await auth.api.adminCreateUser({
  body: { email, password, name, role: "admin" }
});
```

### 2. Add seed command to `package.json`
```json
{
  "scripts": {
    "seed:admin": "npx tsx prisma/seed-admin.ts"
  }
}
```

### 3. Migrate MappingInstance.createdBy
After admin user is created, update all existing records:

```typescript
// In seed script, after admin creation:
const adminUser = await prisma.user.findFirst({ where: { role: "admin" } });
if (adminUser) {
  const updated = await prisma.mappingInstance.updateMany({
    where: { createdBy: "web-user" },
    data: { createdBy: adminUser.id },
  });
  console.log(`Updated ${updated.count} MappingInstance records`);
}
```

### 4. Environment variables for seed
Add to `.env.local` (dev only, NOT committed):
```env
SEED_ADMIN_EMAIL=admin@company.com
SEED_ADMIN_PASSWORD=<strong-password>
SEED_ADMIN_NAME=Admin
```

### 5. Deployment checklist

#### First deployment with auth:
1. Set env vars on Vercel: `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`
2. Deploy code (Prisma migration runs automatically via `postinstall` + `build`)
3. Run seed script: `npm run seed:admin` (or via Vercel CLI / one-off function)
4. Verify login works with seed admin credentials
5. Change admin password immediately after first login

#### Turso-specific:
- Prisma migration applies to Turso via `TURSO_DATABASE_URL` + `TURSO_AUTH_TOKEN`
- Verify migration: `npx prisma migrate deploy`

### 6. Recovery procedure
If all admin accounts are locked out:
1. Access Turso dashboard or local DB
2. Run seed script again, or manually update user role:
   ```sql
   UPDATE users SET role = 'admin' WHERE email = 'admin@company.com';
   ```

## Todo List
- [x] Create seed script for admin user
- [x] Add seed command to package.json
- [x] Add MappingInstance.createdBy migration logic
- [x] Test seed script (local SQLite)
- [x] Document deployment steps
- [x] Test full flow: deploy -> seed -> login -> use app

## Success Criteria
- [x] Running `npm run seed:admin` creates admin user
- [x] Admin can log in with seed credentials
- [x] Existing MappingInstance records have valid createdBy
- [x] Seed script is idempotent

## Risk Assessment
- **Better Auth signup disabled:** Seed script may need workaround. Test during Phase 1 implementation.
- **Password in env vars:** Only for initial seed, not stored long-term. Admin should change password after first login (add password change feature later).
- **Turso migration:** Test on staging environment before production.

## Security Considerations
- Seed credentials should be changed immediately after first use
- Env vars with seed password should not be committed to git
- Add `.env.local` to `.gitignore` (verify)

## Next Steps
- After all phases complete: end-to-end testing, security audit
- Future: password change UI, manager role, audit logging
