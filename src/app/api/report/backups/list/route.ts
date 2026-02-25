import { NextResponse } from "next/server";
import { toHttpError } from "@/core/errors/app-error";
import { reportService } from "@/services/report.service";

export const runtime = "nodejs";

export async function GET() {
  try {
    const list = await reportService.listStateBackups();
    return NextResponse.json({ ok: true, backups: list });
  } catch (error) {
    const httpError = toHttpError(error, "Không thể liệt kê backup.");
    return NextResponse.json(
      { ok: false, error: httpError.message },
      { status: httpError.status },
    );
  }
}
