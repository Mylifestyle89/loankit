import { NextRequest, NextResponse } from "next/server";

import { toHttpError } from "@/core/errors/app-error";
import { reportService } from "@/services/report.service";

export const runtime = "nodejs";

export async function GET() {
  try {
    const result = await reportService.getTemplates();
    return NextResponse.json({
      ok: true,
      templates: result.templates,
      active_template_id: result.activeTemplateId,
    });
  } catch (error) {
    const httpError = toHttpError(error, "Failed to load templates.");
    return NextResponse.json(
      { ok: false, error: httpError.message },
      { status: httpError.status },
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = (await req.json()) as { template_id?: string };
    const result = await reportService.setActiveTemplate(body.template_id ?? "");
    return NextResponse.json({
      ok: true,
      templates: result.templates,
      active_template_id: result.activeTemplateId,
    });
  } catch (error) {
    const httpError = toHttpError(error, "Failed to set active template.");
    return NextResponse.json(
      { ok: false, error: httpError.message },
      { status: httpError.status },
    );
  }
}
