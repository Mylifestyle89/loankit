/**
 * master-source.ts — DB-only resolver for master-template-scoped report config.
 *
 * Returns mapping + alias map parsed from `MasterTemplate` columns. Caller
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
    select: {
      masterTemplateId: true,
      masterTemplate: {
        select: {
          id: true,
          defaultMappingJson: true,
          defaultAliasJson: true,
          formulasJson: true,
          updatedAt: true,
        },
      },
    },
  });
  if (!loan) throw new NotFoundError(`Loan ${loanId} not found.`);
  if (!loan.masterTemplate) {
    throw new NotFoundError(`Loan ${loanId} has no master template assigned.`);
  }
  const m = loan.masterTemplate;
  return {
    masterTemplateId: m.id,
    loanId,
    mapping: parseMappingJson(m.defaultMappingJson),
    aliasMap: parseAliasJson(m.defaultAliasJson),
    mappingJson: m.defaultMappingJson,
    aliasJson: m.defaultAliasJson,
    formulasJson: m.formulasJson,
    mappingUpdatedAt: m.updatedAt.toISOString(),
  };
}

/**
 * Boundary helper: translate `mappingInstanceId` to both `masterTemplateId`
 * and `loanId`. Either field may be null on orphan rows.
 */
export async function masterAndLoanFromMappingInstance(
  mappingInstanceId: string,
): Promise<{ masterTemplateId: string | null; loanId: string | null }> {
  const inst = await prisma.mappingInstance.findUnique({
    where: { id: mappingInstanceId },
    select: { masterId: true, loanId: true },
  });
  return {
    masterTemplateId: inst?.masterId ?? null,
    loanId: inst?.loanId ?? null,
  };
}

/** Resolve the master template id from a loan (null if loan or assignment missing). */
export async function masterIdFromLoan(loanId: string): Promise<string | null> {
  const loan = await prisma.loan.findUnique({
    where: { id: loanId },
    select: { masterTemplateId: true },
  });
  return loan?.masterTemplateId ?? null;
}
