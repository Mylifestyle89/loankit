import { NextRequest, NextResponse } from "next/server";
import { toHttpError } from "@/core/errors/app-error";
import { reportService } from "@/services/report.service";

export async function POST(req: NextRequest) {
  try {
    const data = await req.json();
    const imported = await reportService.importData(data);
    return NextResponse.json({ ok: true, imported });
  } catch (error) {
    const httpError = toHttpError(error, "Nhập dữ liệu thất bại");
    return NextResponse.json({ ok: false, error: httpError.message }, { status: httpError.status });
  }
}
