/**
 * scripts/migrate-mapping-config.ts
 *
 * Phase 6a — Backfill MasterTemplate.{defaultMappingJson, defaultAliasJson, formulasJson}
 * from MappingInstance + FS legacy files (field_formulas.json).
 *
 * Strategy per master:
 *   - mapping/alias: pick newest MappingInstance (by createdAt DESC) referencing this master
 *     via `Loan.masterTemplateId` chain. Extract instance.mappingJson + aliasJson.
 *   - formulas: read global report_assets/config/field_formulas.json (single source).
 *
 * Idempotent guard: skip masters where target field already non-empty (`{}` is empty).
 * Conflicts (multiple instances per master) logged to migration-conflicts-mapping.json.
 *
 * Pattern parallel scripts/migrate-report-data.ts.
 */
import { PrismaClient } from "@prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve, isAbsolute } from "node:path";
import { createInterface } from "node:readline";

type Conflict = {
  masterId: string;
  masterName: string;
  reason: string;
  pickedInstanceId?: string;
  skippedInstanceIds?: string[];
};

type Stats = {
  mastersScanned: number;
  mappingBackfilled: number;
  aliasBackfilled: number;
  formulasBackfilled: number;
  alreadyPopulated: number;
  noInstanceFound: number;
  conflicts: number;
};

// ─── Args ─────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const flags = {
  apply: args.includes("--apply"),
  verbose: args.includes("--verbose"),
  yes: args.includes("--yes"),
  force: args.includes("--force"),
};
const dryRun = !flags.apply;

// ─── Paths ────────────────────────────────────────────────────────────────

const ROOT = process.cwd();
const CONFLICTS_PATH = resolve(ROOT, "migration-conflicts-mapping.json");
const SUMMARY_PATH = resolve(ROOT, "migration-mapping-config-summary.json");
const COMPLETED_PATH = resolve(ROOT, "migration-mapping-config-completed.json");
const FIELD_FORMULAS_FS = resolve(ROOT, "report_assets/config/field_formulas.json");

const log = (...m: unknown[]) => console.log(...m);
const verbose = (...m: unknown[]) => flags.verbose && console.log("[verbose]", ...m);
const warn = (...m: unknown[]) => console.warn("[warn]", ...m);
const err = (...m: unknown[]) => console.error("[error]", ...m);

function abort(msg: string, code = 1): never {
  err(msg);
  process.exit(code);
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
    rl.question(`\n⚠️  APPLY to PROD: ${maskUrl(targetUrl)}\n   Type 'yes': `, (a) => {
      rl.close();
      res(a.trim());
    }),
  );
  if (answer !== "yes") abort("Confirmation declined.");
}

function createPrisma(dbUrl: string, authToken?: string): PrismaClient {
  let url = dbUrl;
  if (url.startsWith("file:")) {
    const p = url.slice(5);
    if (!isAbsolute(p)) url = `file:${resolve(process.cwd(), p)}`;
  }
  return new PrismaClient({ adapter: new PrismaLibSql({ url, authToken }) });
}

function isEmptyJson(s: string | null | undefined): boolean {
  if (!s) return true;
  const trimmed = s.trim();
  return trimmed === "" || trimmed === "{}" || trimmed === "[]";
}

// ─── Main backfill ────────────────────────────────────────────────────────

