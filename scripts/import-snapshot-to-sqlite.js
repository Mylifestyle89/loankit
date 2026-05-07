/**
 * import-snapshot-to-sqlite.js
 *
 * Restores a Turso snapshot (.sql produced by export-turso-snapshot.js) into
 * a local SQLite database file using better-sqlite3. Use this on the offline
 * VPS / local mirror when sqlite3 CLI is not available.
 *
 * For machines with sqlite3 CLI installed, the simpler one-liner works too:
 *   sqlite3 <target.db> < <snapshot.sql>
 *
 * IMPORTANT: target DB must already have the auth tables (user/session/...)
 * created by Prisma migrations — the snapshot deliberately omits auth so VPS
 * keeps its own user list. Run `npx prisma migrate deploy` on target FIRST,
 * then run this script to overlay customer + globals data.
 *
 * Usage:
 *   node scripts/import-snapshot-to-sqlite.js <snapshot.sql> <target.db>
 *   node scripts/import-snapshot-to-sqlite.js backups/turso-snapshot-...sql vps.db
 */
const fs = require("fs");
const path = require("path");

const args = process.argv.slice(2);
if (args.length < 2) {
  console.error("Usage: node scripts/import-snapshot-to-sqlite.js <snapshot.sql> <target.db>");
  process.exit(1);
}
const [snapshotPath, targetDbPath] = args;

if (!fs.existsSync(snapshotPath)) {
  console.error(`Snapshot file not found: ${snapshotPath}`);
  process.exit(1);
}

let Database;
try {
  Database = require("better-sqlite3");
} catch {
  console.error("better-sqlite3 not installed. Install with: npm i -D better-sqlite3");
  console.error("Or use sqlite3 CLI directly:");
  console.error(`  sqlite3 ${targetDbPath} < ${snapshotPath}`);
  process.exit(1);
}

const sql = fs.readFileSync(snapshotPath, "utf8");
const sizeStr =
  sql.length > 1_000_000 ? `${(sql.length / 1_000_000).toFixed(1)} MB` : `${(sql.length / 1_000).toFixed(1)} KB`;
console.log(`Loading ${snapshotPath} (${sizeStr}) into ${targetDbPath}...`);

const targetExists = fs.existsSync(targetDbPath);
if (!targetExists) {
  console.warn(`⚠ Target ${targetDbPath} does not exist — creating empty file. Auth tables will be missing.`);
  console.warn(`  Recommended: run 'npx prisma migrate deploy --schema prisma/schema.prisma' first to create auth schema.`);
}

const db = new Database(targetDbPath);
db.pragma("journal_mode = WAL");

try {
  // exec runs multiple statements in one call; the snapshot wraps everything
  // in BEGIN TRANSACTION...COMMIT and toggles foreign_keys, so this is atomic.
  db.exec(sql);
  console.log(`✓ Restore complete → ${targetDbPath}`);

  // Quick verification: count tables that look like data tables
  const tables = db
    .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_prisma%'")
    .all();
  console.log(`\nTarget DB now has ${tables.length} tables.`);
  console.log("Sample row counts (top 10):");
  for (const { name } of tables.slice(0, 10)) {
    const cnt = db.prepare(`SELECT COUNT(*) AS c FROM "${name}"`).get();
    console.log(`  ${name.padEnd(30)} ${cnt.c} rows`);
  }
} catch (e) {
  console.error("\n✗ Restore failed:", e.message);
  process.exit(1);
} finally {
  db.close();
}

console.log(`\nDone. Verify VPS app: copy .env (incl. ENCRYPTION_KEY) + start dev server.`);
