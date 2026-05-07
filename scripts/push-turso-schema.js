const { createClient } = require("@libsql/client");
const fs = require("fs");
const path = require("path");

// Explicit opt-out for environments that have Turso creds for read-only purposes
// (e.g. VPS pulling snapshots) but should NOT push schema upstream.
if (process.env.SKIP_TURSO_SYNC === "1") {
  console.log("SKIP_TURSO_SYNC=1 — skipping Turso schema push (local SQLite mode).");
  process.exit(0);
}

// Resolve Turso credentials: env vars first (Vercel), fallback to .env.local (local dev)
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
  console.log("No Turso credentials found — skipping remote DB sync (local dev with SQLite).");
  process.exit(0);
}

const client = createClient({ url, authToken });

async function run() {
  const migDir = path.join(__dirname, "..", "prisma", "migrations");
  const dirs = fs.readdirSync(migDir)
    .filter((d) => fs.statSync(path.join(migDir, d)).isDirectory())
    .sort();

  for (const dir of dirs) {
    const sqlFile = path.join(migDir, dir, "migration.sql");
    if (!fs.existsSync(sqlFile)) continue;

    const sql = fs.readFileSync(sqlFile, "utf8");
    const statements = sql.split(";").map((s) => s.trim()).filter((s) => s.length > 0);
    console.log("Migration:", dir, "(" + statements.length + " statements)");

    // Detect RedefineTables pattern (DROP + recreate) — DANGEROUS on existing data.
    // Only run safe statements: CREATE TABLE, CREATE INDEX, ALTER TABLE ADD COLUMN.
    // Skip: PRAGMA, INSERT INTO "new_", DROP TABLE, ALTER TABLE RENAME (redefine steps).
    const hasRedefine = sql.includes("RedefineTables") || sql.includes('DROP TABLE "');

    for (let stmt of statements) {
      const upper = stmt.toUpperCase().replace(/\s+/g, " ").trim();

      // Always safe: CREATE TABLE, CREATE INDEX, ALTER TABLE ADD COLUMN
      const isSafe =
        upper.startsWith("CREATE TABLE") ||
        upper.startsWith("CREATE UNIQUE INDEX") ||
        upper.startsWith("CREATE INDEX") ||
        (upper.startsWith("ALTER TABLE") && upper.includes("ADD COLUMN"));

      // Dangerous in redefine context: DROP, INSERT INTO new_, PRAGMA, RENAME
      if (hasRedefine && !isSafe) continue;

      // Add IF NOT EXISTS to prevent constraint errors on re-deploy
      if (upper.startsWith("CREATE TABLE") && !upper.includes("IF NOT EXISTS")) {
        stmt = stmt.replace(/CREATE TABLE/i, "CREATE TABLE IF NOT EXISTS");
      }
      if ((upper.startsWith("CREATE UNIQUE INDEX") || upper.startsWith("CREATE INDEX")) && !upper.includes("IF NOT EXISTS")) {
        stmt = stmt.replace(/CREATE (UNIQUE )?INDEX/i, (m) => m + " IF NOT EXISTS");
      }

      try {
        await client.execute(stmt);
      } catch (e) {
        // Silently skip already-applied schema changes
        if (e.message?.includes("already exists") || e.message?.includes("duplicate column")) continue;
        console.error("  ERROR:", e.message);
      }
    }
  }
  console.log("\nDone! All migrations applied to Turso.");
}

run().catch(console.error);
