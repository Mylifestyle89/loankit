import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type Ctx = { params: Promise<{ branchId: string }> };

/** PATCH /api/branches/:branchId */
export async function PATCH(req: NextRequest, ctx: Ctx) {
  try {
    const { branchId } = await ctx.params;
    const body = await req.json();
    const data: Record<string, unknown> = {};
    const fields = [
      "name", "name_uppercase", "address", "branch_code", "phone", "fax",
      "tax_code", "tax_issued_date", "tax_issued_place", "district", "province",
    ];
    for (const f of fields) {
      if (body[f] !== undefined) data[f] = body[f];
    }
    const item = await prisma.branch.update({ where: { id: branchId }, data });
    return NextResponse.json({ ok: true, item });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}

/** DELETE /api/branches/:branchId */
export async function DELETE(_req: NextRequest, ctx: Ctx) {
  try {
    const { branchId } = await ctx.params;
    await prisma.branch.delete({ where: { id: branchId } });
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
