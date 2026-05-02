import { NextRequest, NextResponse } from "next/server";
import { toHttpError } from "@/core/errors/app-error";
import { disbursementService } from "@/services/disbursement.service";
import { requireEditorOrAdmin, handleAuthError } from "@/lib/auth-guard";

export const runtime = "nodejs";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireEditorOrAdmin();
    const { id: loanId } = await params;
    const suggestions = await disbursementService.getFieldSuggestions(loanId);
    return NextResponse.json({ ok: true, suggestions });
  } catch (e) {
    const authResponse = handleAuthError(e);
    if (authResponse) return authResponse;
    const err = toHttpError(e, "Failed to fetch disbursement suggestions.");
    return NextResponse.json({ ok: false, error: err.message }, { status: err.status });
  }
}
