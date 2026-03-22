const fs = require("fs");
const path = require("path");
const { createClient } = require("@libsql/client");

function readEnvValue(content, key) {
  const match = content.match(new RegExp(`^${key}=(.+)$`, "m"));
  return match ? match[1].trim() : "";
}

async function hasTable(client, table) {
  const rs = await client.execute({
    sql: "SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?",
    args: [table],
  });
  return rs.rows.length > 0;
}

async function hasColumn(client, table, column) {
  const rs = await client.execute(`PRAGMA table_info(${table})`);
  return rs.rows.some((row) => row.name === column);
}

async function main() {
  const envPath = path.join(__dirname, "..", ".env.local");
  const envContent = fs.readFileSync(envPath, "utf8");
  const url = readEnvValue(envContent, "TURSO_DATABASE_URL");
  const authToken = readEnvValue(envContent, "TURSO_AUTH_TOKEN");

  if (!url || !authToken) {
    console.error("[db:status:turso] Missing TURSO_DATABASE_URL or TURSO_AUTH_TOKEN in .env.local");
    process.exit(1);
  }

  const client = createClient({ url, authToken });
  const tables = ["customers", "loans", "disbursements", "invoices", "collaterals"];

  console.log(`[db:status:turso] URL: ${url}`);
  console.log("[db:status:turso] Table checks:");
  for (const table of tables) {
    console.log(`- ${table}: ${(await hasTable(client, table)) ? "OK" : "MISSING"}`);
  }

  console.log("[db:status:turso] Loan columns:");
  for (const col of ["prior_contract_number", "prior_contract_date", "prior_outstanding"]) {
    console.log(`- ${col}: ${(await hasColumn(client, "loans", col)) ? "OK" : "MISSING"}`);
  }

  const customerCount = await client.execute("SELECT COUNT(*) AS c FROM customers");
  const loanCount = await client.execute("SELECT COUNT(*) AS c FROM loans");
  console.log(`[db:status:turso] customers=${customerCount.rows[0].c}, loans=${loanCount.rows[0].c}`);
}

main().catch((error) => {
  console.error("[db:status:turso] Failed:", error.message);
  process.exit(1);
});
