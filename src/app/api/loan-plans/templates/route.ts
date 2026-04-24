import { NextRequest, NextResponse } from "next/server";

import { toHttpError } from "@/core/errors/app-error";
import { requireSession, handleAuthError } from "@/lib/auth-guard";
import { loanPlanService } from "@/services/loan-plan.service";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    await requireSession();
    const category = req.nextUrl.searchParams.get("category") ?? undefined;
    const templates = await loanPlanService.listTemplates(category);
    return NextResponse.json({ ok: true, templates });
  } catch (error) {
    const authResponse = handleAuthError(error);
    if (authResponse) return authResponse;
    const httpError = toHttpError(error, "Failed to list templates.");
    return NextResponse.json({ ok: false, error: httpError.message }, { status: httpError.status });
  }
}
