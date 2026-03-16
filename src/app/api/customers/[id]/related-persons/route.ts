import { NextRequest, NextResponse } from "next/server";
import { requireEditorOrAdmin } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";

type Ctx = { params: Promise<{ id: string }> };

/** GET /api/customers/:id/related-persons */
export async function GET(_req: NextRequest, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    const items = await prisma.relatedPerson.findMany({
      where: { customerId: id },
      orderBy: { createdAt: "asc" },
    });
    return NextResponse.json({ ok: true, items });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}

/** POST /api/customers/:id/related-persons */
export async function POST(req: NextRequest, ctx: Ctx) {
  try {
    await requireEditorOrAdmin();
    const { id } = await ctx.params;
    const body = await req.json();
    if (!body.name?.trim()) {
      return NextResponse.json({ ok: false, error: "name is required" }, { status: 400 });
    }
    const item = await prisma.relatedPerson.create({
      data: {
        customerId: id,
        name: body.name.trim(),
        id_number: body.id_number ?? null,
        address: body.address ?? null,
        relation_type: body.relation_type ?? null,
        agribank_debt: body.agribank_debt ?? null,
        agribank_branch: body.agribank_branch ?? null,
      },
    });
    return NextResponse.json({ ok: true, item });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
