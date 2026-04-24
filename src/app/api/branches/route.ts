import { NextRequest, NextResponse } from "next/server";
import { requireSession, requireEditorOrAdmin, handleAuthError } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";

/** GET /api/branches — list all branches */
export async function GET() {
  try {
    await requireSession();
    const items = await prisma.branch.findMany({ orderBy: { createdAt: "asc" } });
    return NextResponse.json({ ok: true, items });
  } catch (e: unknown) {
    const authResponse = handleAuthError(e);
    if (authResponse) return authResponse;
    const msg = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}

/** POST /api/branches — create a branch */
export async function POST(req: NextRequest) {
  try {
    await requireEditorOrAdmin();
    const body = await req.json();
    if (!body.name?.trim()) {
      return NextResponse.json({ ok: false, error: "name is required" }, { status: 400 });
    }
    const item = await prisma.branch.create({
      data: {
        name: body.name.trim(),
        name_uppercase: body.name_uppercase ?? null,
        address: body.address ?? null,
        branch_code: body.branch_code ?? null,
        phone: body.phone ?? null,
        fax: body.fax ?? null,
        tax_code: body.tax_code ?? null,
        tax_issued_date: body.tax_issued_date ?? null,
        tax_issued_place: body.tax_issued_place ?? null,
        district: body.district ?? null,
        province: body.province ?? null,
      },
    });
    return NextResponse.json({ ok: true, item });
  } catch (e: unknown) {
    const authResponse = handleAuthError(e);
    if (authResponse) return authResponse;
    const msg = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
