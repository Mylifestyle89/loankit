import { NextRequest, NextResponse } from "next/server";

import { toHttpError, ValidationError } from "@/core/errors/app-error";
import { reportService } from "@/services/report.service";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

export async function GET(_: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const mappingInstance = await reportService.getMappingInstance(id);
    return NextResponse.json({ ok: true, mapping_instance: mappingInstance });
  } catch (error) {
    const httpError = toHttpError(error, "Failed to load mapping instance.");
    return NextResponse.json({ ok: false, error: httpError.message }, { status: httpError.status });
  }
}

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const body = (await req.json()) as { action?: string };
    if (body.action !== "publish") {
      throw new ValidationError("Unsupported action.");
    }
    const mappingInstance = await reportService.publishMappingInstance(id);
    return NextResponse.json({ ok: true, mapping_instance: mappingInstance });
  } catch (error) {
    const httpError = toHttpError(error, "Failed to update mapping instance.");
    return NextResponse.json({ ok: false, error: httpError.message }, { status: httpError.status });
  }
}

export async function DELETE(_: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const result = await reportService.deleteMappingInstance(id);
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    const httpError = toHttpError(error, "Failed to delete mapping instance.");
    return NextResponse.json({ ok: false, error: httpError.message }, { status: httpError.status });
  }
}
