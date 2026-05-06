import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { toHttpError, ValidationError } from "@/core/errors/app-error";
import { withValidatedBody } from "@/lib/api-helpers";
import { withErrorHandling } from "@/lib/api/with-error-handling";
import { handleAuthError, requireEditorOrAdmin, requireSession } from "@/lib/auth-guard";
import { reportService } from "@/services/report.service";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    // Viewer (internal control) may read active mapping; mutations below require editor+.
    await requireSession();
    const mappingInstanceId = req.nextUrl.searchParams.get("mapping_instance_id") ?? undefined;
    const masterTemplateId = req.nextUrl.searchParams.get("master_template_id") ?? undefined;
    const result = await reportService.getMapping({ masterTemplateId, mappingInstanceId });
    return NextResponse.json({
      ok: true,
      active_version_id: result.active_version_id,
      versions: result.versions,
      mapping: result.mapping,
      alias_map: result.alias_map,
    });
  } catch (error) {
    const authResponse = handleAuthError(error);
    if (authResponse) return authResponse;
    const httpError = toHttpError(error, "Failed to load mapping.");
    return NextResponse.json(
      { ok: false, error: httpError.message },
      { status: httpError.status },
    );
  }
}

const mappingPutSchema = z.object({
  created_by: z.string().optional(),
  notes: z.string().optional(),
  mapping: z.unknown().optional(),
  alias_map: z.unknown().optional(),
  field_catalog: z.array(z.unknown()).optional(),
  mapping_instance_id: z.string().optional(),
  master_template_id: z.string().optional(),
});

export const PUT = withErrorHandling(
  withValidatedBody(mappingPutSchema, async (body) => {
    await requireEditorOrAdmin();
    const result = await reportService.saveMappingDraft({
      createdBy: body.created_by,
      notes: body.notes,
      mapping: body.mapping,
      aliasMap: body.alias_map,
      fieldCatalog: body.field_catalog,
      masterTemplateId: body.master_template_id,
      mappingInstanceId: body.mapping_instance_id,
    });
    return NextResponse.json({
      ok: true,
      message: "Draft mapping saved.",
      version: result.version,
      active_version_id: result.activeVersionId,
    });
  }),
);

export async function POST(req: NextRequest) {
  try {
    await requireEditorOrAdmin();
    const body = (await req.json()) as { action?: string; version_id?: string };
    if (body.action !== "publish") {
      throw new ValidationError("Unsupported action.");
    }
    const result = await reportService.publishMappingVersion(body.version_id ?? "");
    return NextResponse.json({
      ok: true,
      message: "Mapping version published.",
      active_version_id: result.active_version_id,
      versions: result.versions,
    });
  } catch (error) {
    const authResponse = handleAuthError(error);
    if (authResponse) return authResponse;
    const httpError = toHttpError(error, "Failed to publish mapping version.");
    return NextResponse.json(
      { ok: false, error: httpError.message },
      { status: httpError.status },
    );
  }
}
