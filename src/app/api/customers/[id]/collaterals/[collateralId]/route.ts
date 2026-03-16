import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type Ctx = { params: Promise<{ id: string; collateralId: string }> };

/** PATCH /api/customers/:id/collaterals/:collateralId — update collateral */
export async function PATCH(req: NextRequest, ctx: Ctx) {
  try {
    const { id, collateralId } = await ctx.params;
    const body = await req.json();
    const data: Record<string, unknown> = {};

    if (body.collateral_type !== undefined) data.collateral_type = body.collateral_type;
    if (body.name !== undefined) data.name = body.name;
    if (body.total_value !== undefined) data.total_value = body.total_value;
    if (body.obligation !== undefined) data.obligation = body.obligation;
    if (body.properties !== undefined) data.properties_json = JSON.stringify(body.properties);

    // Verify ownership: collateral must belong to this customer
    const collateral = await prisma.collateral.update({
      where: { id: collateralId, customerId: id },
      data,
    });
    return NextResponse.json({ ok: true, collateral });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}

/** DELETE /api/customers/:id/collaterals/:collateralId — delete collateral */
export async function DELETE(_req: NextRequest, ctx: Ctx) {
  try {
    const { id, collateralId } = await ctx.params;
    // Verify ownership before delete
    await prisma.collateral.delete({ where: { id: collateralId, customerId: id } });
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
