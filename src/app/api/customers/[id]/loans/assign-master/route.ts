import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireEditorOrAdmin, handleAuthError } from "@/lib/auth-guard";

export const runtime = "nodejs";

const bodySchema = z.object({
  masterTemplateId: z.string().min(1),
});

/** Broadcasts a master template to ALL loans of the customer; returns updated count. */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireEditorOrAdmin();
  } catch (e) {
    const resp = handleAuthError(e);
    if (resp) return resp;
    throw e;
  }

  const { id: customerId } = await params;
  if (!customerId) {
    return NextResponse.json({ ok: false, error: "customer id required" }, { status: 400 });
  }

  let body: z.infer<typeof bodySchema>;
  try {
    body = bodySchema.parse(await req.json());
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "Invalid request body" },
      { status: 400 },
    );
  }

  try {
    // Verify master template exists
    const master = await prisma.masterTemplate.findUnique({
      where: { id: body.masterTemplateId },
      select: { id: true, name: true },
    });
    if (!master) {
      return NextResponse.json(
        { ok: false, error: `Master template "${body.masterTemplateId}" not found` },
        { status: 404 },
      );
    }

    // Broadcast to all customer loans
    const result = await prisma.loan.updateMany({
      where: { customerId },
      data: { masterTemplateId: body.masterTemplateId },
    });

    return NextResponse.json({ ok: true, count: result.count });
  } catch (e) {
    console.error("[POST /api/customers/[id]/loans/assign-master]", e);
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "Internal error" },
      { status: 500 },
    );
  }
}
