import { NextRequest, NextResponse } from "next/server";

import { toHttpError } from "@/core/errors/app-error";
import { reportService } from "@/services/report.service";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const customerId = req.nextUrl.searchParams.get("customer_id") ?? undefined;
    const masterId = req.nextUrl.searchParams.get("master_id") ?? undefined;
    const statusRaw = req.nextUrl.searchParams.get("status") ?? undefined;
    const status =
      statusRaw === "draft" || statusRaw === "published" || statusRaw === "archived"
        ? statusRaw
        : undefined;
    const instances = await reportService.listMappingInstances({ customerId, masterId, status });
    return NextResponse.json({ ok: true, mapping_instances: instances });
  } catch (error) {
    const httpError = toHttpError(error, "Failed to load mapping instances.");
    return NextResponse.json({ ok: false, error: httpError.message }, { status: httpError.status });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      master_id?: string;
      customer_id?: string;
      name?: string;
      created_by?: string;
    };
    const mappingInstance = await reportService.createMappingInstance({
      masterId: body.master_id ?? "",
      customerId: body.customer_id ?? "",
      name: body.name,
      createdBy: body.created_by,
    });
    return NextResponse.json({ ok: true, mapping_instance: mappingInstance });
  } catch (error) {
    const httpError = toHttpError(error, "Failed to create mapping instance.");
    return NextResponse.json({ ok: false, error: httpError.message }, { status: httpError.status });
  }
}
