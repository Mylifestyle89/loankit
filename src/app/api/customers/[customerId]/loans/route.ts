import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, handleAuthError } from "@/lib/auth-guard";

export const runtime = "nodejs";

/**
 * GET /api/customers/[customerId]/loans
 *
 * Returns all loans for a customer, with associated master template info.
 * Used by the mapping UI to:
 *   - Derive customer-scoped template list (Q1-b: distinct masterTemplateId)
 *   - Resolve newest-active loan heuristic (Q3-b)
 *   - Show loan count in assign-master confirm dialog (Q4-a)
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: { customerId: string } },
) {
  try {
    await requireSession();
  } catch (e) {
    return handleAuthError(e);
  }

  const { customerId } = params;
  if (!customerId) {
    return NextResponse.json({ ok: false, error: "customerId required" }, { status: 400 });
  }

  try {
    const loans = await prisma.loan.findMany({
      where: { customerId },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        contractNumber: true,
        status: true,
        createdAt: true,
        masterTemplateId: true,
        masterTemplate: {
          select: {
            id: true,
            name: true,
            fieldCatalogJson: true,
          },
        },
      },
    });

    return NextResponse.json({
      ok: true,
      loans: loans.map((loan) => ({
        id: loan.id,
        contractNumber: loan.contractNumber,
        status: loan.status,
        createdAt: loan.createdAt.toISOString(),
        masterTemplateId: loan.masterTemplateId ?? null,
        masterTemplateName: loan.masterTemplate?.name ?? null,
        // fieldCatalogJson is stored as a JSON string — parse it for the UI
        masterTemplateFieldCatalog: loan.masterTemplate?.fieldCatalogJson
          ? (() => {
              try {
                return JSON.parse(loan.masterTemplate.fieldCatalogJson) as unknown[];
              } catch {
                return [];
              }
            })()
          : null,
      })),
    });
  } catch (e) {
    console.error("[GET /api/customers/[customerId]/loans]", e);
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "Internal error" },
      { status: 500 },
    );
  }
}
