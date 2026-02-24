import path from "node:path";

import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

function createPrismaClient(): PrismaClient {
  // Use DATABASE_URL from env if available, otherwise default to dev.db in root
  // PrismaBetterSqlite3 adapter expects "file:" prefix format (e.g., "file:./dev.db")
  let dbUrl = process.env.DATABASE_URL ?? "file:./dev.db";

  // Resolve relative paths to absolute paths for consistency.
  if (dbUrl.startsWith("file:")) {
    const pathPart = dbUrl.slice(5);
    if (!path.isAbsolute(pathPart)) {
      const absolutePath = path.resolve(process.cwd(), pathPart);
      dbUrl = `file:${absolutePath}`;
    }
  }

  const adapter = new PrismaBetterSqlite3({ url: dbUrl });
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

