import { NextRequest, NextResponse } from "next/server";

import { toHttpError } from "@/core/errors/app-error";
import { loanPlanService } from "@/services/loan-plan.service";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const category = req.nextUrl.searchParams.get("category") ?? undefined;
    const templates = await loanPlanService.listTemplates(category);
    return NextResponse.json({ ok: true, templates });
  } catch (error) {
    const httpError = toHttpError(error, "Failed to list templates.");
    return NextResponse.json({ ok: false, error: httpError.message }, { status: httpError.status });
  }
}
