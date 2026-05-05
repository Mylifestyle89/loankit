/**
 * values.service.ts — CRUD facade for report module values (Phase 3).
 *
 * Manages Customer.customerProfileValuesJson (shared) + Loan.dossierValuesJson (per-loan).
 * Storage: full JSON blob encrypted-at-rest (AES-256-GCM via field-encryption).
 * Plaintext fallback for legacy data from Phase 2 backfill.
 *
 * See plans/260505-1007-phase1-migrate-report-data-layer/phase-03-create-values-service.md
 */
import { Prisma } from "@prisma/client";

import { ConflictError, NotFoundError, ValidationError } from "@/core/errors/app-error";
import { decryptIfEncrypted, encryptField } from "@/lib/field-encryption";
import { prisma } from "@/lib/prisma";
import { valuesRecordSchema, type ValuesRecord } from "@/lib/report/values-schema";

/** Decrypt → JSON.parse → Zod validate. Returns {} on any failure (with warn log).
 *  Plaintext input passes through (legacy backfill data). */
function parseEncryptedValuesJson(stored: string | null | undefined): ValuesRecord {
  if (!stored || stored === "{}") return {};
  let plaintext: string | null;
  try {
    plaintext = decryptIfEncrypted(stored);
  } catch (e) {
    console.warn("[values.service] decrypt failed:", (e as Error).message);
    return {};
  }
  if (!plaintext) return {};
  let parsed: unknown;
  try {
    parsed = JSON.parse(plaintext);
  } catch (e) {
    console.warn("[values.service] JSON.parse failed:", (e as Error).message);
    return {};
  }
  const result = valuesRecordSchema.safeParse(parsed);
  if (!result.success) {
    console.warn("[values.service] Zod validate failed:", result.error.issues.map((i) => i.path.join(".")).join(","));
    return {};
  }
  return result.data;
}

/** Validate (throw on bad shape) → JSON.stringify → encrypt. */
function stringifyAndEncryptValues(values: unknown): string {
  const result = valuesRecordSchema.safeParse(values);
  if (!result.success) {
    throw new ValidationError(`Invalid values shape: ${result.error.issues.map((i) => i.path.join(".")).join(", ")}`);
  }
  return encryptField(JSON.stringify(result.data));
}

type SaveOpts = { expectedUpdatedAt?: Date };

/** Atomic optimistic-lock update via updateMany (composite WHERE).
 *  Happy path = 1 round-trip. On conflict, disambiguate not-found vs stale via 1 extra read. */
async function atomicUpdate(
  entity: "customer" | "loan",
  id: string,
  fieldKey: "customerProfileValuesJson" | "dossierValuesJson",
  encrypted: string,
  opts: SaveOpts,
): Promise<void> {
  const where: Prisma.CustomerWhereInput | Prisma.LoanWhereInput = opts.expectedUpdatedAt
    ? { id, updatedAt: opts.expectedUpdatedAt }
    : { id };
  const result =
    entity === "customer"
      ? await prisma.customer.updateMany({ where: where as Prisma.CustomerWhereInput, data: { [fieldKey]: encrypted } })
      : await prisma.loan.updateMany({ where: where as Prisma.LoanWhereInput, data: { [fieldKey]: encrypted } });

  if (result.count > 0) return;

  // Disambiguate: row missing or just stale?
  const exists =
    entity === "customer"
      ? await prisma.customer.findUnique({ where: { id }, select: { id: true } })
      : await prisma.loan.findUnique({ where: { id }, select: { id: true } });
  if (!exists) throw new NotFoundError(`${entity === "customer" ? "Customer" : "Loan"} ${id} not found.`);
  throw new ConflictError("Record was modified by another writer.");
}

// ─── Customer profile (shared across all loans) ───────────────────────────

