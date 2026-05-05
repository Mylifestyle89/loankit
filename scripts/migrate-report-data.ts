/**
 * scripts/migrate-report-data.ts
 *
 * Phase 2 — Migrate report module legacy data to new schema (DB-first).
 *
 * Usage:
 *   npx tsx scripts/migrate-report-data.ts [flags]
 *
 * Flags:
 *   --dry-run   (default)  Log diff, no DB writes
 *   --commit               Execute writes (overrides dry-run)
 *   --verbose              Detailed per-record logs
 *   --yes                  Skip interactive confirmation for prod target
 *   --force                Re-run even if migration-completed.json exists
 *
 * Strategy:
 *   - Step A: Scan MappingInstance → set Loan.masterTemplateId for newest active loan per customer
 *   - Step B: ALL keys in report_assets/manual_values.json → orphans (no heuristic attribution)
 *
 * Idempotent guards:
 *   - Skip Loan with masterTemplateId !== null
 *   - Skip whole script if migration-completed.json exists (unless --force)
 */

import { PrismaClient } from "@prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve, isAbsolute } from "node:path";
import { createInterface } from "node:readline";
import { isDeepStrictEqual } from "node:util";

// ─── Constants — orphan reason taxonomy (typo-safe + greppable) ───────────

const ORPHAN_REASON = {
  INSTANCE_HAS_NO_MASTER: "instance_has_no_masterId",
  NO_ACTIVE_LOAN: "no_active_loan_for_customer",
  MULTIPLE_LOANS_OLDER_SKIPPED: "multiple_active_loans_skipped_older",
  LOAN_ALREADY_ASSIGNED: "loan_already_assigned_by_earlier_instance",
  MANUAL_VALUES_NO_ATTRIBUTION: "manual_values_global_no_attribution",
} as const;
type OrphanReason = (typeof ORPHAN_REASON)[keyof typeof ORPHAN_REASON];

// ─── Types ────────────────────────────────────────────────────────────────

type OrphanRecord = {
  key: string;
  value: unknown;
  reason: OrphanReason;
  sourceFile: string;
};

type Stats = {
  instancesScanned: number;
  loansUpdated: number;
  loansSkipped: number;
  mappingDiffs: number;
  orphansCount: number;
};

// ─── Args ─────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const flags = {
  commit: args.includes("--commit"),
  verbose: args.includes("--verbose"),
  yes: args.includes("--yes"),
  force: args.includes("--force"),
};
const dryRun = !flags.commit;

// ─── Paths ────────────────────────────────────────────────────────────────

const ROOT = process.cwd();
const ORPHANS_PATH = resolve(ROOT, "migration-orphans.json");
const SUMMARY_PATH = resolve(ROOT, "migration-summary.json");
const COMPLETED_PATH = resolve(ROOT, "migration-completed.json");
const MANUAL_VALUES_PATH = resolve(ROOT, "report_assets/manual_values.json");

// ─── Logger ───────────────────────────────────────────────────────────────

const log = (...m: unknown[]) => console.log(...m);
const verbose = (...m: unknown[]) => flags.verbose && console.log("[verbose]", ...m);
const warn = (...m: unknown[]) => console.warn("[warn]", ...m);
const err = (...m: unknown[]) => console.error("[error]", ...m);

function abort(msg: string, code = 1): never {
  err(msg);
  process.exit(code);
}

// ─── Helpers ──────────────────────────────────────────────────────────────

// libsql adapter pins identical behaviour to runtime client (file:./ + libsql://)
function createPrisma(dbUrl: string, authToken?: string): PrismaClient {
  let url = dbUrl;
  if (url.startsWith("file:")) {
    const p = url.slice(5);
    if (!isAbsolute(p)) url = `file:${resolve(process.cwd(), p)}`;
  }
  const adapter = new PrismaLibSql({ url, authToken });
  return new PrismaClient({ adapter });
}

function maskUrl(url: string): string {
  return url.replace(/(authToken=)[^&]+/i, "$1***").replace(/(:\/\/[^:]+:)[^@]+(@)/, "$1***$2");
}

function detectTarget(url: string | undefined): "sqlite" | "turso" | "unknown" {
  if (!url) return "unknown";
  if (url.startsWith("file:")) return "sqlite";
  if (url.startsWith("libsql:") || url.startsWith("https://")) return "turso";
  return "unknown";
}

