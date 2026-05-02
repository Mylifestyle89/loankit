import { NextResponse } from "next/server";

import { toHttpError } from "@/core/errors/app-error";
import { requireEditorOrAdmin, handleAuthError } from "@/lib/auth-guard";
import { listTemplateFolderFiles } from "@/services/report/template-folder.service";

export const runtime = "nodejs";

export async function GET() {
  try {
    await requireEditorOrAdmin();
    const tree = await listTemplateFolderFiles();
    return NextResponse.json({ ok: true, tree });
  } catch (error) {
    const authResp = handleAuthError(error);
    if (authResp) return authResp;
    const httpError = toHttpError(error, "Failed to list template folder files.");
    return NextResponse.json(
      { ok: false, error: httpError.message },
      { status: httpError.status },
    );
  }
}
