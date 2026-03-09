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

  // Create user via Better Auth API (handles password hashing)
  const result = await auth.api.signUpEmail({
    body: {
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
      name: ADMIN_NAME,
    },
  });

  if (!result?.user) {
    console.error("Failed to create admin user. Result:", result);
    process.exit(1);
  }

  // Set role to admin (Better Auth creates with default "viewer" role)
  await prisma.user.update({
    where: { id: result.user.id },
    data: { role: "admin" },
  });

  console.log(`Admin user created: ${ADMIN_EMAIL} (id: ${result.user.id})`);
  await migrateCreatedBy(result.user.id);
}

/** Update legacy MappingInstance.createdBy from "web-user" to real admin ID */
async function migrateCreatedBy(adminId: string) {
  const updated = await prisma.mappingInstance.updateMany({
    where: { createdBy: "web-user" },
    data: { createdBy: adminId },
  });
  if (updated.count > 0) {
    console.log(`Migrated ${updated.count} MappingInstance records (createdBy → ${adminId})`);
  }
}

seed()
  .catch((err) => {
    console.error("Seed failed:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
