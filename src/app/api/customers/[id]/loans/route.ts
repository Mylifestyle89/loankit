import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, handleAuthError } from "@/lib/auth-guard";

export const runtime = "nodejs";

/** Returns all loans for a customer with associated master template (id + name + fieldCatalogJson). */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireSession();
  } catch (e) {
    const resp = handleAuthError(e);
    if (resp) return resp;
    throw e;
  }

  const { id: customerId } = await params;
  if (!customerId) {
    return NextResponse.json({ ok: false, error: "customer id required" }, { status: 400 });
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
    console.error("[GET /api/customers/[id]/loans]", e);
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "Internal error" },
      { status: 500 },
    );
  }
}
