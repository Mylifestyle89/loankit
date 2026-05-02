import { NextRequest, NextResponse } from "next/server";
import { toHttpError } from "@/core/errors/app-error";
import { requireEditorOrAdmin, handleAuthError } from "@/lib/auth-guard";
import { parseApcFile } from "@/lib/import/apc-parser";

/**
 * POST /api/report/import/apc
 * Upload and parse .APC template schema file.
 * Returns parsed field definitions, asset categories, and document list.
 */
export async function POST(request: NextRequest) {
  try {
    await requireEditorOrAdmin();
    const formData = await request.formData();
    const file = formData.get("apcFile") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (!file.name.endsWith(".apc") && file.type !== "application/json") {
      return NextResponse.json({ error: "File must be .apc or JSON format" }, { status: 400 });
    }

    const content = await file.text();
    const result = parseApcFile(content);

    return NextResponse.json(result, {
      status: result.status === "error" ? 400 : 200,
    });
  } catch (error) {
    const authResponse = handleAuthError(error);
    if (authResponse) return authResponse;
    console.error("[import/apc]", error);
    const httpError = toHttpError(error, "Server error.");
    return NextResponse.json({ error: httpError.message }, { status: httpError.status });
  }
}
