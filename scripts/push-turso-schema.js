const { createClient } = require("@libsql/client");
const fs = require("fs");
const path = require("path");

// Read token from .env.local
const envContent = fs.readFileSync(path.join(__dirname, "..", ".env.local"), "utf8");
const url = envContent.match(/TURSO_DATABASE_URL=(.+)/)?.[1]?.trim();
const authToken = envContent.match(/TURSO_AUTH_TOKEN=(.+)/)?.[1]?.trim();

if (!url || !authToken) {
  console.error("Missing TURSO_DATABASE_URL or TURSO_AUTH_TOKEN in .env.local");
  process.exit(1);
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
        if (e.message?.includes("already exists")) {
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