async function getCustomerProfile(customerId: string): Promise<ValuesRecord> {
  const row = await prisma.customer.findUnique({
    where: { id: customerId },
    select: { customerProfileValuesJson: true },
  });
  if (!row) throw new NotFoundError(`Customer ${customerId} not found.`);
  return parseEncryptedValuesJson(row.customerProfileValuesJson);
}

async function saveCustomerProfile(customerId: string, values: ValuesRecord, opts: SaveOpts = {}): Promise<void> {
  await atomicUpdate("customer", customerId, "customerProfileValuesJson", stringifyAndEncryptValues(values), opts);
}

/** Read + shallow merge + atomic save. 2 RT, optimistic-locked even when caller omits opts. */
async function patchCustomerProfile(
  customerId: string,
  partial: ValuesRecord,
  opts: SaveOpts = {},
): Promise<ValuesRecord> {
  const row = await prisma.customer.findUnique({
    where: { id: customerId },
    select: { customerProfileValuesJson: true, updatedAt: true },
  });
  if (!row) throw new NotFoundError(`Customer ${customerId} not found.`);
  const current = parseEncryptedValuesJson(row.customerProfileValuesJson);
  const merged = { ...current, ...partial };
  // If caller passed expectedUpdatedAt, honor it; else use just-read snapshot for parallel-write guard.
  const lockOpts: SaveOpts = { expectedUpdatedAt: opts.expectedUpdatedAt ?? row.updatedAt };
  await saveCustomerProfile(customerId, merged, lockOpts);
  return merged;
}

// ─── Dossier values (per-loan) ────────────────────────────────────────────

async function getDossierValues(loanId: string): Promise<ValuesRecord> {
  const row = await prisma.loan.findUnique({
    where: { id: loanId },
    select: { dossierValuesJson: true },
  });
  if (!row) throw new NotFoundError(`Loan ${loanId} not found.`);
  return parseEncryptedValuesJson(row.dossierValuesJson);
}

async function saveDossierValues(loanId: string, values: ValuesRecord, opts: SaveOpts = {}): Promise<void> {
  await atomicUpdate("loan", loanId, "dossierValuesJson", stringifyAndEncryptValues(values), opts);
}

async function patchDossierValues(
  loanId: string,
  partial: ValuesRecord,
  opts: SaveOpts = {},
): Promise<ValuesRecord> {
  const row = await prisma.loan.findUnique({
    where: { id: loanId },
    select: { dossierValuesJson: true, updatedAt: true },
  });
  if (!row) throw new NotFoundError(`Loan ${loanId} not found.`);
  const current = parseEncryptedValuesJson(row.dossierValuesJson);
  const merged = { ...current, ...partial };
  const lockOpts: SaveOpts = { expectedUpdatedAt: opts.expectedUpdatedAt ?? row.updatedAt };
  await saveDossierValues(loanId, merged, lockOpts);
  return merged;
}

// ─── Merged for export ────────────────────────────────────────────────────

/** Single-query load loan + customer profile, decrypt both, shallow merge.
 *  Dossier values override customer profile on key conflict.
 *  Audit logging deferred to Phase 5 when DOCX export pipeline wires up. */
async function getMergedValuesForExport(loanId: string): Promise<ValuesRecord> {
  const loan = await prisma.loan.findUnique({
    where: { id: loanId },
    select: {
      dossierValuesJson: true,
      customer: { select: { customerProfileValuesJson: true } },
    },
  });
  if (!loan) throw new NotFoundError(`Loan ${loanId} not found.`);

  const customerProfile = parseEncryptedValuesJson(loan.customer.customerProfileValuesJson);
  const dossier = parseEncryptedValuesJson(loan.dossierValuesJson);
  return { ...customerProfile, ...dossier };
}

export const valuesService = {
  getCustomerProfile,
  saveCustomerProfile,
  patchCustomerProfile,
  getDossierValues,
  saveDossierValues,
  patchDossierValues,
  getMergedValuesForExport,
};

// Exported for unit tests covering the codec layer in isolation.
export { parseEncryptedValuesJson, stringifyAndEncryptValues };
