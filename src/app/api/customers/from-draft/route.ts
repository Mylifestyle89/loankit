import { NextRequest, NextResponse } from "next/server";

import { toHttpError } from "@/core/errors/app-error";
import { requireEditorOrAdmin, handleAuthError } from "@/lib/auth-guard";
import { customerService } from "@/services/customer.service";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    await requireEditorOrAdmin();
    const body = (await req.json()) as {
      values?: Record<string, unknown>;
      assetGroups?: Record<string, Record<string, string>[]>;
    };
    const values = body.values ?? {};
    const result = await customerService.saveFromDraft(values, body.assetGroups);
    return NextResponse.json({
      ok: true,
      customer: result.customer,
      created: result.created,
      message: result.message,
    });
  } catch (error) {
    const authResponse = handleAuthError(error);
    if (authResponse) return authResponse;
    const httpError = toHttpError(error, "Failed to save customer from draft.");
    return NextResponse.json(
      {
        ok: false,
        error: httpError.message,
      },
      { status: httpError.status },
    );
  }
}
