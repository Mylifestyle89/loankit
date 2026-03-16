import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type Ctx = { params: Promise<{ id: string; creditId: string }> };

const FIELDS = [
  "institution_name", "debt_group", "loan_term", "debt_amount",
  "loan_purpose", "repayment_source",
] as const;

export async function PATCH(req: NextRequest, ctx: Ctx) {
  try {
    const { id, creditId } = await ctx.params;
    const existing = await prisma.creditAtOther.findFirst({ where: { id: creditId, customerId: id } });
    if (!existing) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
    const body = await req.json();
    const data: Record<string, unknown> = {};
    for (const f of FIELDS) if (body[f] !== undefined) data[f] = body[f];
    const item = await prisma.creditAtOther.update({ where: { id: creditId }, data });
    return NextResponse.json({ ok: true, item });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  try {
    const { id, creditId } = await ctx.params;
    const existing = await prisma.creditAtOther.findFirst({ where: { id: creditId, customerId: id } });
    if (!existing) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
    await prisma.creditAtOther.delete({ where: { id: creditId } });
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
