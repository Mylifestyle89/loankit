# Phase 1: KHCN Templates Page

**Priority:** High | **Effort:** M | **Status:** Pending

## Overview

Create `/report/khcn/templates` page listing all KHCN templates grouped by category with download/upload actions.

## Related Code Files

**Reuse:**
- `src/app/report/khdn/template/_components/template-file-actions.tsx` — Download + Upload buttons
- `src/lib/loan-plan/khcn-template-registry.ts` — KHCN_TEMPLATES, DOC_CATEGORY_LABELS

**Create:**
- `src/app/report/khcn/templates/page.tsx` — Templates management page

## Implementation

```tsx
// src/app/report/khcn/templates/page.tsx
"use client";

import { KHCN_TEMPLATES, DOC_CATEGORY_LABELS } from "@/lib/loan-plan/khcn-template-registry";
import { TemplateFileActions } from "@/app/report/khdn/template/_components/template-file-actions";

// Group templates by category
const grouped = KHCN_TEMPLATES.reduce((acc, t) => {
  (acc[t.category] ??= []).push(t);
  return acc;
}, {} as Record<string, typeof KHCN_TEMPLATES>);

// For each category, render section header + template list
// Each template row: name + TemplateFileActions (download + upload)
// TemplateFileActions needs: filePath (relative to report_assets/), fileName, onRefresh
```

### Key: TemplateFileActions reuse

`TemplateFileActions` expects `filePath` relative to `report_assets/`.
Registry paths are like `report_assets/KHCN templates/...`.
Strip `report_assets/` prefix: `t.path.replace("report_assets/", "")`.

### No editor needed

Pass `editorAvailable={false}` to hide editor button.
Pass `onRegisterTemplate={undefined}` to hide register button.

## Todo

- [ ] Create `src/app/report/khcn/templates/page.tsx`
- [ ] Group templates by category using DOC_CATEGORY_LABELS
- [ ] Render TemplateFileActions per template (download + upload only)
- [ ] Compile check

## Success Criteria

- [ ] Page shows all 65+ templates grouped by category
- [ ] Download button downloads correct DOCX file
- [ ] Upload button replaces file with auto-backup
- [ ] No editor/register buttons shown
