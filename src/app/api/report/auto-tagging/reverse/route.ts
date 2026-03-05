import { NextRequest, NextResponse } from "next/server";
import fs from "node:fs/promises";
import path from "node:path";

import { toHttpError, ValidationError } from "@/core/errors/app-error";
import { REPORT_ASSETS_BASE, validatePathUnderBase } from "@/lib/report/path-validation";
import { reverseEngineerTemplate } from "@/services/auto-tagging.service";

export const runtime = "nodejs";

type ReverseBody = {
  docxPath?: string;
  excelRows?: Array<Record<string, unknown>>;
  threshold?: number;
};

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as ReverseBody;
    if (!body.docxPath || typeof body.docxPath !== "string") {
      throw new ValidationError("docxPath is required.");
    }
    if (!Array.isArray(body.excelRows) || body.excelRows.length === 0) {
      throw new ValidationError("excelRows is required.");
    }
    validatePathUnderBase(body.docxPath, REPORT_ASSETS_BASE);
    const resolvedPath = path.resolve(process.cwd(), body.docxPath);
    const docxBuffer = await fs.readFile(resolvedPath);
    const result = await reverseEngineerTemplate({
      docxBuffer,
      excelRows: body.excelRows,
      threshold: body.threshold,
    });
    return NextResponse.json({
      ok: true,
      suggestions: result.suggestions,
      meta: result.meta,
    });
  } catch (error) {
    const httpError = toHttpError(error, "Reverse template analysis failed.");
    return NextResponse.json(
      { ok: false, error: httpError.message, details: httpError.details },
      { status: httpError.status },
    );
  }
}
