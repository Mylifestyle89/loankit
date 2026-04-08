import { NextRequest, NextResponse } from "next/server";
import { handleAuthError, requireEditorOrAdmin, requireSession } from "@/lib/auth-guard";
import { decryptCoBorrowerPii, encryptCoBorrowerPii } from "@/lib/field-encryption";
import { prisma } from "@/lib/prisma";

type Ctx = { params: Promise<{ id: string }> };

/** GET /api/customers/:id/co-borrowers */
export async function GET(_req: NextRequest, ctx: Ctx) {
  try {
    await requireSession();
    const { id } = await ctx.params;
    const rows = await prisma.coBorrower.findMany({
      where: { customerId: id },
      orderBy: { createdAt: "asc" },
    });
    const items = rows.map((r) => decryptCoBorrowerPii(r as unknown as Record<string, unknown>));
    return NextResponse.json({ ok: true, items });
  } catch (e: unknown) {
    const authResponse = handleAuthError(e);
    if (authResponse) return authResponse;
    const msg = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}

/** POST /api/customers/:id/co-borrowers */
export async function POST(req: NextRequest, ctx: Ctx) {
  try {
    await requireEditorOrAdmin();
    const { id } = await ctx.params;
    const body = await req.json();
    if (!body.full_name?.trim()) {
      return NextResponse.json({ ok: false, error: "full_name is required" }, { status: 400 });
    }
    const payload = encryptCoBorrowerPii({
      customerId: id,
      title: body.title ?? null,
      full_name: body.full_name.trim(),
      id_type: body.id_type ?? null,
      id_number: body.id_number ?? null,
      id_issued_date: body.id_issued_date ?? null,
      id_old: body.id_old ?? null,
      id_issued_place: body.id_issued_place ?? null,
      birth_year: body.birth_year ?? null,
      phone: body.phone ?? null,
      current_address: body.current_address ?? null,
      permanent_address: body.permanent_address ?? null,
      relationship: body.relationship ?? null,
      agribank_debt: body.agribank_debt ?? null,
      agribank_branch: body.agribank_branch ?? null,
    });
    const item = await prisma.coBorrower.create({ data: payload as never });
    return NextResponse.json({ ok: true, item });
  } catch (e: unknown) {
    const authResponse = handleAuthError(e);
    if (authResponse) return authResponse;
    const msg = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
