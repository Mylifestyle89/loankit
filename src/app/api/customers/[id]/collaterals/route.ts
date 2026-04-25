import { NextRequest, NextResponse } from "next/server";
import { requireSession, requireEditorOrAdmin, handleAuthError } from "@/lib/auth-guard";
import { encryptCollateralOwners, decryptCollateralOwners } from "@/lib/field-encryption";
import { customerService } from "@/services/customer.service";
import { prisma } from "@/lib/prisma";

type Ctx = { params: Promise<{ id: string }> };

/** GET /api/customers/:id/collaterals — list all collaterals for a customer */
export async function GET(_req: NextRequest, ctx: Ctx) {
  try {
    const session = await requireSession();
    const { id } = await ctx.params;
    if (session.user.role !== "admin") {
      const ok = await customerService.checkCustomerAccess(id, session.user.id);
      if (!ok) return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
    }
    const collaterals = await prisma.collateral.findMany({
      where: { customerId: id },
      orderBy: { createdAt: "desc" },
    });
    // Parse JSON properties for client
    const items = collaterals.map((c) => {
      let properties = {};
      try { properties = decryptCollateralOwners(JSON.parse(c.properties_json || "{}")); } catch { /* malformed JSON — default to empty */ }
      return { ...c, properties };
    });
    return NextResponse.json({ ok: true, collaterals: items });
  } catch (e: unknown) {
    const authResponse = handleAuthError(e);
    if (authResponse) return authResponse;
    const msg = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}

/** POST /api/customers/:id/collaterals — create a new collateral */
export async function POST(req: NextRequest, ctx: Ctx) {
  try {
    await requireEditorOrAdmin();
    const { id } = await ctx.params;
    const body = await req.json();
    const { collateral_type, name, total_value, obligation, properties } = body;

    if (!collateral_type || !name) {
      return NextResponse.json(
        { ok: false, error: "collateral_type and name are required" },
        { status: 400 },
      );
    }
    if (typeof obligation === "number" && typeof total_value === "number" && obligation > total_value) {
      return NextResponse.json(
        { ok: false, error: `Nghĩa vụ bảo đảm (${obligation}) không được vượt tổng giá trị TSBĐ (${total_value})` },
        { status: 400 },
      );
    }

    const collateral = await prisma.collateral.create({
      data: {
        customerId: id,
        collateral_type,
        name,
        total_value: total_value ?? null,
        obligation: obligation ?? null,
        properties_json: JSON.stringify(encryptCollateralOwners(properties ?? {})),
      },
    });
    return NextResponse.json({ ok: true, collateral });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
