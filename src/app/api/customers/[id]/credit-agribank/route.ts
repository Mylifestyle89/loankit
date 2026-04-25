import { NextRequest, NextResponse } from "next/server";
import { requireSession, requireEditorOrAdmin, handleAuthError } from "@/lib/auth-guard";
import { customerService } from "@/services/customer.service";
import { prisma } from "@/lib/prisma";

type Ctx = { params: Promise<{ id: string }> };

const FIELDS = [
  "branch_name", "debt_group", "loan_term", "debt_amount", "loan_purpose", "repayment_source",
] as const;

export async function GET(_req: NextRequest, ctx: Ctx) {
  try {
    const session = await requireSession();
    const { id } = await ctx.params;
    if (session.user.role !== "admin") {
      const ok = await customerService.checkCustomerAccess(id, session.user.id);
      if (!ok) return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
    }
    const items = await prisma.creditAtAgribank.findMany({
      where: { customerId: id },
      orderBy: { createdAt: "asc" },
    });
    return NextResponse.json({ ok: true, items });
  } catch (e: unknown) {
    const authResponse = handleAuthError(e);
    if (authResponse) return authResponse;
    const msg = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}

export async function POST(req: NextRequest, ctx: Ctx) {
  try {
    await requireEditorOrAdmin();
    const { id } = await ctx.params;
    const body = await req.json();
    const data: Record<string, string | null> = { customerId: id };
    for (const f of FIELDS) data[f] = body[f] ?? null;
    const item = await prisma.creditAtAgribank.create({ data: data as never });
    return NextResponse.json({ ok: true, item });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
