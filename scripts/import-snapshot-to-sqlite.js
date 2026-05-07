/**
 * import-snapshot-to-sqlite.js
 *
 * Restores a Turso snapshot (.sql produced by export-turso-snapshot.js) into
 * a local SQLite database file using better-sqlite3. Use this on the offline
 * VPS / local mirror when sqlite3 CLI is not available.
 *
 * SAFETY: The snapshot uses DROP+CREATE+INSERT — destructive. By default this
 * script REFUSES to import if the target DB has rows whose primary keys are
 * not present in the snapshot (would silently destroy local-only test data).
 * Run `scripts/compare-turso-vps-counts.js` first to inspect deltas, then pass
 * `--force` to override.
 *
 * Usage:
 *   node scripts/import-snapshot-to-sqlite.js <snapshot.sql> <target.db>
 *   node scripts/import-snapshot-to-sqlite.js backups/turso-snapshot-...sql vps.db --force
 */
const fs = require("fs");
const path = require("path");

const args = process.argv.slice(2);
const force = args.includes("--force");
const positional = args.filter((a) => !a.startsWith("--"));
if (positional.length < 2) {
  console.error("Usage: node scripts/import-snapshot-to-sqlite.js <snapshot.sql> <target.db> [--force]");
  process.exit(1);
}
const [snapshotPath, targetDbPath] = positional;

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

// ── Safety pre-check: scan target for rows missing from snapshot ────────────
function preCheckTargetForLocalUniqueRows() {
  if (!targetExists || force) return;

  const targetDb = new Database(targetDbPath, { readonly: true });
  try {
    // Parse snapshot to extract id sets per table (cheap regex scan, no full parse)
    const tableInsertRegex = /INSERT INTO "([^"]+)" \("id",[^)]*\) VALUES \('([^']+)'/g;
    const snapshotIdsByTable = new Map();
    let match;
    while ((match = tableInsertRegex.exec(sql)) !== null) {
      const [, table, id] = match;
      if (!snapshotIdsByTable.has(table)) snapshotIdsByTable.set(table, new Set());
      snapshotIdsByTable.get(table).add(id);
    }

    const risks = [];
    for (const [table, snapshotIds] of snapshotIdsByTable.entries()) {
      // Check table exists in target
      const exists = targetDb
        .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name=?")
        .get(table);
      if (!exists) continue;

      // Check id column exists (most do; skip those that don't)
      const cols = targetDb.prepare(`PRAGMA table_info("${table}")`).all();
      if (!cols.some((c) => c.name === "id")) continue;

      const localIds = targetDb.prepare(`SELECT id FROM "${table}"`).all().map((r) => String(r.id));
      const unique = localIds.filter((id) => !snapshotIds.has(id));
      if (unique.length > 0) {
        risks.push({ table, count: unique.length, sample: unique.slice(0, 5) });
      }
    }

    if (risks.length > 0) {
      const totalRows = risks.reduce((s, r) => s + r.count, 0);
      console.error("\n🔴 SAFETY GUARD: target DB has rows that would be DESTROYED by this import.");
      console.error(`   ${totalRows} local-only rows across ${risks.length} tables:`);
      for (const r of risks) {
        console.error(`     ${r.table}: ${r.count} rows (sample IDs: ${r.sample.join(", ")}${r.count > 5 ? "…" : ""})`);
      }
      console.error("\n   Options:");
      console.error("     - Inspect first: node scripts/compare-turso-vps-counts.js --target " + targetDbPath);
      console.error("     - Backup target: cp " + targetDbPath + " " + targetDbPath + ".backup");
      console.error("     - Override:     re-run with --force flag (will WIPE these rows)");
      process.exit(2);
    }
  } finally {
    targetDb.close();
  }
}

preCheckTargetForLocalUniqueRows();

// ── Apply snapshot ──────────────────────────────────────────────────────────
const db = new Database(targetDbPath);
db.pragma("journal_mode = WAL");

try {
  // exec runs multiple statements in one call; the snapshot wraps everything
  // in BEGIN TRANSACTION...COMMIT and toggles foreign_keys, so this is atomic.
  db.exec(sql);
  console.log(`✓ Restore complete → ${targetDbPath}${force ? " (--force)" : ""}`);

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
