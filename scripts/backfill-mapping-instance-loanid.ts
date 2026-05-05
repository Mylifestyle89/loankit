/**
 * scripts/backfill-mapping-instance-loanid.ts
 *
 * Phase 3.5 — Backfill MappingInstance.loanId via heuristic.
 *
 * Strategy per row (where loanId IS NULL):
 *   - Find active loans for instance.customerId
 *   - 1 loan  → assign instance.loanId = loan.id
 *   - N loans → assign newest by createdAt DESC + log "ambiguous"
 *   - 0 loans → leave loanId null + log "no_active_loan"
 *
 * Idempotent: skip rows where loanId IS NOT NULL.
 *
 * Pattern parallel scripts/migrate-report-data.ts.
 */
import { PrismaClient } from "@prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import { existsSync, writeFileSync } from "node:fs";
import { resolve, isAbsolute } from "node:path";
import { createInterface } from "node:readline";

// ─── Constants ────────────────────────────────────────────────────────────

const ORPHAN_REASON = {
  AMBIGUOUS_MULTI_LOAN: "ambiguous_multi_loan_assigned_newest",
  NO_ACTIVE_LOAN: "no_active_loan_for_customer",
} as const;
type OrphanReason = (typeof ORPHAN_REASON)[keyof typeof ORPHAN_REASON];

type OrphanRecord = {
  instanceId: string;
  customerId: string;
  reason: OrphanReason;
  assignedLoanId?: string;
  candidateLoanIds?: string[];
};

type Stats = {
  scanned: number;
  assigned: number;
  ambiguousAssigned: number;
  noLoanOrphans: number;
  skippedAlreadyHasLoanId: number;
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
const limitArg = args.find((a) => a.startsWith("--limit="));
const limit = limitArg ? parseInt(limitArg.slice("--limit=".length), 10) : undefined;

// ─── Paths ────────────────────────────────────────────────────────────────

const ROOT = process.cwd();
const ORPHANS_PATH = resolve(ROOT, "migration-loanid-backfill-orphans.json");
const SUMMARY_PATH = resolve(ROOT, "migration-loanid-backfill-summary.json");
const COMPLETED_PATH = resolve(ROOT, "migration-loanid-backfill-completed.json");

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

function createPrisma(dbUrl: string, authToken?: string): PrismaClient {
  let url = dbUrl;
  if (url.startsWith("file:")) {
    const p = url.slice(5);
    if (!isAbsolute(p)) url = `file:${resolve(process.cwd(), p)}`;
  }
  return new PrismaClient({ adapter: new PrismaLibSql({ url, authToken }) });
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
    rl.question(`\n⚠️  COMMIT to PROD: ${maskUrl(targetUrl)}\n   Type 'yes': `, (a) => {
      rl.close();
      res(a.trim());
    }),
  );
  if (answer !== "yes") abort("Confirmation declined.");
}

// ─── Migration core ───────────────────────────────────────────────────────

