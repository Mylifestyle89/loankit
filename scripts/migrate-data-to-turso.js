const Database = require("better-sqlite3");
const { createClient } = require("@libsql/client");
const fs = require("fs");
const path = require("path");

// Read Turso credentials from .env.local
const envContent = fs.readFileSync(path.join(__dirname, "..", ".env.local"), "utf8");
const url = envContent.match(/TURSO_DATABASE_URL=(.+)/)?.[1]?.trim();
const authToken = envContent.match(/TURSO_AUTH_TOKEN=(.+)/)?.[1]?.trim();

if (!url || !authToken) {
  console.error("Missing TURSO_DATABASE_URL or TURSO_AUTH_TOKEN in .env.local");
  process.exit(1);
}

const turso = createClient({ url, authToken });
const local = new Database(path.join(__dirname, "..", "dev.db"));

// Tables in dependency order (parent tables first)
const TABLES = [
  "customers",
  "field_template_masters",
  "loans",
  "mapping_instances",
  "beneficiaries",
  "disbursements",
  "disbursement_beneficiaries",
  "invoices",
  "app_notifications",
];

async function migrateTable(tableName) {
  const rows = local.prepare(`SELECT * FROM ${tableName}`).all();
  if (rows.length === 0) {
    console.log(`  ${tableName}: 0 rows (skip)`);
    return 0;
  }

  const columns = Object.keys(rows[0]);
  const placeholders = columns.map(() => "?").join(", ");
  const sql = `INSERT OR REPLACE INTO ${tableName} (${columns.join(", ")}) VALUES (${placeholders})`;

  let inserted = 0;
  for (const row of rows) {
    const values = columns.map((col) => row[col]);
    try {
      await turso.execute({ sql, args: values });
      inserted++;
    } catch (e) {
      console.error(`  ERROR [${tableName}]:`, e.message);
    }
  }
  console.log(`  ${tableName}: ${inserted}/${rows.length} rows migrated`);
  return inserted;
}

async function main() {
  console.log("Migrating local SQLite → Turso cloud...\n");

  let total = 0;
  for (const table of TABLES) {
    total += await migrateTable(table);
  }

  console.log(`\nDone! ${total} total rows migrated to Turso.`);
  local.close();
}

main().catch(console.error);
