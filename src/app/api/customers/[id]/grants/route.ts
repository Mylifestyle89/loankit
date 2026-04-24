import { NextRequest, NextResponse } from "next/server";

import { toHttpError } from "@/core/errors/app-error";
import { prisma } from "@/lib/prisma";
import { requireAdmin, handleAuthError } from "@/lib/auth-guard";
import { listGrants, grantAccess } from "@/services/customer-grant.service";

export const runtime = "nodejs";

/** GET /api/customers/[id]/grants — list all access grants (admin only) */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdmin();
    const { id } = await params;
    const grants = await listGrants(id);
    return NextResponse.json({ ok: true, grants });
  } catch (error) {
    const authResponse = handleAuthError(error);
    if (authResponse) return authResponse;
    return NextResponse.json({ ok: false, error: toHttpError(error, "Failed").message }, { status: 500 });
  }
}

/** POST /api/customers/[id]/grants — grant user access (admin only) */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requireAdmin();
    const { id } = await params;
    const body = await req.json();
    const { userId } = body as { userId?: string };
    if (!userId) {
      return NextResponse.json({ ok: false, error: "userId is required" }, { status: 400 });
    }

    // Block granting access to the owner (they already have full access)
    const customer = await prisma.customer.findUnique({ where: { id }, select: { createdById: true } });
    if (!customer) return NextResponse.json({ ok: false, error: "Customer not found" }, { status: 404 });
    if (customer.createdById === userId) {
      return NextResponse.json({ ok: false, error: "User is already the owner" }, { status: 400 });
    }

    const grant = await grantAccess(id, userId, session.user.id);
    return NextResponse.json({ ok: true, grant });
  } catch (error) {
    const authResponse = handleAuthError(error);
    if (authResponse) return authResponse;
    return NextResponse.json({ ok: false, error: toHttpError(error, "Failed").message }, { status: 500 });
  }
}
