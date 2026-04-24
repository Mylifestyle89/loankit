import { NextRequest, NextResponse } from "next/server";

import { toHttpError } from "@/core/errors/app-error";
import { requireAdmin, handleAuthError } from "@/lib/auth-guard";
import { revokeAccess } from "@/services/customer-grant.service";

export const runtime = "nodejs";

/** DELETE /api/customers/[id]/grants/[userId] — revoke user access (admin only) */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; userId: string }> },
) {
  try {
    await requireAdmin();
    const { id, userId } = await params;
    await revokeAccess(id, userId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const authResponse = handleAuthError(error);
    if (authResponse) return authResponse;
    return NextResponse.json({ ok: false, error: toHttpError(error, "Failed").message }, { status: 500 });
  }
}
