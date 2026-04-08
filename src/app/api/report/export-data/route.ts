import { NextRequest, NextResponse } from "next/server";
import { toHttpError } from "@/core/errors/app-error";
import { handleAuthError, requireEditorOrAdmin } from "@/lib/auth-guard";
import { reportService } from "@/services/report.service";
import { exportCustomersToXlsx } from "@/services/report/customer-xlsx-io.service";

export async function GET() {
  try {
    // Bulk PII export — viewer role explicitly excluded. Editor/admin only.
    await requireEditorOrAdmin();
    const stream = await reportService.exportDataStream();
    return new NextResponse(stream, {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="data_export_${Date.now()}.json"`,
      },
    });
  } catch (error) {
    const authResponse = handleAuthError(error);
    if (authResponse) return authResponse;
    const httpError = toHttpError(error, "Failed to export data");
    return NextResponse.json({ ok: false, error: httpError.message }, { status: httpError.status });
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireEditorOrAdmin();
    const body = (await req.json()) as {
      customerIds?: string[];
      templateIds?: string[];
      format?: "json" | "xlsx";
      includeRelations?: boolean;
    };

    const format = body.format ?? "json";
    const includeRelations = body.includeRelations ?? true;

    if (format === "xlsx") {
      // XLSX export: fetch full data then convert to workbook
      const data = await reportService.exportData({
        customerIds: Array.isArray(body.customerIds) ? body.customerIds : [],
        templateIds: Array.isArray(body.templateIds) ? body.templateIds : [],
      });
      const xlsxBuffer = exportCustomersToXlsx(data.customers);
      return new NextResponse(new Uint8Array(xlsxBuffer), {
        headers: {
          "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": `attachment; filename="data_export_${Date.now()}.xlsx"`,
        },
      });
    }

    // JSON export (streaming)
    const stream = await reportService.exportDataStream({
      customerIds: Array.isArray(body.customerIds) ? body.customerIds : [],
      templateIds: Array.isArray(body.templateIds) ? body.templateIds : [],
      includeRelations,
    });
    return new NextResponse(stream, {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="data_export_${Date.now()}.json"`,
      },
    });
  } catch (error) {
    const authResponse = handleAuthError(error);
    if (authResponse) return authResponse;
    const httpError = toHttpError(error, "Failed to export data");
    return NextResponse.json({ ok: false, error: httpError.message }, { status: httpError.status });
  }
}
