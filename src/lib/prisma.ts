import { PrismaClient } from "@prisma/client";
import path from "path";

type PrismaGlobal = {
  prisma?: PrismaClient;
  prismaKey?: string;
};

const globalForPrisma = globalThis as unknown as PrismaGlobal;

function sanitizeEnv(value?: string): string | undefined {
  // Vercel env values can occasionally include escaped newlines like "\n".
  return value?.replace(/\\r/g, "").replace(/\\n/g, "").trim();
}

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
  const configuredDbUrl = sanitizeEnv(process.env.DATABASE_URL);
  const useTursoExplicitly = sanitizeEnv(process.env.PRISMA_USE_TURSO)?.toLowerCase() === "true";
  const tursoUrl = sanitizeEnv(process.env.TURSO_DATABASE_URL);
  const tursoToken = sanitizeEnv(process.env.TURSO_AUTH_TOKEN);
  const dbUrlLooksLikeLibsql =
    configuredDbUrl?.startsWith("libsql://") ||
    configuredDbUrl?.startsWith("http://") ||
    configuredDbUrl?.startsWith("https://");
  // Do not auto-switch to Turso just because env vars exist in local dev.
  // Use LibSQL only when explicitly enabled or when DATABASE_URL itself is LibSQL/HTTP.
  const shouldUseLibsql = useTursoExplicitly || dbUrlLooksLikeLibsql;
  const resolvedLibsqlUrl = tursoUrl ?? (dbUrlLooksLikeLibsql ? configuredDbUrl : undefined);

  // Cloud (Turso/LibSQL): accept either TURSO_DATABASE_URL or DATABASE_URL=libsql://...
  if (shouldUseLibsql && resolvedLibsqlUrl) {
    return {
      key: `libsql:${resolvedLibsqlUrl}`,
      factory: () => {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const { PrismaLibSql } = require("@prisma/adapter-libsql");
        const adapter = new PrismaLibSql({ url: resolvedLibsqlUrl, authToken: tursoToken });
        return new PrismaClient({ adapter });
      },
    };
  }

  // Local: use better-sqlite3 adapter
  const dbUrl = resolveSqliteUrl(configuredDbUrl);
  if (process.env.NODE_ENV !== "production") {
    console.log("[PRISMA] DB:", dbUrl);
  }
  return {
    key: `sqlite:${dbUrl}`,
    factory: () => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { PrismaLibSql } = require("@prisma/adapter-libsql");
      return new PrismaClient({ adapter: new PrismaLibSql({ url: dbUrl }) });
    },
  };
}

export const prisma = createPrismaClient();
