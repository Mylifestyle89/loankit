import { NextRequest, NextResponse } from "next/server";
import { requireEditorOrAdmin, handleAuthError } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";

type Ctx = { params: Promise<{ id: string }> };

/** PATCH /api/config/dropdown-options/[id] - update label or sort_order */
export async function PATCH(req: NextRequest, ctx: Ctx) {
  try {
    await requireEditorOrAdmin();
    const { id } = await ctx.params;
    const body = await req.json();
    const data: Record<string, unknown> = {};
    if (body.label !== undefined) data.label = body.label;
    if (body.sort_order !== undefined) data.sort_order = body.sort_order;
    const item = await prisma.dropdownOption.update({ where: { id }, data });
    return NextResponse.json({ ok: true, item });
  } catch (e: unknown) {
    const authResponse = handleAuthError(e);
    if (authResponse) return authResponse;
    const msg = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}

/** DELETE /api/config/dropdown-options/[id] */
export async function DELETE(_req: NextRequest, ctx: Ctx) {
  try {
    await requireEditorOrAdmin();
    const { id } = await ctx.params;
    await prisma.dropdownOption.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    const authResponse = handleAuthError(e);
    if (authResponse) return authResponse;
    const msg = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
