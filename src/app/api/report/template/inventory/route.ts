import { NextRequest, NextResponse } from "next/server";

import { toHttpError } from "@/core/errors/app-error";
import { requireSession, handleAuthError } from "@/lib/auth-guard";
import { reportService } from "@/services/report.service";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    await requireSession();
    const body = (await req.json()) as { template_id?: string };
    const result = await reportService.buildTemplateInventory(body.template_id ?? "");

    return NextResponse.json({
      ok: true,
      inventory_path: result.inventoryPath,
      inventory: result.inventory,
      suggestions: result.suggestions,
    });
  } catch (error) {
    const authResp = handleAuthError(error);
    if (authResp) return authResp;
    const httpError = toHttpError(error, "Failed to build inventory.");
    return NextResponse.json(
      { ok: false, error: httpError.message },
      { status: httpError.status },
    );
  }
}
