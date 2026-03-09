import { NextRequest, NextResponse } from "next/server";

import { toHttpError } from "@/core/errors/app-error";
import { withRateLimit } from "@/lib/api-helpers";
import { parseDocxPlaceholdersFromBuffer } from "@/lib/report/template-parser";

export const runtime = "nodejs";

/** Max template size 10MB — prevents OOM on oversized uploads. */
const MAX_TEMPLATE_SIZE = 10 * 1024 * 1024;

export const POST = withRateLimit("suggest")(async (req: NextRequest) => {
  try {
    const formData = await req.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof Blob)) {
      return NextResponse.json({ ok: false, error: "No DOCX file provided." }, { status: 400 });
    }

    if (file.size > MAX_TEMPLATE_SIZE) {
      return NextResponse.json({ ok: false, error: "Template file too large (>10MB)." }, { status: 413 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    // JSZip throws if buffer is not a valid ZIP/DOCX — implicit format validation
    const placeholders = await parseDocxPlaceholdersFromBuffer(buffer);

    return NextResponse.json({ ok: true, placeholders, count: placeholders.length });
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("[template-fields] Error:", error);
    }
    const httpError = toHttpError(error, "Failed to extract template fields.");
    return NextResponse.json(
      { ok: false, error: httpError.message },
      { status: httpError.status },
    );
  }
});
