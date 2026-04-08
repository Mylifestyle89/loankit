/**
 * Backup Turso production database to a local JSON file.
 *
 * Reads TURSO_DATABASE_URL + TURSO_AUTH_TOKEN from .env.vercel.production,
 * dumps every user table (schema + rows) into one JSON file under backups/.
 * Restore reference only — not automatic; see migrate-pii-rollback if you
 * need to reverse a migration.
 *
 * Run: npx tsx scripts/backup-turso-to-json.ts
 */
import { createClient } from "@libsql/client";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

// ---------- Load env from .env.vercel.production (no dotenv dep) ----------
function loadEnvFile(filePath: string): Record<string, string> {
  const raw = readFileSync(filePath, "utf8");
  const env: Record<string, string> = {};
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
    env[key] = value;
  }
  return env;
}

const envPath = resolve(process.cwd(), ".env.vercel.production");
const env = loadEnvFile(envPath);
const url = env.TURSO_DATABASE_URL || env.DATABASE_URL;
const authToken = env.TURSO_AUTH_TOKEN;

if (!url || !authToken) {
  console.error("Missing TURSO_DATABASE_URL or TURSO_AUTH_TOKEN in .env.vercel.production");
  process.exit(1);
}

// ---------- Connect + dump ----------
async function main() {
  console.log(`Connecting to ${url}`);
  const client = createClient({ url, authToken });

  // Discover user tables (skip sqlite internals + prisma migration metadata)
  const tablesResult = await client.execute({
    sql: `SELECT name, sql FROM sqlite_master
          WHERE type = 'table'
            AND name NOT LIKE 'sqlite_%'
            AND name NOT LIKE '_prisma_%'
          ORDER BY name`,
    args: [],
  });

  const schema: Array<{ name: string; sql: string }> = [];
  const tables: Record<string, unknown[]> = {};

  for (const row of tablesResult.rows) {
    const tableName = row.name as string;
    const createSql = row.sql as string;
    schema.push({ name: tableName, sql: createSql });

    const dataResult = await client.execute({
      sql: `SELECT * FROM "${tableName}"`,
      args: [],
    });
    // Convert BigInt → string for JSON safety
    const rows = dataResult.rows.map((r) => {
      const obj: Record<string, unknown> = {};
      for (const key of Object.keys(r)) {
        const v = (r as Record<string, unknown>)[key];
        obj[key] = typeof v === "bigint" ? v.toString() : v;
      }
      return obj;
    });
    tables[tableName] = rows;
    console.log(`  ${tableName.padEnd(30)} ${rows.length} rows`);
  }

  // Write dump file with timestamp
  const now = new Date();
  const stamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}-${String(now.getHours()).padStart(2, "0")}${String(now.getMinutes()).padStart(2, "0")}`;
  const outPath = resolve(process.cwd(), "backups", `turso-backup-${stamp}.json`);
  const payload = {
    exportedAt: now.toISOString(),
    sourceUrl: url,
    schema,
    tables,
  };
  writeFileSync(outPath, JSON.stringify(payload, null, 2), "utf8");

  const totalRows = Object.values(tables).reduce((sum, arr) => sum + arr.length, 0);
  console.log(`\nBackup written: ${outPath}`);
  console.log(`Tables: ${schema.length} | Total rows: ${totalRows}`);

  client.close();
}

void main().catch((err) => {
  console.error("Backup failed:", err);
  process.exit(1);
});