async function confirmProd(targetUrl: string): Promise<void> {
  if (flags.yes) {
    log("[confirm] --yes flag detected, skipping prompt");
    return;
  }
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const answer = await new Promise<string>((res) =>
    rl.question(`\n⚠️  COMMIT to PROD target: ${maskUrl(targetUrl)}\n   Type 'yes' to confirm: `, (a) => {
      rl.close();
      res(a.trim());
    }),
  );
  if (answer !== "yes") abort("Confirmation declined.");
}

type ParseResult = { ok: true; value: unknown } | { ok: false };
function tryParseJson(s: string | null | undefined): ParseResult {
  if (!s) return { ok: false };
  try {
    return { ok: true, value: JSON.parse(s) };
  } catch {
    return { ok: false };
  }
}

// ─── Migration core ───────────────────────────────────────────────────────

async function runMigration(prisma: PrismaClient): Promise<{ stats: Stats; orphans: OrphanRecord[] }> {
  const stats: Stats = { instancesScanned: 0, loansUpdated: 0, loansSkipped: 0, mappingDiffs: 0, orphansCount: 0 };
  const orphans: OrphanRecord[] = [];
  const pushOrphan = (reason: OrphanReason, key: string, value: unknown, sourceFile = "MappingInstance") => {
    orphans.push({ key, value, reason, sourceFile });
  };

  // ─── Step A: MappingInstance → Loan.masterTemplateId ────────────────
  log("\n[Step A] Scanning MappingInstance...");
  const instances = await prisma.mappingInstance.findMany({ include: { master: true } });
  log(`  Found ${instances.length} MappingInstance records`);

  // Pre-fetch active loans grouped by customer (avoids N+1 round-trips on Turso)
  const customerIds = [...new Set(instances.map((i) => i.customerId))];
  const allActiveLoans = customerIds.length
    ? await prisma.loan.findMany({
        where: { customerId: { in: customerIds }, status: "active" },
        select: { id: true, customerId: true, contractNumber: true, masterTemplateId: true, createdAt: true },
        orderBy: { createdAt: "desc" },
      })
    : [];
  const loansByCustomer = new Map<string, typeof allActiveLoans>();
  for (const loan of allActiveLoans) {
    const list = loansByCustomer.get(loan.customerId) ?? [];
    list.push(loan);
    loansByCustomer.set(loan.customerId, list);
  }

  const assignedLoanIds = new Set<string>();

  for (const inst of instances) {
    stats.instancesScanned++;

    if (!inst.masterId) {
      pushOrphan(ORPHAN_REASON.INSTANCE_HAS_NO_MASTER, `mappingInstance:${inst.id}`, { customerId: inst.customerId });
      continue;
    }

    // Awareness only — log mapping diffs (Loan-level override was rejected, see brainstorm § 9 #3)
    if (inst.master) {
      const a = tryParseJson(inst.mappingJson);
      const b = tryParseJson(inst.master.fieldCatalogJson);
      if (a.ok && b.ok && !isDeepStrictEqual(a.value, b.value)) {
        stats.mappingDiffs++;
        verbose(`mapping diff: instance ${inst.id} (customer ${inst.customerId})`);
      }
    }

    const activeLoans = loansByCustomer.get(inst.customerId) ?? [];
    if (activeLoans.length === 0) {
      pushOrphan(ORPHAN_REASON.NO_ACTIVE_LOAN, `mappingInstance:${inst.id}`, {
        customerId: inst.customerId,
        masterId: inst.masterId,
      });
      continue;
    }

    const targetLoan = activeLoans[0];
    for (const skipped of activeLoans.slice(1)) {
      pushOrphan(ORPHAN_REASON.MULTIPLE_LOANS_OLDER_SKIPPED, `loan:${skipped.id}`, {
        customerId: skipped.customerId,
        contractNumber: skipped.contractNumber,
      });
    }

    if (targetLoan.masterTemplateId !== null) {
      stats.loansSkipped++;
      verbose(`skip loan ${targetLoan.id} (already has masterTemplateId)`);
      continue;
    }
    if (assignedLoanIds.has(targetLoan.id)) {
      pushOrphan(ORPHAN_REASON.LOAN_ALREADY_ASSIGNED, `mappingInstance:${inst.id}`, {
        customerId: inst.customerId,
        conflictLoanId: targetLoan.id,
      });
      continue;
    }

    if (!dryRun) {
      await prisma.loan.update({ where: { id: targetLoan.id }, data: { masterTemplateId: inst.masterId } });
    }
    assignedLoanIds.add(targetLoan.id);
    stats.loansUpdated++;
    verbose(`${dryRun ? "[would update]" : "[updated]"} loan ${targetLoan.id} → masterTemplateId=${inst.masterId}`);
  }

  // ─── Step B: manual_values.json → ALL orphans ───────────────────────
  log("\n[Step B] Processing manual_values.json...");
  if (existsSync(MANUAL_VALUES_PATH)) {
    const raw = readFileSync(MANUAL_VALUES_PATH, "utf8");
    const mv = JSON.parse(raw) as Record<string, unknown>;
    const keys = Object.keys(mv);
    log(`  Found ${keys.length} keys → all → orphans (per decision)`);
    for (const key of keys) {
      pushOrphan(ORPHAN_REASON.MANUAL_VALUES_NO_ATTRIBUTION, key, mv[key], "manual_values.json");
    }
  } else {
    log("  manual_values.json not found — skipping");
  }

  stats.orphansCount = orphans.length;
  return { stats, orphans };
}

