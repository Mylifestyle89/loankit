# Phase 3: Integration — Dev Startup + Build Scripts

**Priority:** Medium | **Status:** pending | **Effort:** 0.5d | **Depends on:** Phase 2

## Overview

Wire the validator into two trigger points:
1. `next dev` startup → console warnings (non-blocking)
2. `next build` / npm script → errors block deploy

## Related Files

- `src/lib/report/khcn-template-validator.ts` — from Phase 2
- `package.json` — add scripts
- `src/instrumentation.ts` — Next.js instrumentation hook (if exists)

## Implementation Steps

### 1. Create CLI runner script `scripts/validate-khcn-templates.ts`

Standalone Node script that:
1. Imports `validateKhcnTemplates()` from Phase 2
2. Runs validation
3. Prints formatted report to console
4. Exits with code 1 if any errors (severity=error)

```typescript
// scripts/validate-khcn-templates.ts
// Run with: npx tsx scripts/validate-khcn-templates.ts
//
// Output format:
// [KHCN Validator] Checking 159 templates...
// ✔ 159/159 DOCX files exist
// ✔ 22 placeholder groups validated
// ⚠ WARNING: ORPHAN_DOCX_TAG — [OLD_FIELD] in 2268.06E.docx not in registry
// ✘ ERROR: MISSING_FILE — report_assets/KHCN templates/.../missing.docx
//
// Summary: 1 error, 1 warning, 0 info
// Exit code: 1 (has errors)
```

### 2. Add npm scripts to `package.json`

```json
{
  "scripts": {
    "validate:khcn": "tsx scripts/validate-khcn-templates.ts",
    "prebuild": "tsx scripts/validate-khcn-templates.ts"
  }
}
```

- `npm run validate:khcn` — manual run anytime
- `prebuild` — auto-runs before `next build`, blocks deploy if errors

### 3. Dev startup integration (optional, lightweight)

Add validation call in Next.js instrumentation hook (runs once on server start):

```typescript
// src/instrumentation.ts
export async function register() {
  if (process.env.NODE_ENV === "development") {
    const { validateKhcnTemplates } = await import("@/lib/report/khcn-template-validator");
    const report = await validateKhcnTemplates();
    if (report.issues.length > 0) {
      console.warn(`\n⚠ [KHCN Validator] ${report.stats.errors} errors, ${report.stats.warnings} warnings`);
      for (const issue of report.issues.filter(i => i.severity !== "info")) {
        const icon = issue.severity === "error" ? "✘" : "⚠";
        console.warn(`  ${icon} ${issue.code}: ${issue.message}`);
      }
      console.warn("");
    }
  }
}
```

**Note:** Only in development. Production relies on prebuild check.

### 4. Console output formatting

Use ANSI colors for terminal readability:
- Red for errors
- Yellow for warnings
- Green for passed checks
- Dim for info

Keep it simple — `console.log` with escape codes, no chalk dependency.

## Todo

- [ ] Create `scripts/validate-khcn-templates.ts` CLI runner
- [ ] Add `validate:khcn` + `prebuild` scripts to package.json
- [ ] Add dev-time validation in instrumentation.ts (dev only)
- [ ] Format console output with ANSI colors
- [ ] Test: `npm run validate:khcn` passes on current codebase
- [ ] Test: `npm run build` includes validation step
- [ ] Test: inject error → build fails with clear message

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Validator slows dev startup | Run async, non-blocking, dev-only |
| Validator slows build | ~2-3s for 159 DOCX files — acceptable |
| tsx not installed | Already in devDependencies (Next.js project) |
| instrumentation.ts conflicts | Check if file exists first, merge carefully |
| prebuild blocks unrelated builds | Validator errors = template issues only, not false positives |

## Success Criteria

- `npm run validate:khcn` runs clean on current codebase
- `npm run build` passes (prebuild validator runs + next build)
- Dev server shows warnings in console on startup
- Inject missing DOCX → build fails with "MISSING_FILE" error
- Zero impact on production runtime performance
