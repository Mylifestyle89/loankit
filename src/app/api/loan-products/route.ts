import { NextRequest, NextResponse } from "next/server";
import { requireEditorOrAdmin } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";

/** GET /api/loan-products — list all active loan products */
export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const includeInactive = url.searchParams.get("all") === "true";

    const items = await prisma.loanProduct.findMany({
      where: includeInactive ? {} : { is_active: true },
      orderBy: { sort_order: "asc" },
    });
    return NextResponse.json({ ok: true, items });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}

/** POST /api/loan-products — create a loan product */
export async function POST(req: NextRequest) {
  try {
    await requireEditorOrAdmin();
    const body = await req.json();

    if (!body.code?.trim() || !body.name?.trim()) {
      return NextResponse.json(
        { ok: false, error: "code and name are required" },
        { status: 400 },
      );
    }

    const item = await prisma.loanProduct.create({
      data: {
        code: body.code.trim().toUpperCase(),
        name: body.name.trim(),
        customer_type: body.customer_type ?? "individual",
        loan_method: body.loan_method ?? "tung_lan",
        description: body.description ?? null,
        sort_order: body.sort_order ?? 0,
        is_active: body.is_active ?? true,
      },
    });
    return NextResponse.json({ ok: true, item });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    const status = String(msg).includes("Unique") ? 409 : 500;
    return NextResponse.json({ ok: false, error: msg }, { status });
  }
}
