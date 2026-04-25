# Phase 3: Template Registry + DOCX Templates

## Overview
- **Priority**: P2
- **Status**: pending
- **Est**: 1h

Register new template categories for GTCG collateral and unsecured loans. Create placeholder DOCX templates or map to existing ones.

## Key Insights
- No existing DOCX templates found for "cam co GTCG" or "vay khong TSBD" in `report_assets/`
- Template registry is in `khcn-template-registry.ts` (general) + `khcn-asset-template-registry.ts` (asset-specific)
- Asset cloner uses `CATEGORY_TO_PREFIX` and `CATEGORY_TO_COLLATERAL_TYPE` in `docx-section-cloner.ts`
- GTCG templates would use TK.* prefix (same as tiet_kiem) -> cloner mapping needed
- Unsecured HDTD templates: existing "co TSBD" templates won't work -- need "khong TSBD" variants
- **User must provide actual DOCX template files** -- we can only register paths and create the folder structure

## Related Code Files

### Modify
1. `src/lib/loan-plan/khcn-asset-template-registry.ts`
   - Add GTCG category entries (cam co GTCG folder)
   - Add to `ASSET_CATEGORY_KEYS` and `ASSET_CATEGORY_LABELS`

2. `src/lib/loan-plan/khcn-template-registry.ts`
   - Add unsecured HDTD template entries (if templates provided)
   - Possibly add method filter or collateral-type filter logic

3. `src/lib/docx-section-cloner.ts`
   - Add GTCG category to `CATEGORY_TO_PREFIX` -> "TK"
   - Add GTCG category to `CATEGORY_TO_COLLATERAL_TYPE` -> "tiet_kiem"

4. `src/services/khcn-report.service.ts`
   - When `is_unsecured`, select unsecured-specific HDTD template variant
   - Or: template selection logic in UI already handles this (user picks template)

### Create (folder structure only)
- `report_assets/KHCN templates/Ho so tai san/Cam co giay to co gia/` — GTCG template folder
- `report_assets/KHCN templates/Hop dong tin dung/` — unsecured HDTD templates (when provided)

## Implementation Steps

### Step 1: GTCG Template Registration
1. Create folder: `report_assets/KHCN templates/Ho so tai san/Cam co giay to co gia/`
2. In `khcn-asset-template-registry.ts`:
   ```ts
   const CCGTCG = `${TS}/Cam co giay to co gia`;
   ```
3. Add category entries (placeholder until DOCX files provided):
   ```ts
   // Cam co GTCG
   { path: `${CCGTCG}/HD cam co GTCG.docx`, name: "HD cam co GTCG", category: "ts_cc_gtcg", methods: [] },
   ```
4. Add to `ASSET_CATEGORY_KEYS`: `"ts_cc_gtcg"`
5. Add to `ASSET_CATEGORY_LABELS`: `ts_cc_gtcg: "Cam co GTCG"`

### Step 2: Cloner Mapping
1. In `docx-section-cloner.ts`, add:
   ```ts
   CATEGORY_TO_PREFIX: { ts_cc_gtcg: "TK" }
   CATEGORY_TO_COLLATERAL_TYPE: { ts_cc_gtcg: "tiet_kiem" }
   ```

### Step 3: Unsecured Template Handling
1. For unsecured loans, existing non-collateral templates (danh_muc, phap_ly, phuong_an, bao_cao, giai_ngan) still apply
2. HDTD templates labeled "co TSBD" should be filtered out or have "khong TSBD" variants
3. **Option A (simple)**: User manually picks correct template -> no code change needed
4. **Option B (smarter)**: Add `requires_collateral` flag to template entries, hide when `is_unsecured`
5. **Chosen: Option A** for now (YAGNI). User already picks templates manually.

### Step 4: Template File Placeholder
1. Create a README in each new folder explaining expected template format
2. Document expected TK.* placeholders for GTCG templates

## Todo List
- [ ] Create GTCG template folder in report_assets
- [ ] Register GTCG category in asset-template-registry
- [ ] Update ASSET_CATEGORY_KEYS and ASSET_CATEGORY_LABELS
- [ ] Add cloner mapping for ts_cc_gtcg
- [ ] Document expected placeholders for GTCG templates
- [ ] (Deferred) Add unsecured HDTD templates when provided by user

## Success Criteria
- GTCG category appears in template picker UI when tiet_kiem collateral selected
- Cloner correctly handles multi-GTCG collateral sections
- No regression on existing asset templates

## Risk Assessment
- **High**: No DOCX template files available yet -> phase is partially blocked
- **Low**: Registry + cloner changes are additive, no risk to existing templates

## Unresolved Questions
1. Does user have DOCX templates for cam co GTCG? (HD cam co, BB dinh gia, GBN, etc.)
2. Does user need unsecured-specific HDTD template (2268.06 "khong TSBD" variant)?
3. Should unsecured loans hide asset template categories in picker, or just let user choose?
