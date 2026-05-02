import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { toHttpError } from "@/core/errors/app-error";
import { withValidatedBody } from "@/lib/api-helpers";
import { withErrorHandling } from "@/lib/api/with-error-handling";
import { requireSession, requireEditorOrAdmin, handleAuthError } from "@/lib/auth-guard";
import { reportService } from "@/services/report.service";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    await requireSession();
    const withUsage = req.nextUrl.searchParams.get("with_usage") === "1";
    const page = Number(req.nextUrl.searchParams.get("page") ?? "1");
    const limit = Number(req.nextUrl.searchParams.get("limit") ?? "100");
    const result = await reportService.listMasterTemplates({ withUsage, page, limit });
    return NextResponse.json({
      ok: true,
      // backward-compat: keep master_templates as array for existing callers
      master_templates: result.data,
      total: result.total,
      page: result.page,
      limit: result.limit,
    });
  } catch (error) {
    const authResp = handleAuthError(error);
    if (authResp) return authResp;
    const httpError = toHttpError(error, "Failed to load master templates.");
    return NextResponse.json({ ok: false, error: httpError.message }, { status: httpError.status });
  }
}

const masterTemplatesPostSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  field_catalog: z.array(z.unknown()).optional(),
});

export const POST = withErrorHandling(
  withValidatedBody(masterTemplatesPostSchema, async (body) => {
    const session = await requireEditorOrAdmin();
    const master = await reportService.createMasterTemplate({
      name: body.name,
      description: body.description,
      fieldCatalog: body.field_catalog ?? [],
      createdBy: session.user.id,
    });
    return NextResponse.json({ ok: true, master_template: master });
  }),
);

export async function PUT(req: NextRequest) {
  try {
    await requireEditorOrAdmin();
    const body = (await req.json()) as {
      master_id?: string;
      name?: string;
      description?: string;
      field_catalog?: unknown[];
      status?: "active" | "archived";
    };
    const master = await reportService.updateMasterTemplate({
      masterId: body.master_id ?? "",
      name: body.name,
      description: body.description,
      fieldCatalog: body.field_catalog,
      status: body.status,
    });
    return NextResponse.json({ ok: true, master_template: master });
  } catch (error) {
    const authResp = handleAuthError(error);
    if (authResp) return authResp;
    const httpError = toHttpError(error, "Failed to update master template.");
    return NextResponse.json({ ok: false, error: httpError.message }, { status: httpError.status });
  }
}
