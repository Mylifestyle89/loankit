import { NextRequest, NextResponse } from "next/server";
import { requireEditorOrAdmin, handleAuthError } from "@/lib/auth-guard";
import { encryptCollateralOwners } from "@/lib/field-encryption";
import { prisma } from "@/lib/prisma";

type Ctx = { params: Promise<{ id: string; collateralId: string }> };

/** PATCH /api/customers/:id/collaterals/:collateralId — update collateral */
export async function PATCH(req: NextRequest, ctx: Ctx) {
  try {
    await requireEditorOrAdmin();
    const { id, collateralId } = await ctx.params;
    const body = await req.json();
    const data: Record<string, unknown> = {};

    if (body.collateral_type !== undefined) data.collateral_type = body.collateral_type;
    if (body.name !== undefined) data.name = body.name;
    if (body.total_value !== undefined) data.total_value = body.total_value;
    if (body.obligation !== undefined) data.obligation = body.obligation;
    if (body.properties !== undefined) data.properties_json = JSON.stringify(encryptCollateralOwners(body.properties));

    // Guard: obligation must not exceed total_value
    const newObligation = body.obligation ?? undefined;
    const newTotalValue = body.total_value ?? undefined;
    if (typeof newObligation === "number" || typeof newTotalValue === "number") {
      const existing = await prisma.collateral.findUnique({ where: { id: collateralId }, select: { total_value: true, obligation: true } });
      const finalObl = typeof newObligation === "number" ? newObligation : existing?.obligation;
      const finalVal = typeof newTotalValue === "number" ? newTotalValue : existing?.total_value;
      if (typeof finalObl === "number" && typeof finalVal === "number" && finalObl > finalVal) {
        return NextResponse.json(
          { ok: false, error: `Nghĩa vụ bảo đảm (${finalObl}) không được vượt tổng giá trị TSBĐ (${finalVal})` },
          { status: 400 },
        );
      }
    }

    // Verify ownership: collateral must belong to this customer
    const collateral = await prisma.collateral.update({
      where: { id: collateralId, customerId: id },
      data,
    });
    return NextResponse.json({ ok: true, collateral });
  } catch (e: unknown) {
    const authResponse = handleAuthError(e);
    if (authResponse) return authResponse;
    const msg = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}

/** DELETE /api/customers/:id/collaterals/:collateralId — delete collateral */
export async function DELETE(_req: NextRequest, ctx: Ctx) {
  try {
    await requireEditorOrAdmin();
    const { id, collateralId } = await ctx.params;
    // Verify ownership before delete
    await prisma.collateral.delete({ where: { id: collateralId, customerId: id } });
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    const authResponse = handleAuthError(e);
    if (authResponse) return authResponse;
    const msg = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
