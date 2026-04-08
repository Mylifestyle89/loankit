import { NextRequest, NextResponse } from "next/server";
import { handleAuthError, requireEditorOrAdmin } from "@/lib/auth-guard";
import { encryptCoBorrowerPii } from "@/lib/field-encryption";
import { prisma } from "@/lib/prisma";

type Ctx = { params: Promise<{ id: string; cobId: string }> };

/** PATCH /api/customers/:id/co-borrowers/:cobId */
export async function PATCH(req: NextRequest, ctx: Ctx) {
  try {
    await requireEditorOrAdmin();
    const { id, cobId } = await ctx.params;
    const body = await req.json();
    const data: Record<string, unknown> = {};
    const fields = [
      "title", "full_name", "id_type", "id_number", "id_issued_date",
      "id_old", "id_issued_place", "birth_year", "phone",
      "current_address", "permanent_address", "relationship",
      "agribank_debt", "agribank_branch",
    ];
    for (const f of fields) {
      if (body[f] !== undefined) data[f] = body[f];
    }
    const item = await prisma.coBorrower.update({
      where: { id: cobId, customerId: id },
      data: encryptCoBorrowerPii(data),
    });
    return NextResponse.json({ ok: true, item });
  } catch (e: unknown) {
    const authResponse = handleAuthError(e);
    if (authResponse) return authResponse;
    const msg = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}

/** DELETE /api/customers/:id/co-borrowers/:cobId */
export async function DELETE(_req: NextRequest, ctx: Ctx) {
  try {
    await requireEditorOrAdmin();
    const { id, cobId } = await ctx.params;
    await prisma.coBorrower.delete({ where: { id: cobId, customerId: id } });
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    const authResponse = handleAuthError(e);
    if (authResponse) return authResponse;
    const msg = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
