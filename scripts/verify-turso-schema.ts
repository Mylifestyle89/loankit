// Quick read-only sanity check of the customers table on Turso —
// used to confirm migration SQL reached the production database.
import { createClient } from "@libsql/client";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const raw = readFileSync(resolve(process.cwd(), ".env.vercel.production"), "utf8");
const env: Record<string, string> = {};
for (const line of raw.split(/\r?\n/)) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) continue;
  const eq = trimmed.indexOf("=");
  if (eq === -1) continue;
  env[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim().replace(/^"|"$/g, "");
}

async function main() {
  const client = createClient({
    url: env.TURSO_DATABASE_URL,
    authToken: env.TURSO_AUTH_TOKEN,
  });
  const cols = await client.execute('PRAGMA table_info("customers")');
  const colNames = cols.rows.map((r) => r.name as string);
  console.log("customer_code cols:", colNames.filter((n) => n.includes("customer_code")));

  const idx = await client.execute(
    "SELECT name FROM sqlite_master WHERE type='index' AND tbl_name='customers'",
  );
  console.log("Indexes:", idx.rows.map((r) => r.name));

  const withHash = await client.execute(
    'SELECT COUNT(*) AS n FROM "customers" WHERE "customer_code_hash" IS NOT NULL',
  );
  const total = await client.execute('SELECT COUNT(*) AS n FROM "customers"');
  console.log(`Customers: ${total.rows[0].n} total, ${withHash.rows[0].n} with hash`);

  client.close();
}

void main().catch((err) => {
  console.error("Verify failed:", err);
  process.exit(1);
});
