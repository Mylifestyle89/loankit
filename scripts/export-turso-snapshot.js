/**
 * export-turso-snapshot.js
 *
 * Dumps a portable SQLite snapshot of the Turso production DB for use on
 * an offline VPS / local SQLite mirror. Skips auth tables (user/session/
 * account/twoFactor/verification) and Prisma's internal _prisma_migrations
 * by default — caller's VPS has its own auth + migration history.
 *
 * Output: a single .sql file with PRAGMA + DROP IF EXISTS + CREATE TABLE +
 * INSERT INTO + CREATE INDEX statements wrapped in a transaction. Re-import
 * via:
 *   sqlite3 vps-target.db < <output.sql>
 * or via the companion script `scripts/import-turso-snapshot.js`.
 *
 * IMPORTANT: PII columns are stored ENCRYPTED on Turso. The VPS MUST copy
 * the same ENCRYPTION_KEY env var (from .env.local) or decryption fails
 * silently and KH info appears garbled.
 *
 * Usage:
 *   node scripts/export-turso-snapshot.js                          # default → backups/turso-snapshot-<timestamp>.sql
 *   node scripts/export-turso-snapshot.js --out my.sql             # custom output path
 *   node scripts/export-turso-snapshot.js --include-auth           # include user/session/account
 *   node scripts/export-turso-snapshot.js --include-migrations     # include _prisma_migrations
 *   node scripts/export-turso-snapshot.js --tables customers,loans # restrict to specific tables
 *   node scripts/export-turso-snapshot.js --dry-run                # list tables + counts only, don't write
 */
const { createClient } = require("@libsql/client");
const fs = require("fs");
const path = require("path");

// ── Credentials (env vars first; fallback .env.local) ────────────────────
let url = process.env.TURSO_DATABASE_URL;
let authToken = process.env.TURSO_AUTH_TOKEN;
if (!url || !authToken) {
  const envPath = path.join(__dirname, "..", ".env.local");
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, "utf8");
    url = url || envContent.match(/TURSO_DATABASE_URL=(.+)/)?.[1]?.trim();
    authToken = authToken || envContent.match(/TURSO_AUTH_TOKEN=(.+)/)?.[1]?.trim();
  }
}
if (!url || !authToken) {
  console.error("Missing TURSO_DATABASE_URL or TURSO_AUTH_TOKEN.");
  process.exit(1);
}

// ── CLI args ─────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const includeAuth = args.includes("--include-auth");
const includeMigrations = args.includes("--include-migrations");
const dryRun = args.includes("--dry-run");
const outFlag = args.indexOf("--out");
const outPath =
  outFlag >= 0 && args[outFlag + 1]
    ? args[outFlag + 1]
    : path.join("backups", `turso-snapshot-${new Date().toISOString().replace(/[:.]/g, "-")}.sql`);
const tablesFlag = args.indexOf("--tables");
const onlyTables =
  tablesFlag >= 0 && args[tablesFlag + 1]
    ? args[tablesFlag + 1].split(",").map((s) => s.trim()).filter(Boolean)
    : null;

// ── Skip lists ───────────────────────────────────────────────────────────
const AUTH_TABLES = new Set([
  "user", "session", "account", "twoFactor", "verification",
  "CustomerGrant", // ACL referencing user.id — skipped together with auth
]);
const PRISMA_INTERNAL = new Set(["_prisma_migrations"]);

/** Turso leftover from RedefineTables migrations (push-turso-schema.js SKIPS DROP/RENAME). Always exclude. */
function isMigrationLeftover(name) {
  return name.startsWith("new_");
}

const client = createClient({ url, authToken });

