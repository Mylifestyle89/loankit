import { NextRequest, NextResponse } from "next/server";
import { requireEditorOrAdmin } from "@/lib/auth-guard";
import { importBkFileMulti } from "@/lib/import/bk-importer";

/**
 * POST /api/report/import/bk
 * Upload and import .BK file — returns ALL clients in the file
 */
export async function POST(request: NextRequest) {
  try {
    await requireEditorOrAdmin();
    const formData = await request.formData();
    const file = formData.get("bkFile") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (!file.name.endsWith(".bk") && file.type !== "application/json") {
      return NextResponse.json({ error: "File must be .bk or JSON format" }, { status: 400 });
    }

    const content = await file.text();
    const result = importBkFileMulti(content);

    return NextResponse.json(result, {
      status: result.status === "error" ? 400 : 200,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: `Server error: ${message}` }, { status: 500 });
  }
}