// ─── Main ─────────────────────────────────────────────────────────────────

async function main(): Promise<number> {
  const dbUrl = process.env.DATABASE_URL;
  const dbKind = detectTarget(dbUrl);
  log("=".repeat(60));
  log(dryRun ? "  DRY RUN MODE — no changes will be written" : "  COMMIT MODE — DB writes ENABLED");
  log(`  Target: ${dbKind} (${dbUrl ? maskUrl(dbUrl) : "<unset>"})`);
  log("=".repeat(60));

  if (!dbUrl) abort("DATABASE_URL not set.");
  if (dbKind === "unknown") abort(`Cannot detect DB kind from DATABASE_URL: ${maskUrl(dbUrl)}`);
  if (flags.commit && dbKind === "turso") await confirmProd(dbUrl);

  if (flags.commit) {
    const backupPath = process.env.MIGRATION_BACKUP_PATH;
    if (!backupPath) abort("MIGRATION_BACKUP_PATH env not set. Required for --commit.");
    if (!existsSync(resolve(ROOT, backupPath))) {
      abort(`Backup file not found: ${backupPath}. Create one before committing.`);
    }
    log(`[ok] Backup verified: ${backupPath}`);
  }

  if (existsSync(COMPLETED_PATH) && !flags.force) {
    log("\nMigration already completed (migration-completed.json exists).");
    log("Use --force to override.");
    return 0;
  }

  const prisma = createPrisma(dbUrl, process.env.TURSO_AUTH_TOKEN);
  try {
    await prisma.loanReportExport.count();
    verbose("Prisma client has loanReportExport model");
  } catch (e) {
    await prisma.$disconnect();
    abort(`Prisma client missing Phase 1 model. Run 'npx prisma generate'. Detail: ${(e as Error).message}`);
  }

  let result;
  try {
    result = await runMigration(prisma);
  } catch (e) {
    err("Migration failed:", (e as Error).message);
    if (flags.verbose) console.error((e as Error).stack);
    return 1;
  } finally {
    await prisma.$disconnect();
  }

  // ─── Outputs ────────────────────────────────────────────────────────
  log("\n[Output] Writing files...");
  writeFileSync(ORPHANS_PATH, JSON.stringify(result.orphans, null, 2), "utf8");
  log(`  ✓ ${ORPHANS_PATH}`);

  const summary = {
    mode: dryRun ? "dry-run" : "commit",
    target: dbKind,
    timestamp: new Date().toISOString(),
    stats: result.stats,
  };
  writeFileSync(SUMMARY_PATH, JSON.stringify(summary, null, 2), "utf8");
  log(`  ✓ ${SUMMARY_PATH}`);

  if (!dryRun) {
    writeFileSync(COMPLETED_PATH, JSON.stringify(summary, null, 2), "utf8");
    log(`  ✓ ${COMPLETED_PATH}`);
  }

  log("\n" + "=".repeat(60));
  log("  SUMMARY");
  log("=".repeat(60));
  log(`  Mode:                 ${summary.mode}`);
  log(`  Instances scanned:    ${result.stats.instancesScanned}`);
  log(`  Loans ${dryRun ? "would update" : "updated"}:       ${result.stats.loansUpdated}`);
  log(`  Loans skipped (idemp):${result.stats.loansSkipped}`);
  log(`  Mapping diffs (info): ${result.stats.mappingDiffs}`);
  log(`  Orphans:              ${result.stats.orphansCount}`);
  log("=".repeat(60));

  if (result.orphans.length > 0) {
    warn(`Orphans file may contain PII: ${ORPHANS_PATH}`);
    warn("Ensure file stays in .gitignore and is reviewed manually.");
  }
  return 0;
}

main()
  .then((code) => process.exit(code))
  .catch((e) => {
    err("Unhandled error:", e);
    process.exit(1);
  });
