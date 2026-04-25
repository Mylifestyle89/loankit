# Phase 2: Cross-Validation Engine

**Priority:** High | **Status:** pending | **Effort:** 1d | **Depends on:** Phase 1

## Overview

Compare 3 layers (template registry, placeholder registry, data builders) and report mismatches with actionable messages.

## Context

### Layer 1: Template Registry
- `KHCN_TEMPLATES` (62 items) + `ASSET_TEMPLATES` (97 items)
- Each has: path, name, category, methods[]
- Valid methods: `tung_lan`, `han_muc`, `trung_dai`, `tieu_dung`, or empty (= all)
- Valid categories: 7 main + 7 asset (from DOC_CATEGORY_LABELS + ASSET_CATEGORY_LABELS)

### Layer 2: Placeholder Registry
- `KHCN_PLACEHOLDER_GROUPS` — 22 groups
- Each has: label, prefix?, items[], loop?
- Full placeholder key = `${prefix}.${item}` or just `${item}` (no prefix)

### Layer 3: Data Builders
- 15+ builder functions in `khcn-report-data-builders.ts` (re-exports from 9 modules)
- `buildKhcnReportData()` in `khcn-report.service.ts` — orchestrator
- Produces: flat keys, prefixed keys, indexed keys (PREFIX_N.*), loop arrays

## Related Files

- Phase 1 scanner output: `Map<filePath, DocxTagScanResult>`
- `src/lib/loan-plan/khcn-template-registry.ts` — KHCN_TEMPLATES, DOC_CATEGORY_LABELS
- `src/lib/loan-plan/khcn-asset-template-registry.ts` — ASSET_TEMPLATES, ASSET_CATEGORY_KEYS
- `src/lib/report/khcn-placeholder-registry.ts` — KHCN_PLACEHOLDER_GROUPS
- `src/services/khcn-report-data-builders.ts` — builder exports
- `src/services/khcn-report.service.ts` — buildKhcnReportData

## Implementation Steps

### 1. Create `src/lib/report/khcn-template-validator.ts`

Main export: `validateKhcnTemplates(): ValidationReport`

```typescript
type ValidationIssue = {
  severity: "error" | "warning" | "info";
  code: string;           // e.g., "MISSING_FILE", "ORPHAN_TAG"
  message: string;        // Human-readable
  file?: string;          // Related DOCX or TS file
  field?: string;         // Related placeholder
};

type ValidationReport = {
  issues: ValidationIssue[];
  stats: {
    templatesChecked: number;
    tagsScanned: number;
    placeholdersRegistered: number;
    errors: number;
    warnings: number;
  };
};
```

### 2. Validation checks to implement

| Code | Severity | Check | How |
|------|----------|-------|-----|
| `MISSING_FILE` | error | DOCX file doesn't exist on disk | Check `fs.existsSync(resolveWorkspacePath(path))` |
| `INVALID_METHOD` | error | Template method not in known set | Compare vs `{tung_lan, han_muc, trung_dai, tieu_dung}` |
| `INVALID_CATEGORY` | error | Category not in DOC_CATEGORY_LABELS ∪ ASSET_CATEGORY_LABELS | Set lookup |
| `ORPHAN_DOCX_TAG` | warning | Tag `[X]` in DOCX but not in placeholder registry | Scan result tags ∖ registry keys |
| `MISSING_BUILDER` | warning | Placeholder in registry but not produced by any builder | Registry keys ∖ builder output keys |
| `LOOP_MISMATCH` | error | Registry declares loop but no `[#LOOP]` found in any DOCX | Loop names ∖ scan loopOpens |
| `DUPLICATE_PATH` | warning | Same DOCX path registered twice | Set check across both registries |

### 3. Extract builder output keys (static analysis)

Can't run builders without DB. Instead, extract keys statically:

**Option A (chosen):** Maintain an exported `KNOWN_BUILDER_KEYS` set in a companion file. Updated when builders change. Validator checks this set exists and is up-to-date.

**Option B (future):** AST analysis of builder functions to extract key assignments. Too complex for now — YAGNI.

Approach: Create `src/lib/report/khcn-known-builder-keys.ts` that exports a `Set<string>` of all keys produced by builders. Add a comment instructing devs to update when adding new fields.

### 4. Allowlist for dynamic patterns

Some tags are dynamic (generated at runtime by section cloner):
- `SĐ_1.`, `SĐ_2.`, ... → base pattern `SĐ.`
- `ĐS_1.`, `ĐS_2.`, ... → base pattern `ĐS.`
- `ĐSH_1.`, `ĐSH_2.`, ... → base pattern `ĐSH.`

Validator normalizes indexed tags before comparison:
```typescript
function normalizeTag(tag: string): string {
  return tag.replace(/^([A-ZĐ]+)_\d+\./, "$1.");
}
```

### 5. Build registry key set from placeholder groups

```typescript
function getRegistryKeys(): Set<string> {
  const keys = new Set<string>();
  for (const group of KHCN_PLACEHOLDER_GROUPS) {
    for (const item of group.items) {
      keys.add(group.prefix ? `${group.prefix}.${item}` : item);
    }
  }
  return keys;
}
```

## Todo

- [ ] Create `khcn-template-validator.ts` with `validateKhcnTemplates()`
- [ ] Implement all 7 validation checks
- [ ] Create `khcn-known-builder-keys.ts` from current builder analysis
- [ ] Add tag normalization for indexed patterns
- [ ] Build registry key extraction from KHCN_PLACEHOLDER_GROUPS
- [ ] Write unit tests: known-good state = 0 errors, inject fault = detected
- [ ] Spot-check: run against current codebase, verify 0 false positives

## Success Criteria

- Current codebase: 0 errors, minimal warnings (orphan tags from legacy templates OK)
- Inject missing file → detected as MISSING_FILE error
- Inject invalid method → detected as INVALID_METHOD error
- Inject orphan placeholder → detected as ORPHAN_DOCX_TAG warning
- Report is human-readable with actionable fix suggestions
