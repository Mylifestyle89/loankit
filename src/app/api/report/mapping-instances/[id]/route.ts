import { NextRequest, NextResponse } from "next/server";

import { toHttpError, ValidationError } from "@/core/errors/app-error";
import { requireSession, requireOwnerOrAdmin, handleAuthError } from "@/lib/auth-guard";
import { mappingInstanceService } from "@/services/report/mapping-instance.service";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

export async function GET(_: NextRequest, { params }: Params) {
  try {
    await requireSession();
    const { id } = await params;
    const mappingInstance = await mappingInstanceService.getMappingInstance(id);
    return NextResponse.json({ ok: true, mapping_instance: mappingInstance });
  } catch (error) {
    const authResp = handleAuthError(error);
    if (authResp) return authResp;
    const httpError = toHttpError(error, "Failed to load mapping instance.");
    return NextResponse.json({ ok: false, error: httpError.message }, { status: httpError.status });
  }
}

export async function PUT(req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const instance = await mappingInstanceService.getMappingInstance(id);
    await requireOwnerOrAdmin(instance.created_by);
    const body = (await req.json()) as { name?: string; field_catalog?: unknown };
    const updated = await mappingInstanceService.updateMappingInstance(id, {
      name: body.name,
      fieldCatalog: body.field_catalog,
    });
    return NextResponse.json({ ok: true, mapping_instance: updated });
  } catch (error) {
    const authResp = handleAuthError(error);
    if (authResp) return authResp;
    const httpError = toHttpError(error, "Failed to update mapping instance.");
    return NextResponse.json({ ok: false, error: httpError.message }, { status: httpError.status });
  }
}

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const instance = await mappingInstanceService.getMappingInstance(id);
    await requireOwnerOrAdmin(instance.created_by);
    const body = (await req.json()) as { action?: string };
    if (body.action !== "publish") {
      throw new ValidationError("Unsupported action.");
    }
    const mappingInstance = await mappingInstanceService.publishMappingInstance(id);
    return NextResponse.json({ ok: true, mapping_instance: mappingInstance });
  } catch (error) {
    const authResp = handleAuthError(error);
    if (authResp) return authResp;
    const httpError = toHttpError(error, "Failed to update mapping instance.");
    return NextResponse.json({ ok: false, error: httpError.message }, { status: httpError.status });
  }
}

export async function DELETE(_: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const instance = await mappingInstanceService.getMappingInstance(id);
    await requireOwnerOrAdmin(instance.created_by);
    const result = await mappingInstanceService.deleteMappingInstance(id);
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    const authResp = handleAuthError(error);
    if (authResp) return authResp;
    const httpError = toHttpError(error, "Failed to delete mapping instance.");
    return NextResponse.json({ ok: false, error: httpError.message }, { status: httpError.status });
  }
}