async function runBackfill(prisma: PrismaClient): Promise<{ stats: Stats; conflicts: Conflict[] }> {
  const stats: Stats = {
    mastersScanned: 0,
    mappingBackfilled: 0,
    aliasBackfilled: 0,
    formulasBackfilled: 0,
    alreadyPopulated: 0,
    noInstanceFound: 0,
    conflicts: 0,
  };
  const conflicts: Conflict[] = [];

  // Read global field formulas (single FS source)
  let globalFormulas: Record<string, string> = {};
  if (existsSync(FIELD_FORMULAS_FS)) {
    try {
      globalFormulas = JSON.parse(readFileSync(FIELD_FORMULAS_FS, "utf8"));
      log(`  Loaded ${Object.keys(globalFormulas).length} global formulas from FS`);
    } catch (e) {
      warn(`Failed to parse ${FIELD_FORMULAS_FS}: ${(e as Error).message}`);
    }
  } else {
    log(`  No ${FIELD_FORMULAS_FS} — formulas backfill empty`);
  }
  const formulasJson = JSON.stringify(globalFormulas);

  const masters = await prisma.masterTemplate.findMany({
    select: {
      id: true,
      name: true,
      defaultMappingJson: true,
      defaultAliasJson: true,
      formulasJson: true,
    },
  });
  log(`  Found ${masters.length} MasterTemplate rows`);

  for (const m of masters) {
    stats.mastersScanned++;

    // Find newest MappingInstance referencing this master
    const instances = await prisma.mappingInstance.findMany({
      where: { masterId: m.id },
      select: { id: true, createdAt: true, mappingJson: true, aliasJson: true },
      orderBy: { createdAt: "desc" },
    });

    const updates: Record<string, string> = {};

    if (isEmptyJson(m.defaultMappingJson) || isEmptyJson(m.defaultAliasJson)) {
      if (instances.length === 0) {
        stats.noInstanceFound++;
        verbose(`master ${m.id} (${m.name}) has no instance — skip mapping/alias`);
      } else {
        const target = instances[0]; // newest
        if (instances.length > 1) {
          stats.conflicts++;
          conflicts.push({
            masterId: m.id,
            masterName: m.name,
            reason: "multi_instance_picked_newest",
            pickedInstanceId: target.id,
            skippedInstanceIds: instances.slice(1).map((i) => i.id),
          });
        }
        if (target.mappingJson && isEmptyJson(m.defaultMappingJson)) {
          updates.defaultMappingJson = target.mappingJson;
          stats.mappingBackfilled++;
        }
        if (target.aliasJson && isEmptyJson(m.defaultAliasJson)) {
          updates.defaultAliasJson = target.aliasJson;
          stats.aliasBackfilled++;
        }
      }
    } else {
      stats.alreadyPopulated++;
      verbose(`master ${m.id} already has mapping/alias — skip`);
    }

    // Formulas: apply global only if master is empty
    if (isEmptyJson(m.formulasJson) && Object.keys(globalFormulas).length > 0) {
      updates.formulasJson = formulasJson;
      stats.formulasBackfilled++;
    }

    if (Object.keys(updates).length === 0) continue;

    if (!dryRun) {
      await prisma.masterTemplate.update({ where: { id: m.id }, data: updates });
    }
    verbose(`${dryRun ? "[would update]" : "[updated]"} master ${m.id} keys=${Object.keys(updates).join(",")}`);
  }

  return { stats, conflicts };
}

// ─── Main entry ───────────────────────────────────────────────────────────

async function main(): Promise<number> {
  const dbUrl = process.env.DATABASE_URL;
  const dbKind = detectTarget(dbUrl);
  log("=".repeat(60));
  log(dryRun ? "  DRY RUN MODE — no DB writes" : "  APPLY MODE — DB writes ENABLED");
  log(`  Target: ${dbKind} (${dbUrl ? maskUrl(dbUrl) : "<unset>"})`);
  log("=".repeat(60));

  if (!dbUrl) abort("DATABASE_URL not set.");
  if (dbKind === "unknown") abort(`Cannot detect DB kind from DATABASE_URL: ${maskUrl(dbUrl)}`);
  if (flags.apply && dbKind === "turso") await confirmProd(dbUrl);

  if (flags.apply) {
    const backupPath = process.env.MIGRATION_BACKUP_PATH;
    if (!backupPath) abort("MIGRATION_BACKUP_PATH env not set. Required for --apply.");
    if (!existsSync(resolve(ROOT, backupPath))) abort(`Backup file not found: ${backupPath}.`);
    log(`[ok] Backup verified: ${backupPath}`);
  }

  if (existsSync(COMPLETED_PATH) && !flags.force) {
    log("\nMigration already completed. Use --force to override.");
    return 0;
  }

  const prisma = createPrisma(dbUrl, process.env.TURSO_AUTH_TOKEN);
  let result;
  try {
    log("\n[Backfill] Scanning MasterTemplate rows...");
    result = await runBackfill(prisma);
  } catch (e) {
    err("Backfill failed:", (e as Error).message);
    if (flags.verbose) console.error((e as Error).stack);
    return 1;
  } finally {
    await prisma.$disconnect();
  }

  log("\n[Output] Writing files...");
  writeFileSync(CONFLICTS_PATH, JSON.stringify(result.conflicts, null, 2), "utf8");
  log(`  ✓ ${CONFLICTS_PATH}`);

  const summary = {
    mode: dryRun ? "dry-run" : "apply",
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
  log(`  Masters scanned:            ${result.stats.mastersScanned}`);
  log(`  Mapping ${dryRun ? "would backfill" : "backfilled"}:   ${result.stats.mappingBackfilled}`);
  log(`  Alias ${dryRun ? "would backfill" : "backfilled"}:     ${result.stats.aliasBackfilled}`);
  log(`  Formulas ${dryRun ? "would backfill" : "backfilled"}:  ${result.stats.formulasBackfilled}`);
  log(`  Already populated (skip):   ${result.stats.alreadyPopulated}`);
  log(`  No instance found:          ${result.stats.noInstanceFound}`);
  log(`  Multi-instance conflicts:   ${result.stats.conflicts}`);
  log("=".repeat(60));

  if (result.conflicts.length > 0) {
    warn(`Conflicts file: ${CONFLICTS_PATH} — review picks if needed.`);
  }
  return 0;
}

main()
  .then((code) => process.exit(code))
  .catch((e) => {
    err("Unhandled error:", e);
    process.exit(1);
  });
