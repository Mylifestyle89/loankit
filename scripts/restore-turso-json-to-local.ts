/**
 * Restore a Turso JSON backup into the local Prisma SQLite dev.db.
 *
 * Copies rows from a turso-backup-*.json file into prisma/dev.db for the
 * tables that match our Prisma schema (skips the orphaned `new_*` tables
 * left behind by an earlier migration). Existing rows in the target
 * tables are wiped first — this is a replace, not a merge, so only run
 * against a dev database you're willing to overwrite.
 *
 * Run: npx tsx scripts/restore-turso-json-to-local.ts <backup.json>
 */
import { PrismaClient } from "@prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

// Tables to restore in dependency order (parents before children).
// Orphaned `new_*` tables are skipped intentionally.
const RESTORE_ORDER = [
  "user",
  "account",
  "session",
  "verification",
  "twoFactor",
  "branches",
  "customers",
  "co_borrowers",
  "related_persons",
  "credit_at_agribank",
  "credit_at_other",
  "loans",
  "beneficiaries",
  "disbursements",
  "disbursement_beneficiaries",
  "invoices",
  "loan_plan_templates",
  "loan_plans",
  "collaterals",
  "field_template_masters",
  "mapping_instances",
  "report_configs",
  "dropdown_options",
  "app_notifications",
] as const;

type BackupPayload = {
  exportedAt: string;
  sourceUrl: string;
  schema: Array<{ name: string; sql: string }>;
  tables: Record<string, Array<Record<string, unknown>>>;
};

function quoteIdent(name: string): string {
  return `"${name.replace(/"/g, '""')}"`;
}

/** Return the set of column names declared on the target table. */
async function getTableColumns(prisma: PrismaClient, tableName: string): Promise<Set<string>> {
  const rows = await prisma.$queryRawUnsafe<Array<{ name: string }>>(
    `PRAGMA table_info(${quoteIdent(tableName)})`,
  );
  return new Set(rows.map((r) => r.name));
}

async function main() {
  const backupPath = process.argv[2];
  if (!backupPath) {
    console.error("Usage: npx tsx scripts/restore-turso-json-to-local.ts <backup.json>");
    process.exit(1);
  }

  const absPath = resolve(process.cwd(), backupPath);
  console.log(`Loading backup: ${absPath}`);
  const payload = JSON.parse(readFileSync(absPath, "utf8")) as BackupPayload;
  console.log(`Exported at: ${payload.exportedAt}`);
  console.log(`Source: ${payload.sourceUrl}`);

  // Always point at local dev.db, ignoring env (this script must never
  // write to Turso production).
  const dbPath = resolve(process.cwd(), "prisma/dev.db");
  const adapter = new PrismaLibSql({ url: `file:${dbPath}` });
  const prisma = new PrismaClient({ adapter });
  console.log(`Target: ${dbPath}`);
  try {
    // Clear target tables in reverse order (children before parents) to
    // respect foreign-key constraints even though SQLite normally permits
    // cascading deletes via Prisma relations.
    console.log("\nClearing target tables...");
    for (const table of [...RESTORE_ORDER].reverse()) {
      if (!payload.tables[table]) continue;
      await prisma.$executeRawUnsafe(`DELETE FROM ${quoteIdent(table)}`);
    }

    console.log("\nRestoring rows...");
    let totalInserted = 0;
    for (const table of RESTORE_ORDER) {
      const rows = payload.tables[table];
      if (!rows || rows.length === 0) {
        console.log(`  ${table.padEnd(30)} (empty, skipped)`);
        continue;
      }
      // Only keep columns that actually exist on the local table. Production
      // sometimes carries orphan columns (added via manual ALTER TABLE) that
      // the Prisma schema never declared — dropping them here is safer than
      // letting INSERT fail.
      const targetColumns = await getTableColumns(prisma, table);
      const backupColumns = Object.keys(rows[0]);
      const columns = backupColumns.filter((c) => targetColumns.has(c));
      const droppedColumns = backupColumns.filter((c) => !targetColumns.has(c));
      if (droppedColumns.length > 0) {
        console.log(`    (skipping orphan columns: ${droppedColumns.join(", ")})`);
      }
      const placeholders = columns.map(() => "?").join(", ");
      const columnList = columns.map(quoteIdent).join(", ");
      const sql = `INSERT INTO ${quoteIdent(table)} (${columnList}) VALUES (${placeholders})`;

      for (const row of rows) {
        const values = columns.map((c) => row[c]);
        await prisma.$executeRawUnsafe(sql, ...values);
      }
      totalInserted += rows.length;
      console.log(`  ${table.padEnd(30)} ${rows.length} rows`);
    }

    console.log(`\nRestore complete. ${totalInserted} rows written across ${RESTORE_ORDER.length} tables.`);
  } finally {
    await prisma.$disconnect();
  }
}

void main().catch((err) => {
  console.error("Restore failed:", err);
  process.exit(1);
});
