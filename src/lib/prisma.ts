import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

function createPrismaClient(): PrismaClient {
  const tursoUrl = process.env.TURSO_DATABASE_URL;
  const tursoToken = process.env.TURSO_AUTH_TOKEN;

  // Cloud: use Turso LibSQL adapter (Prisma 7 style — pass URL directly)
  if (tursoUrl && tursoToken) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { PrismaLibSql } = require("@prisma/adapter-libsql");
    const adapter = new PrismaLibSql({ url: tursoUrl, authToken: tursoToken });
    return new PrismaClient({ adapter });
  }

  // Local: use better-sqlite3 adapter
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { PrismaBetterSqlite3 } = require("@prisma/adapter-better-sqlite3");
  const path = require("path");
  let dbUrl = process.env.DATABASE_URL ?? "file:./dev.db";
  if (dbUrl.startsWith("file:")) {
    const pathPart = dbUrl.slice(5);
    if (!path.isAbsolute(pathPart)) {
      dbUrl = `file:${path.resolve(process.cwd(), pathPart)}`;
    }
  }
  return new PrismaClient({ adapter: new PrismaBetterSqlite3({ url: dbUrl }) });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
