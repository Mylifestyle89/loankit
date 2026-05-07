/**
 * refresh-local-from-turso.js
 *
 * One-shot: export latest Turso snapshot + force-import vào ./dev.db.
 * Use case: bạn muốn local dev DB mirror Turso prod để test feature
 * với data thật. Mất 5-10s, wipes local dev DB (auth giữ vì snapshot
 * skip user/session/account).
 *
 * NOT for VPS — VPS có data riêng, cần compare + backup trước import.
 *
 * Usage:
 *   npm run snapshot:refresh
 */
const { spawnSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

function run(label, cmd, args) {
  console.log(`\n[${label}] ${cmd} ${args.join(" ")}`);
  const r = spawnSync(cmd, args, { stdio: "inherit", shell: process.platform === "win32" });
  if (r.status !== 0) {
    console.error(`[${label}] failed with exit code ${r.status}`);
    process.exit(r.status ?? 1);
  }
}

// 1. Export
run("export", "node", ["scripts/export-turso-snapshot.js"]);

// 2. Find latest snapshot file
const backupsDir = path.join(__dirname, "..", "backups");
const snapshots = fs
  .readdirSync(backupsDir)
  .filter((f) => f.startsWith("turso-snapshot-") && f.endsWith(".sql"))
  .map((f) => ({ f, mtime: fs.statSync(path.join(backupsDir, f)).mtimeMs }))
  .sort((a, b) => b.mtime - a.mtime);

if (snapshots.length === 0) {
  console.error("No snapshot file found in backups/.");
  process.exit(1);
}
const latest = path.join("backups", snapshots[0].f);
console.log(`\n[refresh] Latest snapshot: ${latest}`);

// 3. Import with --force (local dev DB — local-only rows are throwaway)
run("import", "node", ["scripts/import-snapshot-to-sqlite.js", latest, "dev.db", "--force"]);

console.log("\n✓ Local dev DB refreshed from Turso. Run `npm run dev` to start.");
