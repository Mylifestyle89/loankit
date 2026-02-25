import { NextRequest, NextResponse } from "next/server";

import { toHttpError } from "@/core/errors/app-error";
import { reportService } from "@/services/report.service";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const withUsage = req.nextUrl.searchParams.get("with_usage") === "1";
    const masters = await reportService.listMasterTemplates({ withUsage });
    return NextResponse.json({ ok: true, master_templates: masters });
  } catch (error) {
    const httpError = toHttpError(error, "Failed to load master templates.");
    return NextResponse.json({ ok: false, error: httpError.message }, { status: httpError.status });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      name?: string;
      description?: string;
      field_catalog?: unknown[];
    };
    const master = await reportService.createMasterTemplate({
      name: body.name ?? "",
      description: body.description,
      fieldCatalog: Array.isArray(body.field_catalog) ? body.field_catalog : [],
    });
    return NextResponse.json({ ok: true, master_template: master });
  } catch (error) {
    const httpError = toHttpError(error, "Failed to create master template.");
    return NextResponse.json({ ok: false, error: httpError.message }, { status: httpError.status });
  }
}

export async function PUT(req: NextRequest) {
  try {
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
    const httpError = toHttpError(error, "Failed to update master template.");
    return NextResponse.json({ ok: false, error: httpError.message }, { status: httpError.status });
  }
}
