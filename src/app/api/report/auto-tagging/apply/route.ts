import { NextResponse } from "next/server";
import fs from "node:fs/promises";
import path from "node:path";
import { z } from "zod";

import { withValidatedBody } from "@/lib/api-helpers";
import { withErrorHandling } from "@/lib/api/with-error-handling";
import { requireEditorOrAdmin } from "@/lib/auth-guard";
import { REPORT_ASSETS_BASE, validatePathUnderBase } from "@/lib/report/path-validation";
import { replaceWithTags, saveTemplate, type TagFormat } from "@/services/auto-tagging.service";

export const runtime = "nodejs";

const applySchema = z.object({
  docxPath: z.string().min(1),
  accepted: z
    .array(
      z.object({
        header: z.string(),
        matchedText: z.string(),
      }),
    )
    .min(1),
  format: z.enum(["square", "curly"]).optional(),
  outputName: z.string().optional(),
});

export const POST = withErrorHandling(
  withValidatedBody(applySchema, async (body) => {
    const session = await requireEditorOrAdmin();
    const safePath = validatePathUnderBase(body.docxPath, REPORT_ASSETS_BASE);
    const absolute = path.join(process.cwd(), safePath);
    const docxBuffer = await fs.readFile(absolute);

    const taggedBuffer = await replaceWithTags(docxBuffer, body.accepted, (body.format ?? "square") as TagFormat);
    const { templatePath, downloadUrl } = await saveTemplate(taggedBuffer, body.outputName, session.user.id);

    return NextResponse.json({ ok: true, templatePath, downloadUrl });
  }),
);
