import { NextRequest, NextResponse } from "next/server";
import { toHttpError } from "@/core/errors/app-error";
import { reportService } from "@/services/report.service";

export async function GET() {
  try {
    const stream = await reportService.exportDataStream();
    return new NextResponse(stream, {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="data_export_${Date.now()}.json"`,
      },
    });
  } catch (error) {
    const httpError = toHttpError(error, "Failed to export data");
    return NextResponse.json({ ok: false, error: httpError.message }, { status: httpError.status });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as { customerIds?: string[]; templateIds?: string[] };
    const stream = await reportService.exportDataStream({
      customerIds: Array.isArray(body.customerIds) ? body.customerIds : [],
      templateIds: Array.isArray(body.templateIds) ? body.templateIds : [],
    });
    return new NextResponse(stream, {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="data_export_${Date.now()}.json"`,
      },
    });
  } catch (error) {
    const httpError = toHttpError(error, "Failed to export data");
    return NextResponse.json({ ok: false, error: httpError.message }, { status: httpError.status });
  }
}