async function runBackfill(prisma: PrismaClient): Promise<{ stats: Stats; orphans: OrphanRecord[] }> {
  const stats: Stats = { scanned: 0, assigned: 0, ambiguousAssigned: 0, noLoanOrphans: 0, skippedAlreadyHasLoanId: 0 };
  const orphans: OrphanRecord[] = [];

  // Pre-fetch instances needing backfill (loanId IS NULL)
  const instances = await prisma.mappingInstance.findMany({
    where: { loanId: null },
    select: { id: true, customerId: true },
    take: limit,
  });
  log(`  Found ${instances.length} MappingInstance rows with loanId=null${limit ? ` (limit=${limit})` : ""}`);

  // Pre-fetch active loans grouped by customer (avoid N+1 on Turso)
  const customerIds = [...new Set(instances.map((i) => i.customerId))];
  const allActiveLoans = customerIds.length
    ? await prisma.loan.findMany({
        where: { customerId: { in: customerIds }, status: "active" },
        select: { id: true, customerId: true, createdAt: true },
        orderBy: { createdAt: "desc" },
      })
    : [];
  const loansByCustomer = new Map<string, typeof allActiveLoans>();
  for (const loan of allActiveLoans) {
    const list = loansByCustomer.get(loan.customerId) ?? [];
    list.push(loan);
    loansByCustomer.set(loan.customerId, list);
  }

  for (const inst of instances) {
    stats.scanned++;
    const candidates = loansByCustomer.get(inst.customerId) ?? [];

    if (candidates.length === 0) {
      stats.noLoanOrphans++;
      orphans.push({
        instanceId: inst.id,
        customerId: inst.customerId,
        reason: ORPHAN_REASON.NO_ACTIVE_LOAN,
      });
      continue;
    }

    const target = candidates[0]; // newest
    if (candidates.length > 1) {
      stats.ambiguousAssigned++;
      orphans.push({
        instanceId: inst.id,
        customerId: inst.customerId,
        reason: ORPHAN_REASON.AMBIGUOUS_MULTI_LOAN,
        assignedLoanId: target.id,
        candidateLoanIds: candidates.map((c) => c.id),
      });
    } else {
      stats.assigned++;
    }

    if (!dryRun) {
      await prisma.mappingInstance.update({
        where: { id: inst.id },
        data: { loanId: target.id },
      });
    }
    verbose(`${dryRun ? "[would assign]" : "[assigned]"} instance ${inst.id} → loan ${target.id}`);
  }

  // Count rows already having loanId (informational)
  stats.skippedAlreadyHasLoanId = await prisma.mappingInstance.count({ where: { loanId: { not: null } } });

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
      abort(`Backup file not found: ${backupPath}.`);
    }
    log(`[ok] Backup verified: ${backupPath}`);
  }

  if (existsSync(COMPLETED_PATH) && !flags.force) {
    log("\nBackfill already completed. Use --force to override.");
    return 0;
  }

  const prisma = createPrisma(dbUrl, process.env.TURSO_AUTH_TOKEN);
  let result;
  try {
    log("\n[Backfill] Scanning MappingInstance rows...");
    result = await runBackfill(prisma);
  } catch (e) {
    err("Backfill failed:", (e as Error).message);
    if (flags.verbose) console.error((e as Error).stack);
    return 1;
  } finally {
    await prisma.$disconnect();
  }

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
  log(`  Mode:                       ${summary.mode}`);
  log(`  Scanned (loanId=null):      ${result.stats.scanned}`);
  log(`  ${dryRun ? "Would assign" : "Assigned"} (1 loan):       ${result.stats.assigned}`);
  log(`  Ambiguous (multi → newest): ${result.stats.ambiguousAssigned}`);
  log(`  Orphans (no active loan):   ${result.stats.noLoanOrphans}`);
  log(`  Skipped (already has loanId): ${result.stats.skippedAlreadyHasLoanId}`);
  log("=".repeat(60));

  const total = result.stats.scanned + result.stats.skippedAlreadyHasLoanId;
  const haveLoan = result.stats.assigned + result.stats.ambiguousAssigned + result.stats.skippedAlreadyHasLoanId;
  if (total > 0) {
    const pct = ((haveLoan / total) * 100).toFixed(1);
    log(`  Coverage post-backfill: ${pct}% (target ≥80%)`);
    if (parseFloat(pct) < 80) warn(`Coverage ${pct}% below target — review orphans before Phase 4 full.`);
  }

  if (result.orphans.length > 0) {
    warn(`Orphans file may contain internal IDs: ${ORPHANS_PATH}`);
    warn("File gitignored — keep local. Review ambiguous assignments manually if needed.");
  }
  return 0;
}

main()
  .then((code) => process.exit(code))
  .catch((e) => {
    err("Unhandled error:", e);
    process.exit(1);
  });
