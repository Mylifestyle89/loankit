import { NextRequest, NextResponse } from "next/server";
import { handleAuthError, requireEditorOrAdmin, requireSession } from "@/lib/auth-guard";
import { decryptRelatedPersonPii, encryptRelatedPersonPii } from "@/lib/field-encryption";
import { customerService } from "@/services/customer.service";
import { prisma } from "@/lib/prisma";

type Ctx = { params: Promise<{ id: string }> };

/** GET /api/customers/:id/related-persons */
export async function GET(_req: NextRequest, ctx: Ctx) {
  try {
    const session = await requireSession();
    const { id } = await ctx.params;
    if (session.user.role !== "admin") {
      const ok = await customerService.checkCustomerAccess(id, session.user.id);
      if (!ok) return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
    }
    const rows = await prisma.relatedPerson.findMany({
      where: { customerId: id },
      orderBy: { createdAt: "asc" },
    });
    const items = rows.map((r) => decryptRelatedPersonPii(r as unknown as Record<string, unknown>));
    return NextResponse.json({ ok: true, items });
  } catch (e: unknown) {
    const authResponse = handleAuthError(e);
    if (authResponse) return authResponse;
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
    const payload = encryptRelatedPersonPii({
      customerId: id,
      name: body.name.trim(),
      id_number: body.id_number ?? null,
      address: body.address ?? null,
      relation_type: body.relation_type ?? null,
      agribank_debt: body.agribank_debt ?? null,
      agribank_branch: body.agribank_branch ?? null,
    });
    const item = await prisma.relatedPerson.create({ data: payload as never });
    return NextResponse.json({ ok: true, item });
  } catch (e: unknown) {
    const authResponse = handleAuthError(e);
    if (authResponse) return authResponse;
    const msg = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
