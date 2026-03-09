import { NextRequest, NextResponse } from "next/server";

import { toHttpError } from "@/core/errors/app-error";
import { reportService } from "@/services/report.service";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const customerId = req.nextUrl.searchParams.get("customer_id") ?? "";
    const withUsage = req.nextUrl.searchParams.get("with_usage") === "1";
    const fieldTemplates = await reportService.listFieldTemplates({
      customerId: customerId || undefined,
      withUsage,
    });
    return NextResponse.json({ ok: true, field_templates: fieldTemplates });
  } catch (error) {
    const httpError = toHttpError(error, "Failed to load field templates.");
    return NextResponse.json(
      { ok: false, error: httpError.message },
      { status: httpError.status },
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as { name?: string; field_catalog?: unknown[]; customer_id?: string };
    const result = await reportService.createFieldTemplate({
      name: body.name ?? "",
      fieldCatalog: Array.isArray(body.field_catalog) ? body.field_catalog : [],
      customerId: body.customer_id,
    });
    return NextResponse.json({ ok: true, field_template: result.template, field_templates: result.allTemplates });
  } catch (error) {
    const httpError = toHttpError(error, "Failed to create field template.");
    return NextResponse.json(
      { ok: false, error: httpError.message },
      { status: httpError.status },
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = (await req.json()) as { customer_id?: string; template_id?: string };
    const result = await reportService.attachTemplateToCustomer({
      customerId: body.customer_id ?? "",
      templateId: body.template_id ?? "",
    });
    return NextResponse.json({ ok: true, template_id: result.template_id, customer_id: result.customer_id });
  } catch (error) {
    const httpError = toHttpError(error, "Failed to attach field template.");
    return NextResponse.json(
      { ok: false, error: httpError.message },
      { status: httpError.status },
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      template_id?: string;
      name?: string;
      field_catalog?: unknown[];
    };
    const result = await reportService.updateFieldTemplate({
      templateId: body.template_id ?? "",
      name: body.name,
      fieldCatalog: Array.isArray(body.field_catalog) ? body.field_catalog : [],
    });
    return NextResponse.json({ ok: true, field_template: result.updated, field_templates: result.allTemplates });
  } catch (error) {
    const httpError = toHttpError(error, "Failed to update field template.");
    return NextResponse.json(
      { ok: false, error: httpError.message },
      { status: httpError.status },
    );
  }
}
