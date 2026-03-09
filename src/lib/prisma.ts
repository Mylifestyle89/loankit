import { PrismaClient } from "@prisma/client";
import path from "path";

type PrismaGlobal = {
  prisma?: PrismaClient;
  prismaKey?: string;
};

const globalForPrisma = globalThis as unknown as PrismaGlobal;

function resolveSqliteUrl(rawUrl?: string): string {
  const fallbackPath = path.resolve(process.cwd(), "dev.db");
  const value = rawUrl?.trim();

  if (!value) {
    return `file:${fallbackPath}`;
  }

  if (!value.startsWith("file:")) {
    return value;
  }

  const filePath = value.slice(5);
  if (!filePath) {
    return `file:${fallbackPath}`;
  }

  if (path.isAbsolute(filePath)) {
    return value;
  }

  // Keep SQLite location stable in Next runtime (avoid .next-relative paths).
  return `file:${path.resolve(process.cwd(), filePath)}`;
}

function createPrismaClient(): PrismaClient {
  const { key, factory } = getPrismaConfig();
  if (globalForPrisma.prisma && globalForPrisma.prismaKey === key) {
    return globalForPrisma.prisma;
  }

  const client = factory();

  if (process.env.NODE_ENV !== "production") {
    globalForPrisma.prisma = client;
    globalForPrisma.prismaKey = key;
  }

  return client;
}

function getPrismaConfig(): { key: string; factory: () => PrismaClient } {
  const configuredDbUrl = process.env.DATABASE_URL?.trim();
  const useTursoExplicitly = process.env.PRISMA_USE_TURSO === "true";
  const tursoUrl = process.env.TURSO_DATABASE_URL?.trim();
  const tursoToken = process.env.TURSO_AUTH_TOKEN?.trim();
  const dbUrlLooksLikeLibsql =
    configuredDbUrl?.startsWith("libsql://") ||
    configuredDbUrl?.startsWith("http://") ||
    configuredDbUrl?.startsWith("https://");

  // Use Turso only when explicitly requested or when DATABASE_URL points to libsql/http.
  if ((useTursoExplicitly || dbUrlLooksLikeLibsql) && tursoUrl && tursoToken) {
    return {
      key: `turso:${tursoUrl}`,
      factory: () => {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const { PrismaLibSql } = require("@prisma/adapter-libsql");
        const adapter = new PrismaLibSql({ url: tursoUrl, authToken: tursoToken });
        return new PrismaClient({ adapter });
      },
    };
  }

  // Local: use better-sqlite3 adapter
  const dbUrl = resolveSqliteUrl(configuredDbUrl);
  console.log("[PRISMA] DB:", dbUrl);
  return {
    key: `sqlite:${dbUrl}`,
    factory: () => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { PrismaBetterSqlite3 } = require("@prisma/adapter-better-sqlite3");
      return new PrismaClient({ adapter: new PrismaBetterSqlite3({ url: dbUrl }) });
    },
  };
}

export const prisma = createPrismaClient();
