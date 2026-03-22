const path = require("path");
const Database = require("better-sqlite3");

const dbPath = path.resolve(process.cwd(), "dev.db");

function hasTable(db, table) {
  const row = db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?").get(table);
  return Boolean(row);
}

function hasColumn(db, table, column) {
  const cols = db.prepare(`PRAGMA table_info(${table})`).all();
  return cols.some((c) => c.name === column);
}

try {
  const db = new Database(dbPath, { readonly: true });
  const tables = ["customers", "loans", "disbursements", "invoices", "collaterals"];

  console.log(`[db:status:local] DB file: ${dbPath}`);
  console.log("[db:status:local] Table checks:");
  for (const table of tables) {
    console.log(`- ${table}: ${hasTable(db, table) ? "OK" : "MISSING"}`);
  }

  console.log("[db:status:local] Loan columns:");
  for (const col of ["prior_contract_number", "prior_contract_date", "prior_outstanding"]) {
    console.log(`- ${col}: ${hasColumn(db, "loans", col) ? "OK" : "MISSING"}`);
  }

  const customerCount = db.prepare("SELECT COUNT(*) AS c FROM customers").get().c;
  const loanCount = db.prepare("SELECT COUNT(*) AS c FROM loans").get().c;
  console.log(`[db:status:local] customers=${customerCount}, loans=${loanCount}`);
  db.close();
} catch (error) {
  console.error("[db:status:local] Failed:", error.message);
  process.exit(1);
}