// ── Value formatter for INSERT statements ────────────────────────────────
function sqlValue(v) {
  if (v === null || v === undefined) return "NULL";
  if (typeof v === "number") {
    if (!Number.isFinite(v)) return "NULL";
    return String(v);
  }
  if (typeof v === "bigint") return String(v);
  if (typeof v === "boolean") return v ? "1" : "0";
  if (v instanceof ArrayBuffer || ArrayBuffer.isView(v)) {
    const buf = Buffer.from(v.buffer ?? v);
    return "X'" + buf.toString("hex") + "'";
  }
  // string — SQLite single-quote escape (double up)
  return "'" + String(v).replace(/'/g, "''") + "'";
}

(async () => {
  // 1. List all tables
  const tablesRes = await client.execute(
    "SELECT name, sql FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name",
  );

  const allTables = tablesRes.rows.map((r) => ({ name: String(r.name), sql: String(r.sql) }));
  const filtered = allTables.filter(({ name }) => {
    if (onlyTables && !onlyTables.includes(name)) return false;
    if (!includeAuth && AUTH_TABLES.has(name)) return false;
    if (!includeMigrations && PRISMA_INTERNAL.has(name)) return false;
    if (isMigrationLeftover(name)) return false; // always skip new_* leftover
    return true;
  });

  console.log(`Found ${allTables.length} tables on Turso; exporting ${filtered.length}.`);
  console.log(`Skipping: ${allTables.length - filtered.length} (auth=${!includeAuth}, migrations=${!includeMigrations})`);

  // 2. Dry-run: list + counts only
  if (dryRun) {
    console.log("\nTable          | Rows");
    console.log("---------------+--------");
    for (const { name } of filtered) {
      const cnt = await client.execute(`SELECT COUNT(*) AS c FROM "${name}"`);
      console.log(`${name.padEnd(30)} | ${cnt.rows[0].c}`);
    }
    console.log("\nDRY RUN — no file written. Re-run without --dry-run to export.");
    return;
  }

  // 3. Build SQL output
  const out = [];
  out.push(`-- Turso snapshot exported ${new Date().toISOString()}`);
  out.push(`-- Source: ${url}`);
  out.push(`-- Tables: ${filtered.map((t) => t.name).join(", ")}`);
  out.push(`-- Re-import: sqlite3 <target.db> < <this-file.sql>`);
  out.push(`-- WARNING: PII columns are encrypted; target needs same ENCRYPTION_KEY env var.`);
  out.push("");
  out.push("PRAGMA foreign_keys=OFF;");
  out.push("BEGIN TRANSACTION;");
  out.push("");

  let totalRows = 0;

  for (const { name, sql } of filtered) {
    out.push(`-- ──────────── Table: ${name} ────────────`);
    out.push(`DROP TABLE IF EXISTS "${name}";`);
    out.push(sql.trim() + ";");

    const rowsRes = await client.execute(`SELECT * FROM "${name}"`);
    const cols = rowsRes.columns.map((c) => `"${c}"`).join(",");
    let rowCount = 0;
    for (const row of rowsRes.rows) {
      const vals = rowsRes.columns.map((c) => sqlValue(row[c])).join(",");
      out.push(`INSERT INTO "${name}" (${cols}) VALUES (${vals});`);
      rowCount++;
    }
    totalRows += rowCount;

    // Indexes for this table
    const idxRes = await client.execute(
      `SELECT sql FROM sqlite_master WHERE type='index' AND tbl_name=? AND sql IS NOT NULL`,
      [name],
    );
    for (const idx of idxRes.rows) {
      out.push(String(idx.sql).trim() + ";");
    }

    out.push(`-- ${rowCount} rows`);
    out.push("");
    process.stdout.write(`  ${name.padEnd(30)} ${rowCount} rows\n`);
  }

  out.push("COMMIT;");
  out.push("PRAGMA foreign_keys=ON;");

  // 4. Write file
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, out.join("\n"), "utf8");
  const sizeBytes = fs.statSync(outPath).size;
  const sizeStr =
    sizeBytes > 1_000_000 ? `${(sizeBytes / 1_000_000).toFixed(1)} MB` : `${(sizeBytes / 1_000).toFixed(1)} KB`;
  console.log(`\n✓ Wrote ${outPath}  (${sizeStr}, ${totalRows} total rows across ${filtered.length} tables)`);
})().catch((e) => {
  console.error("\nError:", e.message);
  console.error(e.stack);
  process.exit(1);
});
