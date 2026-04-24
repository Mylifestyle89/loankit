import { NextRequest, NextResponse } from "next/server";
import { requireSession, requireEditorOrAdmin, handleAuthError } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/config/dropdown-options?field_key=approver_title
 * GET /api/config/dropdown-options?prefix=collateral.  → grouped by field_key
 */
export async function GET(req: NextRequest) {
  try {
    await requireSession();
    const fieldKey = req.nextUrl.searchParams.get("field_key");
    const prefix = req.nextUrl.searchParams.get("prefix");

    if (prefix) {
      // Batch fetch: all options whose field_key starts with prefix
      const items = await prisma.dropdownOption.findMany({
        where: { field_key: { startsWith: prefix } },
        orderBy: { sort_order: "asc" },
      });
      // Group by field_key
      const groups: Record<string, typeof items> = {};
      for (const item of items) {
        (groups[item.field_key] ??= []).push(item);
      }
      return NextResponse.json({ ok: true, groups });
    }

    if (!fieldKey) {
      return NextResponse.json({ ok: false, error: "field_key or prefix is required" }, { status: 400 });
    }
    const items = await prisma.dropdownOption.findMany({
      where: { field_key: fieldKey },
      orderBy: { sort_order: "asc" },
    });
    return NextResponse.json({ ok: true, items });
  } catch (e: unknown) {
    const authResponse = handleAuthError(e);
    if (authResponse) return authResponse;
    const msg = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}

/**
 * POST /api/config/dropdown-options
 * Body: { field_key, label, sort_order? }
 */
export async function POST(req: NextRequest) {
  try {
    await requireEditorOrAdmin();
    const body = await req.json();
    const { field_key, label, sort_order } = body;
    if (!field_key || !label) {
      return NextResponse.json({ ok: false, error: "field_key and label are required" }, { status: 400 });
    }
    const item = await prisma.dropdownOption.create({
      data: { field_key, label, sort_order: sort_order ?? 0 },
    });
    return NextResponse.json({ ok: true, item });
  } catch (e: unknown) {
    const authResponse = handleAuthError(e);
    if (authResponse) return authResponse;
    const msg = e instanceof Error ? e.message : "Unknown error";
    const status = msg.includes("Unique constraint") ? 409 : 500;
    return NextResponse.json({ ok: false, error: status === 409 ? "Option already exists" : msg }, { status });
  }
}
