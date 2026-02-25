import { NextRequest, NextResponse } from "next/server";

import { toHttpError, ValidationError } from "@/core/errors/app-error";
import { reportService } from "@/services/report.service";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const mappingInstanceId = req.nextUrl.searchParams.get("mapping_instance_id") ?? undefined;
    const result = await reportService.getMapping({ mappingInstanceId });
    return NextResponse.json({
      ok: true,
      active_version_id: result.active_version_id,
      versions: result.versions,
      mapping: result.mapping,
      alias_map: result.alias_map,
    });
  } catch (error) {
    const httpError = toHttpError(error, "Failed to load mapping.");
    return NextResponse.json(
      { ok: false, error: httpError.message },
      { status: httpError.status },
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      created_by?: string;
      notes?: string;
      mapping?: unknown;
      alias_map?: unknown;
      field_catalog?: unknown[];
      mapping_instance_id?: string;
    };
    const result = await reportService.saveMappingDraft({
      createdBy: body.created_by,
      notes: body.notes,
      mapping: body.mapping,
      aliasMap: body.alias_map,
      fieldCatalog: body.field_catalog,
      mappingInstanceId: body.mapping_instance_id,
    });
    return NextResponse.json({
      ok: true,
      message: "Draft mapping saved.",
      version: result.version,
      active_version_id: result.activeVersionId,
    });
  } catch (error) {
    const httpError = toHttpError(error, "Failed to save mapping draft.");
    return NextResponse.json(
      { ok: false, error: httpError.message },
      { status: httpError.status },
    );
  }
}

export async function POST(req: NextRequest) {
  try {
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
    const httpError = toHttpError(error, "Failed to publish mapping version.");
    return NextResponse.json(
      { ok: false, error: httpError.message },
      { status: httpError.status },
    );
  }
}
