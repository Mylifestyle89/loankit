import { NextRequest, NextResponse } from "next/server";
import { requireEditorOrAdmin } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";

type Ctx = { params: Promise<{ productId: string }> };

/** PATCH /api/loan-products/:productId */
export async function PATCH(req: NextRequest, ctx: Ctx) {
  try {
    await requireEditorOrAdmin();
    const { productId } = await ctx.params;
    const body = await req.json();
    const data: Record<string, unknown> = {};
    const fields = [
      "code", "name", "customer_type", "loan_method",
      "description", "sort_order", "is_active",
    ];
    for (const f of fields) {
      if (body[f] !== undefined) data[f] = body[f];
    }
    if (data.code) data.code = String(data.code).trim().toUpperCase();

    const item = await prisma.loanProduct.update({
      where: { id: productId },
      data,
    });
    return NextResponse.json({ ok: true, item });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}

/** DELETE /api/loan-products/:productId */
export async function DELETE(_req: NextRequest, ctx: Ctx) {
  try {
    await requireEditorOrAdmin();
    const { productId } = await ctx.params;
    await prisma.loanProduct.delete({ where: { id: productId } });
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
