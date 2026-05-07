/**
 * compare-turso-vps-counts.js
 *
 * Pre-import diagnostic: compare row counts (and primary-key set diff for
 * small tables) between Turso prod and a local SQLite database. Run BEFORE
 * `import-snapshot-to-sqlite.js` to spot VPS-unique rows that an import
 * would destroy.
 *
 * Usage:
 *   node scripts/compare-turso-vps-counts.js                 # default: compare against ./dev.db
 *   node scripts/compare-turso-vps-counts.js --target vps.db
 *   node scripts/compare-turso-vps-counts.js --diff-rows     # also list unique IDs (slower, larger output)
 */
const { createClient } = require("@libsql/client");
const fs = require("fs");
const path = require("path");

let url = process.env.TURSO_DATABASE_URL;
let authToken = process.env.TURSO_AUTH_TOKEN;
if (!url || !authToken) {
  const envPath = path.join(__dirname, "..", ".env.local");
  if (fs.existsSync(envPath)) {
    const env = fs.readFileSync(envPath, "utf8");
    url = url || env.match(/TURSO_DATABASE_URL=(.+)/)?.[1]?.trim();
    authToken = authToken || env.match(/TURSO_AUTH_TOKEN=(.+)/)?.[1]?.trim();
  }
}
if (!url || !authToken) {
  console.error("Missing TURSO_DATABASE_URL or TURSO_AUTH_TOKEN.");
  process.exit(1);
}

const args = process.argv.slice(2);
const targetIdx = args.indexOf("--target");
const targetPath = targetIdx >= 0 && args[targetIdx + 1] ? args[targetIdx + 1] : "dev.db";
const showDiffRows = args.includes("--diff-rows");

if (!fs.existsSync(targetPath)) {
  console.error(`Target SQLite file not found: ${targetPath}`);
  process.exit(1);
}

let Database;
try {
  Database = require("better-sqlite3");
} catch {
  console.error("better-sqlite3 not installed. Run: npm i -D better-sqlite3");
  process.exit(1);
}

const SKIP_TABLES = new Set([
  "user", "session", "account", "twoFactor", "verification",
  "CustomerGrant", "_prisma_migrations",
]);
const isLeftover = (n) => n.startsWith("new_");

(async () => {
  const turso = createClient({ url, authToken });
  const local = new Database(targetPath, { readonly: true });

  // Tables on both sides
  const tursoTables = (
    await turso.execute(
      "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name",
    )
  ).rows.map((r) => String(r.name));
  const localTables = local
    .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name")
    .all()
    .map((r) => r.name);

  const sharedTables = tursoTables
    .filter((t) => localTables.includes(t))
    .filter((t) => !SKIP_TABLES.has(t) && !isLeftover(t));

  const onlyTurso = tursoTables.filter((t) => !localTables.includes(t) && !SKIP_TABLES.has(t) && !isLeftover(t));
  const onlyLocal = localTables.filter((t) => !tursoTables.includes(t) && !SKIP_TABLES.has(t) && !isLeftover(t));

  if (onlyTurso.length) console.warn(`⚠ Tables only on Turso: ${onlyTurso.join(", ")}`);
  if (onlyLocal.length) console.warn(`⚠ Tables only on local: ${onlyLocal.join(", ")}`);

  // Compare counts
  console.log("\nTable                          | Turso | Local | Δ      | Risk");
  console.log("-------------------------------+-------+-------+--------+--------------");

  const risks = [];
  let totalLocalUnique = 0;

  for (const table of sharedTables) {
    const tursoCnt = Number((await turso.execute(`SELECT COUNT(*) AS c FROM "${table}"`)).rows[0].c);
    const localCnt = local.prepare(`SELECT COUNT(*) AS c FROM "${table}"`).get().c;
    const delta = localCnt - tursoCnt;

    let risk = "—";
    let localUniqueCount = 0;
    let localUniqueIds = [];

    // PK-based set diff for tables likely keyed by id
    const colsRes = local.prepare(`PRAGMA table_info("${table}")`).all();
    const hasIdCol = colsRes.some((c) => c.name === "id");
    if (hasIdCol) {
      const tursoIdsRes = await turso.execute(`SELECT id FROM "${table}"`);
      const tursoIdSet = new Set(tursoIdsRes.rows.map((r) => String(r.id)));
      const localIds = local.prepare(`SELECT id FROM "${table}"`).all().map((r) => String(r.id));
      const unique = localIds.filter((id) => !tursoIdSet.has(id));
      localUniqueCount = unique.length;
      localUniqueIds = unique.slice(0, 5);
      if (localUniqueCount > 0) {
        risk = `🔴 ${localUniqueCount} local-only rows`;
        risks.push({ table, localUniqueCount, localUniqueIds });
        totalLocalUnique += localUniqueCount;
      } else if (delta > 0) {
        risk = "🟡 local newer (unknown PK)";
      } else if (delta < 0) {
        risk = "🟢 Turso ahead";
      } else {
        risk = "🟢 in sync";
      }
    } else {
      risk = delta === 0 ? "🟢 count match" : delta > 0 ? "🟡 local extra" : "🟢 Turso ahead";
    }

    const deltaStr = delta > 0 ? `+${delta}` : String(delta);
    console.log(
      `${table.padEnd(30)} | ${String(tursoCnt).padStart(5)} | ${String(localCnt).padStart(5)} | ${deltaStr.padStart(6)} | ${risk}`,
    );
  }

  // Summary
  console.log("\n────────────────────────────────────────────────────────────────");
  if (risks.length === 0) {
    console.log("✓ Safe to import — no local-only rows would be lost.");
  } else {
    console.log(`🔴 WARNING: ${totalLocalUnique} local-only rows across ${risks.length} tables would be DESTROYED by snapshot import.`);
    console.log("\nDetails:");
    for (const r of risks) {
      console.log(`  ${r.table}: ${r.localUniqueCount} unique rows (sample IDs: ${r.localUniqueIds.join(", ")}${r.localUniqueCount > 5 ? "…" : ""})`);
    }
    console.log("\nBefore import:");
    console.log("  1. Backup local DB: cp dev.db dev.db.backup-$(Get-Date -Format yyyyMMdd-HHmm)");
    console.log("  2. Decide: discard local-only rows OR migrate them to Turso first");
    console.log("  3. Then run: node scripts/import-snapshot-to-sqlite.js <snapshot.sql> dev.db --force");
  }

  if (showDiffRows && risks.length > 0) {
    console.log("\n--diff-rows flag set — full unique ID list per table:");
    for (const r of risks) {
      const allUnique = local.prepare(`SELECT id FROM "${r.table}"`).all().map((row) => String(row.id));
      const tursoIdsRes = await turso.execute(`SELECT id FROM "${r.table}"`);
      const tursoSet = new Set(tursoIdsRes.rows.map((row) => String(row.id)));
      const onlyLocal = allUnique.filter((id) => !tursoSet.has(id));
      console.log(`\n  ${r.table} (${onlyLocal.length} local-only):`);
      for (const id of onlyLocal) console.log(`    ${id}`);
    }
  }

  local.close();
})().catch((e) => {
  console.error("\nError:", e.message);
  process.exit(1);
});
