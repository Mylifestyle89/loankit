/**
 * shared-cursor-utils.ts
 * Cursor-based batch generators for large dataset iteration without RAM overflow.
 * Extracted from _shared.ts to keep that module under 200 LOC.
 */

import type { Customer, Prisma } from "@prisma/client";
import { decryptCustomerPii } from "@/lib/field-encryption";
import { prisma } from "@/lib/prisma";

// ---------------------------------------------------------------------------
// Cursor-based customer batch generator
// ---------------------------------------------------------------------------

export async function* customerBatches(
  where?: Prisma.CustomerWhereInput,
  batchSize = 500,
): AsyncGenerator<Customer[]> {
  let cursorId: string | undefined = undefined;

  while (true) {
    const rows: Customer[] = await prisma.customer.findMany({
      where,
      orderBy: { id: "asc" },
      take: batchSize,
      ...(cursorId ? { skip: 1, cursor: { id: cursorId } } : {}),
    });

    if (rows.length === 0) break;

    yield rows.map(decryptCustomerPii);
    cursorId = rows[rows.length - 1].id;
  }
}
