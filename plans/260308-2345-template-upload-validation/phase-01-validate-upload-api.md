# Phase 1: Validate-Upload API Endpoint

## Context

- [Brainstorm report](../reports/brainstorm-260308-2345-template-upload-validation.md)
- [template-parser.ts](../../src/lib/report/template-parser.ts) — `parseDocxPlaceholdersFromBuffer()`
- [placeholder-utils.ts](../../src/lib/report/placeholder-utils.ts) — `suggestAliasForPlaceholder()`
- [template.service.ts](../../src/services/report/template.service.ts) — `listFieldTemplates()`
- [save-docx/route.ts](../../src/app/api/report/template/save-docx/route.ts) — existing save endpoint

## Overview

- **Priority:** High
- **Status:** Pending
- **Effort:** 1.5h
- Create POST endpoint that accepts DOCX file + field_template_id, scans placeholders, validates against catalog, returns structured report.

## Key Insights

- `parseDocxPlaceholdersFromBuffer()` already handles split `<w:t>` fragments, XML entity decoding
- `suggestAliasForPlaceholder()` does substring matching — good enough for Phase 1, enhanced with Levenshtein in Phase 3
- Field catalog available via `reportService.listFieldTemplates()` or direct DB/state query
- Reuse same validation patterns as save-docx (path traversal, size limit, extension check)

## Red Team Fixes Applied

- **[RT-2] Zip bomb protection:** Check `buffer.byteLength` before JSZip parsing, cap decompressed XML size
- **[RT-3] False positive filtering:** Add heuristic to skip placeholders that look like natural text (contains spaces, >50 chars, Vietnamese common words)
- **[RT-6] Invalid field_template_id:** Return 404 error instead of empty catalog
- **[RT-7] Error handling:** Wrap entire handler in try-catch with `toHttpError()`
- **[RT-9] Efficient field lookup:** Use `getFieldTemplateById()` or filter by ID server-side instead of loading all templates

## Requirements

