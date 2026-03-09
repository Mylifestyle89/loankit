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

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as { template_name?: string; docx_path?: string };
    const result = await reportService.registerTemplateProfile({
      templateName: body.template_name ?? "",
      docxPath: body.docx_path ?? "",
    });
    return NextResponse.json({
      ok: true,
      profile: result.profile,
      templates: result.templates,
      active_template_id: result.activeTemplateId,
    });
  } catch (error) {
    const httpError = toHttpError(error, "Failed to register template.");
    return NextResponse.json(
      { ok: false, error: httpError.message },
      { status: httpError.status },
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const templateId = searchParams.get("id") ?? "";
    const result = await reportService.removeTemplateProfile(templateId);
    return NextResponse.json({
      ok: true,
      templates: result.templates,
      active_template_id: result.activeTemplateId,
    });
  } catch (error) {
    const httpError = toHttpError(error, "Failed to remove template.");
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
