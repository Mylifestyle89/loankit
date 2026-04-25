# Brainstorm: KHCN Template Validation Layer

**Date:** 2026-03-24 | **Status:** Agreed

---

## Problem Statement

KHCN template system is brittle — adding new business types (cát tường, nhà kính, etc.) or placeholders easily breaks the app because 3 tightly-coupled layers have zero cross-validation:

1. **Template Registry** (`khcn-template-registry.ts`) — which DOCX files, which loan methods
2. **Placeholder Registry** (`khcn-placeholder-registry.ts`) — which fields exist, which groups
3. **Data Builders** (`khcn-report-data-builders.ts`) — query DB, format values for each placeholder

Missing 1 entry in any layer → silent failure or runtime crash. Debug takes hours.

## Constraints

- **Who adds templates:** Dev/Admin via config (not end-user UI)
- **Frequency:** 1-2 times/year (rare)
- **Must keep:** Auto-populate from DB (KHCN's key advantage over KHDN)
- **Approach:** Validation Layer — fix brittleness, don't over-engineer

## Evaluated Approaches

| Approach | Effort | Flexibility | Risk | Verdict |
|----------|--------|-------------|------|---------|
| **A: Validation Layer** | Small (2-3d) | Low | Low | **Chosen** — KISS, fixes root cause |
| B: Config-driven Registry | Medium (1w) | Medium | Medium | Good but YAGNI for 1-2x/year changes |
| C: KHDN-lite for KHCN | Large (2-3w) | High | High | Over-engineered for current needs |
| A+B combined | Medium | Medium | Low | Future option if frequency increases |

## Recommended Solution: Validation Layer

### What It Does

A validation script that cross-checks all 3 layers and reports mismatches **before** they reach production:

```
[KHCN Template Validator]
✔ 48/48 DOCX files exist on filesystem
✔ 156/156 placeholder tags found in DOCX templates
✘ Missing data builder for: [NHÀ_KÍNH.Diện tích]
  → Add to: khcn-report-data-builders.ts
  → Used by: 2268.02C BCDXCV trung dai han nha kinh.docx
✘ Orphan tag in DOCX: [HĐTD.Ngày ký old]
  → No placeholder registered, will render blank
  → File: 2268.06E HDTD vay tung lan co TSBD.docx
```

### Where It Runs

1. **Dev server startup** (`next dev`) → console warnings, doesn't block
2. **Build time** (`next build`) → errors, blocks deploy if critical mismatches

### Validation Checks

| Check | Severity | Description |
|-------|----------|-------------|
| DOCX file exists | ERROR | Template registry references file not on disk |
| Placeholder has builder | WARNING | Registry has placeholder but no data builder produces it |
| DOCX tag has placeholder | WARNING | Tag `[XYZ]` in DOCX but not in placeholder registry |
| Builder output not used | INFO | Data builder produces key no template uses |
| Method filter valid | ERROR | Template method references non-existent loan method |
| Loop config valid | ERROR | Repeater field configured but no matching loop builder |

### Implementation Plan

**Phase 1: DOCX Tag Scanner** (scan DOCX files → extract all `[placeholder]` tags)
- Read each DOCX in registry → parse word/document.xml → regex extract `[tags]`
- Cache results (file hash → tags) to avoid re-scanning unchanged files

**Phase 2: Cross-validation engine**
- Compare: registry placeholders ↔ DOCX tags ↔ data builder output keys
- Report mismatches with actionable messages (which file, which line)

**Phase 3: Integration**
- Dev: run on server startup via instrumentation hook or custom script
- Build: add as pre-build step in `package.json`
- Optional: add as pre-commit hook for safety

### Key Files to Create/Modify

| File | Action |
|------|--------|
| `src/lib/report/khcn-template-validator.ts` | NEW — validation engine |
| `package.json` | ADD — `validate:khcn` script, pre-build hook |
| `src/lib/report/khcn-placeholder-registry.ts` | READ — source of placeholder definitions |
| `src/lib/loan-plan/khcn-template-registry.ts` | READ — source of template→method mapping |
| `src/services/khcn-report-data-builders.ts` | READ — source of data builder keys |

### Success Criteria

- Dev adds new placeholder → validation tells exactly what's missing within seconds
- Dev adds new DOCX template → validation checks all tags are covered
- Build fails if critical mismatch exists → prevents broken deploy
- Zero false positives on current codebase (all existing templates pass)

## Future Evolution Path

If template frequency increases or power users need self-service:
1. **Phase 2:** Move registries to JSON config (Approach B) — still validated
2. **Phase 3:** Admin UI for template management (Approach C) — if business demands

Each phase builds on the validation layer, not replaces it.

## Risks

| Risk | Mitigation |
|------|------------|
| DOCX scanning slow on 48+ files | Cache by file hash, only rescan changed files |
| False positives on dynamic placeholders | Allowlist for known dynamic patterns (SĐ_1., ĐS_1., etc.) |
| Validator itself has bugs | Write unit tests for validator against known-good state |
