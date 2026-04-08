/**
 * Execute a .sql file against the Turso production database.
 *
 * Reads TURSO_DATABASE_URL + TURSO_AUTH_TOKEN from
 * .env.vercel.production, splits the file into statements on `;`
 * (ignoring empty / comment-only statements), and runs each via
 * @libsql/client. Prints what ran so the log tells the story in case
 * something partially applies.
 *
 * Run: npx tsx scripts/run-turso-sql-file.ts <path-to.sql>
 */
import { createClient } from "@libsql/client";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { loadProdEnv } from "./_env-utils";

/** Strip `-- comments` from a SQL file and split on `;` into statements. */
function splitStatements(sql: string): string[] {
  const noComments = sql
    .split(/\r?\n/)
    .map((line) => {
      const commentIdx = line.indexOf("--");
      return commentIdx === -1 ? line : line.slice(0, commentIdx);
    })
    .join("\n");
  return noComments
    .split(";")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

async function main() {
  const sqlPath = process.argv[2];
  if (!sqlPath) {
    console.error("Usage: npx tsx scripts/run-turso-sql-file.ts <path-to.sql>");
    process.exit(1);
  }

  const env = loadProdEnv();
  const url = env.TURSO_DATABASE_URL || env.DATABASE_URL;
  const authToken = env.TURSO_AUTH_TOKEN;
  if (!url || !authToken) {
    console.error("Missing TURSO_DATABASE_URL / TURSO_AUTH_TOKEN in .env.vercel.production");
    process.exit(1);
  }

  const abs = resolve(process.cwd(), sqlPath);
  const sql = readFileSync(abs, "utf8");
  const statements = splitStatements(sql);

  console.log(`Target: ${url}`);
  console.log(`File:   ${abs}`);
  console.log(`Statements: ${statements.length}\n`);

  const client = createClient({ url, authToken });
  try {
    for (const [i, stmt] of statements.entries()) {
      const preview = stmt.replace(/\s+/g, " ").slice(0, 80);
      console.log(`[${i + 1}/${statements.length}] ${preview}${stmt.length > 80 ? "…" : ""}`);
      await client.execute(stmt);
    }
    console.log("\nAll statements executed successfully.");
  } finally {
    client.close();
  }
}

void main().catch((err) => {
  console.error("Execution failed:", err);
  process.exit(1);
});
