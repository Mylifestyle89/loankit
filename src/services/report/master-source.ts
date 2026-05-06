/**
 * master-source.ts — DB-only resolver for master-template-scoped report config.
 *
 * Phase 6 replacement for `_migration-internals.resolveMappingSource`. Returns
 * mapping + alias map parsed from `MasterTemplate` columns; no FS reads. Caller
 * supplies either a `loanId` (resolves master via `loan.masterTemplateId`) or a
 * `masterTemplateId` directly (for template-scoped flows like the mapping page).
 */
import { NotFoundError } from "@/core/errors/app-error";
import { prisma } from "@/lib/prisma";
import { parseAliasJson, parseMappingJson } from "@/lib/report/fs-store-mapping-io";
import type { AliasMap, MappingMaster } from "@/lib/report/config-schema";

export type MasterSource = {
  masterTemplateId: string;
  loanId: string | null;
  mapping: MappingMaster;
  aliasMap: AliasMap;
  /** Raw JSON string — useful for callers that need to forward to docx engine. */
  mappingJson: string;
  aliasJson: string;
  formulasJson: string;
  /** ISO timestamp from MasterTemplate.updatedAt — drives build freshness. */
  mappingUpdatedAt: string;
};

export async function resolveMasterSourceById(
  masterTemplateId: string,
  loanId: string | null = null,
): Promise<MasterSource> {
  const master = await prisma.masterTemplate.findUnique({
    where: { id: masterTemplateId },
    select: {
      id: true,
      defaultMappingJson: true,
      defaultAliasJson: true,
      formulasJson: true,
      updatedAt: true,
    },
  });
  if (!master) throw new NotFoundError(`Master template ${masterTemplateId} not found.`);
  return {
    masterTemplateId: master.id,
    loanId,
    mapping: parseMappingJson(master.defaultMappingJson),
    aliasMap: parseAliasJson(master.defaultAliasJson),
    mappingJson: master.defaultMappingJson,
    aliasJson: master.defaultAliasJson,
    formulasJson: master.formulasJson,
    mappingUpdatedAt: master.updatedAt.toISOString(),
  };
}

export async function resolveMasterSourceByLoan(loanId: string): Promise<MasterSource> {
  const loan = await prisma.loan.findUnique({
    where: { id: loanId },
    select: { masterTemplateId: true },
  });
  if (!loan) throw new NotFoundError(`Loan ${loanId} not found.`);
  if (!loan.masterTemplateId) {
    throw new NotFoundError(`Loan ${loanId} has no master template assigned.`);
  }
  return resolveMasterSourceById(loan.masterTemplateId, loanId);
}

/**
 * Boundary helper: translate a legacy `mappingInstanceId` to a `loanId` so
 * callers can route to the master-centric path. Returns `null` when the
 * instance has no linked loan (orphan) — caller decides how to fallback.
 */
export async function loanIdFromMappingInstance(
  mappingInstanceId: string,
): Promise<string | null> {
  const inst = await prisma.mappingInstance.findUnique({
    where: { id: mappingInstanceId },
    select: { loanId: true },
  });
  return inst?.loanId ?? null;
}
