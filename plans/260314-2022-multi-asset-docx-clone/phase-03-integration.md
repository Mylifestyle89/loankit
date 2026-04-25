---
phase: 3
title: "Integration into Generate Flow"
status: pending
effort: 0.5h
---

# Phase 3: Integration into Generate Flow

## Context
- [khcn-report.service.ts](../../src/services/khcn-report.service.ts) — `generateKhcnReport()`
- [docx-engine.ts](../../src/lib/docx-engine.ts) — `generateDocxBuffer()`
- [khcn-asset-template-registry.ts](../../src/lib/loan-plan/khcn-asset-template-registry.ts) — `ASSET_CATEGORY_KEYS`

## Overview
Wire the section cloner into the generate pipeline. When template belongs to an asset category, detect prefix, get collateral count, clone sections before docxtemplater render.

## Architecture

Flow change in `generateDocxBuffer` (or a wrapper):
```
1. Load template zip
2. IF asset template:
   a. Detect prefix from category
   b. Get count from data
   c. Call cloneSectionsForAssets(zip, prefix, count)
3. Render with docxtemplater (existing)
```

Best integration point: **khcn-report.service.ts** `generateKhcnReport()` — it knows the template category context. Add a new function or extend `generateDocxBuffer` with optional pre-process hook.

**Chosen approach:** Add `preProcessZip` optional callback to `generateDocxBuffer`. This keeps docx-engine generic. The KHCN service passes the cloner as pre-processor when needed.

## Related Code Files
- **Modify:** `src/lib/docx-engine.ts` — add optional `preProcessZip` param to `generateDocxBuffer`
- **Modify:** `src/services/khcn-report.service.ts` — detect asset template, pass cloner
- **Read:** `src/lib/loan-plan/khcn-asset-template-registry.ts` — category detection

## Implementation Steps

1. Add to `docx-engine.ts` `generateDocxBuffer` signature: optional `options?: { preProcessZip?: (zip: PizZip) => void }`
2. Call `preProcessZip(zip)` after PizZip load, before Docxtemplater init
3. In `khcn-report.service.ts`:
   a. Import `ASSET_CATEGORY_KEYS` and `cloneSectionsForAssets`
   b. Import `COLLATERAL_PREFIX_MAP`, `getCollateralCountByPrefix`
   c. Detect if `templatePath` matches an asset category (lookup in ASSET_TEMPLATES)
   d. If yes: determine prefix from category, get count from collaterals
   e. Pass `preProcessZip: (zip) => cloneSectionsForAssets(zip, prefix, count)` to engine
4. Add category detection helper: match templatePath → find in ASSET_TEMPLATES → get category → map to prefix

## Todo List
- [ ] Add `preProcessZip` option to `generateDocxBuffer`
- [ ] Add category-to-prefix detection in khcn-report.service
- [ ] Wire cloner into generate flow
- [ ] Test with 1, 2, 3 collaterals

## Success Criteria
- Template in `ts_qsd_bv` category with 2 land collaterals → DOCX has 2 copies of body with `SĐ_1.*` and `SĐ_2.*` filled
- Non-asset templates unchanged
- Single collateral → identical output to current

## Risk Assessment
- Template path matching: some templates in `tai_san` (common) category apply to ALL types — these should NOT clone. Only type-specific categories (qsd_bv, ptgt_bv, etc.) should trigger cloning
- Need to map category → collateral_type → prefix correctly
