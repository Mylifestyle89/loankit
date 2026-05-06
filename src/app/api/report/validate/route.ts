import { NextRequest, NextResponse } from "next/server";

import { toHttpError } from "@/core/errors/app-error";
import { requireSession, handleAuthError } from "@/lib/auth-guard";
import { reportService } from "@/services/report.service";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    await requireSession();
    const body = (await req.json().catch(() => ({}))) as {
      run_build?: boolean;
      loan_id?: string;
      master_template_id?: string;
    };
    const result = await reportService.validateReport({
      runBuild: body.run_build === true,
      loanId: body.loan_id,
    });
    return NextResponse.json({
      ok: true,
      source: result.source,
      validation: result.validation,
    });
  } catch (error) {
    const authResp = handleAuthError(error);
    if (authResp) return authResp;
    const httpError = toHttpError(error, "Validate failed.");
    return NextResponse.json(
      { ok: false, error: httpError.message },
      { status: httpError.status },
    );
  }
}
