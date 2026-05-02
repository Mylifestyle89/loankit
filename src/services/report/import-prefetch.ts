/**
 * import-prefetch — pre-fetch all lookups needed before import loop.
 * Avoids N+1 reads inside the transaction.
 */
import type { Prisma } from "@prisma/client";

import { hashCustomerCode } from "@/lib/field-encryption";

import type { ImportV2CustomerRecord } from "./import-types";

export interface PrefetchMaps {
  customerMap: Map<string, { id: string; customer_code: string }>;
  loanMap: Map<string, { id: string; customerId: string; contractNumber: string }>;
  benMap: Map<string, { id: string; loanId: string; name: string; accountNumber: string | null }>;
  invoiceMap: Map<string, { id: string }>;
}

export async function prefetchImportMaps(
  tx: Prisma.TransactionClient,
  customersInput: ImportV2CustomerRecord[],
  isV2: boolean,
): Promise<PrefetchMaps> {
  // --- Collect all keys up-front (no DB calls yet) ---
  const allCustomerCodes = customersInput.map((c) => c.customer_code).filter(Boolean);
  const plainToHash = new Map(allCustomerCodes.map((code) => [code, hashCustomerCode(code)]));
  const allHashes = Array.from(plainToHash.values());

  const allContractNumbers = customersInput
    .flatMap((c) => (isV2 && Array.isArray(c.loans) ? c.loans.map((l) => l.contractNumber) : []))
    .filter(Boolean);

  const allBenNames = customersInput
    .flatMap((c) =>
      isV2 && Array.isArray(c.loans)
        ? c.loans.flatMap((l) => (l.beneficiaries ?? []).map((b) => b.name))
        : [],
    )
    .filter(Boolean);

  // NOTE: invoiceMap is intentionally NOT pre-fetched.
  // Disbursements are wiped+recreated on each import (cascade-deletes their invoices),
  // so pre-fetching old invoice IDs would cause stale-ID collisions across loans.

  // --- Fire 3 lookups in parallel (invoices skipped — see note above) ---
  const [existingCustomers, existingLoans, existingBens] = await Promise.all([
    tx.customer.findMany({
      where: { customer_code_hash: { in: allHashes } },
      select: { id: true, customer_code_hash: true },
    }),
    allContractNumbers.length
      ? tx.loan.findMany({
          where: { contractNumber: { in: allContractNumbers } },
          select: { id: true, customerId: true, contractNumber: true },
        })
      : Promise.resolve([]),
    allBenNames.length
      ? tx.beneficiary.findMany({
          where: { name: { in: allBenNames } },
          select: { id: true, loanId: true, name: true, accountNumber: true },
        })
      : Promise.resolve([]),
  ]);

  // --- Build maps ---
  const byHash = new Map(existingCustomers.map((c) => [c.customer_code_hash, c]));
  const customerMap = new Map<string, { id: string; customer_code: string }>();
  for (const [plain, hash] of plainToHash) {
    const row = byHash.get(hash);
    if (row) customerMap.set(plain, { id: row.id, customer_code: plain });
  }

  const loanMap = new Map(existingLoans.map((l) => [`${l.customerId}_${l.contractNumber}`, l]));

  const benMap = new Map(
    existingBens.map((b) => [`${b.loanId}_${b.name}_${b.accountNumber ?? ""}`, b]),
  );

  // invoiceMap is always empty — invoices are created fresh per disbursement after wipe+recreate
  const invoiceMap = new Map<string, { id: string }>();

  return { customerMap, loanMap, benMap, invoiceMap };
}
