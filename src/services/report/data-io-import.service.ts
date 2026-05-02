/**
 * data-io-import.service — orchestrates JSON import into the database.
 *
 * Public API is preserved at this path for backward compatibility.
 * Heavy lifting is split into:
 *   - import-types.ts         — shared type definitions
 *   - import-prefetch.ts      — pre-fetch lookup maps (avoids N+1 reads)
 *   - import-customer-upsert.ts — customer upsert logic
 *   - import-relations-create.ts — createMany for relations + loan tree
 */
import { z } from "zod";

import { ValidationError } from "@/core/errors/app-error";
import { prisma } from "@/lib/prisma";
import { loadState, saveState } from "@/lib/report/fs-store";

import type { ImportTemplateRecord } from "./_shared";
import { upsertCustomer } from "./import-customer-upsert";
import { prefetchImportMaps } from "./import-prefetch";
import {
  createCustomerRelations,
  createLoanTree,
} from "./import-relations-create";
import type { ImportV2CustomerRecord } from "./import-types";

// ---------------------------------------------------------------------------
// Re-export types so callers that import from this path continue to work
// ---------------------------------------------------------------------------
export type {
  ImportBeneficiaryRecord,
  ImportDisbursementBeneficiaryRecord,
  ImportDisbursementRecord,
  ImportInvoiceRecord,
  ImportLoanRecord,
  ImportV2CustomerRecord,
} from "./import-types";

// ---------------------------------------------------------------------------
// Zod: validate top-level import payload shape (A-I7)
// ---------------------------------------------------------------------------
const importPayloadSchema = z.object({
  version: z.union([z.string(), z.number()]),
  customers: z.array(z.record(z.string(), z.unknown())),
  field_templates: z.array(z.record(z.string(), z.unknown())),
});

// ---------------------------------------------------------------------------
// importData — public entry point
// ---------------------------------------------------------------------------
export async function importData(input: {
  version?: unknown;
  customers?: unknown[];
  field_templates?: unknown[];
}) {
  const parsed = importPayloadSchema.safeParse(input);
  if (!parsed.success) {
    throw new ValidationError("Định dạng file không hợp lệ");
  }

  const { version, customers: customersRaw, field_templates: fieldTemplatesRaw } = parsed.data;
  const isV2 = String(version).startsWith("2");
  const customersInput = customersRaw as ImportV2CustomerRecord[];
  const fieldTemplatesInput = fieldTemplatesRaw as ImportTemplateRecord[];

  let customersImported = 0;
  let loansImported = 0;
  let disbursementsImported = 0;
  let invoicesImported = 0;

  await prisma.$transaction(async (tx) => {
    // 1. Pre-fetch all lookup maps in bulk (avoids N+1 reads)
    const maps = await prefetchImportMaps(tx, customersInput, isV2);

    // 2. Process each customer sequentially (writes are fast in SQLite)
    for (const customerRaw of customersInput) {
      const customerId = await upsertCustomer(tx, customerRaw, maps.customerMap);
      customersImported++;

      // 3. Bulk-create flat relations via createMany (A-I4)
      await createCustomerRelations(tx, customerId, customerRaw as Record<string, unknown>);

      // 4. V2: upsert loan tree
      if (isV2) {
        const counts = await createLoanTree(tx, customerId, customerRaw, maps);
        loansImported += counts.loansImported;
        disbursementsImported += counts.disbursementsImported;
        invoicesImported += counts.invoicesImported;
      }
    }
  });

  // 5. Merge field templates into fs-store state (outside transaction — fs op)
  const state = await loadState();
  const existingTemplatesMap = new Map(
    (state.field_templates ?? []).map((t) => [t.id, t]),
  );
  for (const tpl of fieldTemplatesInput) {
    existingTemplatesMap.set(tpl.id, tpl);
  }
  state.field_templates = Array.from(existingTemplatesMap.values());
  await saveState(state);

  return {
    customers: customersImported,
    templates: fieldTemplatesInput.length,
    loans: loansImported,
    disbursements: disbursementsImported,
    invoices: invoicesImported,
  };
}
