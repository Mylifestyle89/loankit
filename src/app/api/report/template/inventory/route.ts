import { NextRequest, NextResponse } from "next/server";

import { toHttpError } from "@/core/errors/app-error";
import { reportService } from "@/services/report.service";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as { template_id?: string };
    const result = await reportService.buildTemplateInventory(body.template_id ?? "");

    return NextResponse.json({
      ok: true,
      inventory_path: result.inventoryPath,
      inventory: result.inventory,
      suggestions: result.suggestions,
    });
  } catch (error) {
    const httpError = toHttpError(error, "Failed to build inventory.");
    return NextResponse.json(
      { ok: false, error: httpError.message },
      { status: httpError.status },
    );
  }
}
