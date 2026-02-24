import { NextResponse } from "next/server";

import { toHttpError } from "@/core/errors/app-error";
import { reportService } from "@/services/report.service";

export const runtime = "nodejs";

export async function GET() {
  try {
    const state = await reportService.getState();
    return NextResponse.json({ ok: true, state });
  } catch (error) {
    const httpError = toHttpError(error, "Failed to load state.");
    return NextResponse.json(
      {
        ok: false,
        error: httpError.message,
      },
      { status: httpError.status },
    );
  }
}
