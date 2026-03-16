import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type Ctx = { params: Promise<{ id: string; rpId: string }> };

/** PATCH /api/customers/:id/related-persons/:rpId */
export async function PATCH(req: NextRequest, ctx: Ctx) {
  try {
    const { id, rpId } = await ctx.params;
    const body = await req.json();
    const data: Record<string, unknown> = {};
    const fields = ["name", "id_number", "address", "relation_type", "agribank_debt", "agribank_branch"];
    for (const f of fields) {
      if (body[f] !== undefined) data[f] = body[f];
    }
    const item = await prisma.relatedPerson.update({
      where: { id: rpId, customerId: id },
      data,
    });
    return NextResponse.json({ ok: true, item });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}

/** DELETE /api/customers/:id/related-persons/:rpId */
export async function DELETE(_req: NextRequest, ctx: Ctx) {
  try {
    const { id, rpId } = await ctx.params;
    await prisma.relatedPerson.delete({ where: { id: rpId, customerId: id } });
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