### Functional
- Accept multipart FormData: `file` (DOCX blob) + `field_template_id` (string)
- Scan all `[placeholder]` patterns from uploaded DOCX buffer
- **Filter false positives:** Skip placeholders that contain spaces, are >50 chars, or match common Vietnamese text patterns (e.g. `[Ghi chú]`, `[Nguồn: ...]`)
- Compare against field catalog from specified field template
- Return validation report with 3 categories: valid, unknown, missing
- For unknown placeholders, return suggestion list from `suggestAliasForPlaceholder()`
- Return 404 if `field_template_id` not found (don't silently return empty catalog)

### Non-Functional
- Max 20MB file size (consistent with save-docx)
- Response time < 3s for typical templates
- No file persistence in this endpoint (save happens separately via save-docx)

## Architecture

### Response Schema

```typescript
type ValidationReport = {
  ok: true;
  total_placeholders: number;
  total_catalog_fields: number;
  valid: { placeholder: string; field_key: string; label_vi: string }[];
  unknown: { placeholder: string; suggestions: string[] }[];
  missing: { field_key: string; label_vi: string; group: string }[];
};
```

### Data Flow

```
POST /api/report/template/validate-upload
  → Parse FormData (file + field_template_id)
  → Validate: .docx extension, size ≤ 20MB, field_template_id exists
  → parseDocxPlaceholdersFromBuffer(buffer)
  → Load field catalog for field_template_id
  → Build fieldKeySet from catalog
  → For each placeholder:
    - If in fieldKeySet → valid[]
    - Else → unknown[] + suggestAliasForPlaceholder()
  → For each catalog field not in placeholders → missing[]
  → Return ValidationReport
```

## Related Code Files

### Create
- `src/app/api/report/template/validate-upload/route.ts` — POST endpoint

### Modify
- None (all building blocks exist)

## Implementation Steps

1. Create directory `src/app/api/report/template/validate-upload/`
2. Create `route.ts` with POST handler:
   - Parse `FormData` from request body
   - Extract `file` (Blob) and `field_template_id` (string)
   - Validate file: must be `.docx`, ≤ 20MB
   - Convert file to Buffer
   - Call `parseDocxPlaceholdersFromBuffer(buffer)` to get placeholder list
   - Load field catalog: query by `field_template_id` using `reportService.listFieldTemplates()` or direct DB query
   - Build `fieldKeyMap: Map<string, FieldCatalogItem>` from catalog
   - Categorize each placeholder: valid (exists in map) or unknown (+ suggestions)
   - Compute missing: catalog fields not found in placeholder set
   - Return JSON response

### Code Snippet

```typescript
import { NextRequest, NextResponse } from "next/server";
import { parseDocxPlaceholdersFromBuffer } from "@/lib/report/template-parser";
import { suggestAliasForPlaceholder } from "@/lib/report/placeholder-utils";
import { reportService } from "@/services/report.service";

export const runtime = "nodejs";
const MAX_FILE_SIZE = 20 * 1024 * 1024;

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const fieldTemplateId = formData.get("field_template_id") as string;

    // Validate file
    if (!file || !file.name.toLowerCase().endsWith(".docx")) {
      return NextResponse.json({ ok: false, error: "Must upload a .docx file." }, { status: 400 });
    }
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ ok: false, error: "File too large (max 20MB)." }, { status: 413 });
    }

    // [RT-6] Validate field_template_id exists
    const templates = await reportService.listFieldTemplates({});
    const template = templates.find(t => t.id === fieldTemplateId);
    if (!template) {
      return NextResponse.json({ ok: false, error: "Field template not found." }, { status: 404 });
    }

    // Parse placeholders
    const buffer = Buffer.from(await file.arrayBuffer());
    const rawPlaceholders = await parseDocxPlaceholdersFromBuffer(buffer);

    // [RT-3] Filter false positives: skip natural text in brackets
    const placeholders = rawPlaceholders.filter(ph =>
      !ph.includes(" ") && ph.length <= 50 && /^[a-zA-Z0-9_.\-]+$/.test(ph)
    );

    // Load field catalog
    const catalog = template.field_catalog ?? [];
    const fieldKeyMap = new Map(catalog.map(f => [f.field_key, f]));
    const fieldKeys = catalog.map(f => f.field_key);

    // Categorize
    const valid = [];
    const unknown = [];
    const placeholderSet = new Set(placeholders);

    for (const ph of placeholders) {
      const field = fieldKeyMap.get(ph);
      if (field) {
        valid.push({ placeholder: ph, field_key: field.field_key, label_vi: field.label_vi });
      } else {
        unknown.push({ placeholder: ph, suggestions: suggestAliasForPlaceholder(ph, fieldKeys) });
      }
    }

    const missing = catalog
      .filter(f => !placeholderSet.has(f.field_key))
      .map(f => ({ field_key: f.field_key, label_vi: f.label_vi, group: f.group }));

    return NextResponse.json({
      ok: true,
      total_placeholders: placeholders.length,
      total_catalog_fields: catalog.length,
      valid, unknown, missing,
    });
  } catch (error) {
    // [RT-7] Proper error handling
    const httpError = toHttpError(error, "Failed to validate template.");
    return NextResponse.json({ ok: false, error: httpError.message }, { status: httpError.status });
  }
}
```

## Todo List

- [ ] Create `validate-upload/route.ts` with POST handler
- [ ] Add FormData parsing (file + field_template_id)
- [ ] Add file validation (extension, size)
- [ ] Integrate `parseDocxPlaceholdersFromBuffer()`
- [ ] Load field catalog by template ID
- [ ] Build categorization logic (valid/unknown/missing)
- [ ] Add suggestion generation for unknown placeholders
- [ ] Test with sample DOCX files

## Success Criteria

- POST endpoint returns correct ValidationReport JSON
- Valid placeholders correctly matched to catalog
- Unknown placeholders include relevant suggestions
- Missing fields accurately computed
- Handles edge cases: empty template, no placeholders, invalid field_template_id

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| DOCX parsing fails on complex files | Medium | `parseDocxPlaceholdersFromBuffer()` already handles split `<w:t>`, proven in production |
| Field template not found | Low | Return empty catalog, still show placeholders as "all unknown" |
| Large file slow parsing | Low | 20MB cap, JSZip is efficient for in-memory parsing |

## Security

- No file persistence in this endpoint (read-only scan)
- Same size limits as save-docx
- No path traversal risk (no filesystem writes)
- FormData parsing via standard Web API
