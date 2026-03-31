const { createClient } = require("@libsql/client");
const fs = require("fs");
const path = require("path");

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

    for (const stmt of statements) {
      try {
        await client.execute(stmt);
      } catch (e) {
        if (e.message?.includes("already exists") || e.message?.includes("duplicate column")) {
          console.log("  (skipped - already exists)");
        } else {
          console.error("  ERROR:", e.message);
        }
      }
    }
  }
  console.log("\nDone! All migrations applied to Turso.");
}

run().catch(console.error);
