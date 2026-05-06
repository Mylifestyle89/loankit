/**
 * Seed script: create initial admin user.
 * Usage: npx tsx prisma/seed-admin.ts
 *
 * Environment variables (optional, defaults provided):
 *   SEED_ADMIN_EMAIL    - Admin email (default: admin@company.com)
 *   SEED_ADMIN_PASSWORD - Admin password (default: changeme123!)
 *   SEED_ADMIN_NAME     - Admin display name (default: Admin)
 */

import { auth } from "../src/lib/auth";
import { prisma } from "../src/lib/prisma";

const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL || "admin@company.com";
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD || "changeme123!";
const ADMIN_NAME = process.env.SEED_ADMIN_NAME || "Admin";

async function seed() {
  // Check if admin already exists (idempotent)
  const existing = await prisma.user.findUnique({
    where: { email: ADMIN_EMAIL },
  });
  if (existing) {
    console.log(`Admin user already exists: ${ADMIN_EMAIL} (id: ${existing.id})`);
    await migrateCreatedBy(existing.id);
    return;
  }

  // Create user via Better Auth admin API (bypasses disabled signup)
  const result = await auth.api.createUser({
    body: {
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
      name: ADMIN_NAME,
      role: "admin",
    },
  });

  if (!result?.user) {
    console.error("Failed to create admin user. Result:", result);
    process.exit(1);
  }

  console.log(`Admin user created: ${ADMIN_EMAIL} (id: ${result.user.id})`);
  await migrateCreatedBy(result.user.id);
}

/** No-op: MappingInstance table dropped in Phase 6i — nothing to migrate. */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function migrateCreatedBy(_adminId: string) {
  // MappingInstance table removed; this migration step is obsolete.
}

seed()
  .catch((err) => {
    console.error("Seed failed:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
