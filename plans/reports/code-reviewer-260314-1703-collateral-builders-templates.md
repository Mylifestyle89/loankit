# Code Review: KHCN Collateral Data Builders & Template Registry

**Date:** 2026-03-14
**Files reviewed:**
- `src/services/khcn-report-data-builders.ts` (lines 198-383)
- `src/lib/loan-plan/khcn-asset-template-registry.ts` (111 lines)
- `src/lib/loan-plan/khcn-template-registry.ts` (82 lines)
- `src/app/report/customers/[id]/components/collateral-config.ts` (214 lines)

---

## Overall Assessment

Code is well-structured. Field mapping coverage is good. A few gaps and inconsistencies found below.

---

## Critical Issues

None.

## High Priority

### H1. `buildMovableCollateralData` only processes first `dong_san` — silently drops others

Line 334: `collaterals.find()` returns only the first match. If a customer has multiple vehicles, all but the first are ignored. Compare with `buildLandCollateralData` which uses `.filter()` + loop array.

**Fix:** Mirror the land pattern — produce a loop array `DS_CHI_TIET` for multi-vehicle templates, keep flat `ĐS.*` from first for backward compat.

### H2. Missing form fields in `buildMovableCollateralData`

`dong_san` FORM_FIELDS in collateral-config.ts includes `revaluation_date` is NOT in FORM_FIELDS but IS in builder (line 363). Conversely these config fields have no explicit data builder coverage issue. Checking each:

| Config key | Builder extracts? | Notes |
|---|---|---|
| `brand` | Yes (`p.brand ?? p.nhan_hieu`) | OK |
| `engine_number` | Yes | OK |
| `chassis_number` | Yes | OK |
| `color` | Yes | OK |
| `license_plate` | Yes | OK |
| `seat_count` | Yes | OK |
| `manufacture_year` | Yes | OK |
| `registration_number` | Yes | OK |
| `registration_date` | Yes | OK |
| `registration_place` | Yes | OK |
| `mortgage_name` | Yes | OK |
| `mortgage_contract` | Yes | OK |
| `mortgage_date` | Yes | OK |
| `guarantee_registry_place` | Yes | OK |
| `insurance_status` | Yes | OK |
| `insurance_amount` | Yes | OK |
| `insurance_renewal_date` | Yes | OK |

All `dong_san` FORM_FIELDS keys are covered. Good.

Builder also outputs extra keys not in FORM_FIELDS: `revaluation_date`, `amendment_doc`. These are template-only placeholders, acceptable.

### H3. `tiet_kiem` and `tai_san_khac` collateral types have no data builder

FORM_FIELDS defines `tiet_kiem` (savings) and `tai_san_khac` (other assets) types, but `khcn-report-data-builders.ts` has no corresponding `buildSavingsCollateralData` or `buildOtherCollateralData`. These fields save to DB but never populate DOCX placeholders.

**Impact:** Templates referencing savings/other asset placeholders will render blank.

**Fix:** Add builders for these types, or document that they're planned for a future phase.

## Medium Priority

### M1. Valuation table `TSBD_DINH_GIA` key inconsistency

Line 303: Uses `p.dia_chi` as fallback for land address. But `extractLandFields` (line 219) uses `p.land_address` without `dia_chi` fallback. The valuation table has a fallback chain the detail extractor lacks — or vice versa. Pick one consistent chain.

### M2. Owner `_owners` JSON parsing duplicated

Owner extraction pattern (`JSON.parse(p._owners || "[]")`) appears in:
- `extractLandFields` (line 208)
- `buildMovableCollateralData` (line 368)

Extract to a shared helper: `function parseOwners(props: Record<string, string>): OwnerEntry[]`

### M3. Template registry `methods: []` on all asset templates

All 84 entries in `ASSET_TEMPLATES` have `methods: []` (= applies to all loan methods). This may be intentional now, but means `getTemplatesForMethod("tieu_dung")` returns all asset templates including SXKD-specific appraisal reports. Worth adding a comment confirming this is intentional.

### M4. collateral-config.ts exceeds 200-line limit (214 lines)

Per project rules, consider extracting `FORM_FIELDS` or formatting helpers into separate files.

## Low Priority

### L1. Template path validation not enforced at build time

Registry has ~70 hardcoded paths. A typo in any path will only fail at runtime when generating a DOCX. Consider adding a build-time or test-time check that all registered paths exist on disk.

### L2. `land_value` key in collateral-config `PROPERTY_LABELS` but not in `qsd_dat` FORM_FIELDS

`PROPERTY_LABELS` has `land_value: "Giá trị đất"` and it's in `NUMBER_KEYS`, but `qsd_dat` FORM_FIELDS doesn't include `{ key: "land_value", label: "Giá trị đất" }`. The builder does extract it (line 258). This means the value can be populated via `properties_json` but there's no form input to set it — likely computed or legacy.

---

## Positive Observations

- Fallback chains (`new_key ?? old_key ?? vietnamese_key`) are consistently applied in movable builder
- Owner data extraction for BT3 templates is comprehensive (10 fields)
- Template registry is clean, well-organized by category with Vietnamese labels
- `getTemplatesForMethod` and `groupByCategory` utilities are simple and correct
- Asset templates properly separated into own file for maintainability

---

## Recommended Actions (prioritized)

1. **Add multi-vehicle support** in `buildMovableCollateralData` (H1) — use `.filter()` + loop array
2. **Add `tiet_kiem`/`tai_san_khac` builders** or document as planned (H3)
3. **Unify fallback chains** between `TSBD_DINH_GIA` and `extractLandFields` (M1)
4. **Extract `parseOwners` helper** (M2)
5. **Split collateral-config.ts** to stay under 200 lines (M4)

---

## Unresolved Questions

1. Are `tiet_kiem` and `tai_san_khac` builders intentionally deferred? If so, which phase?
2. Should asset templates be method-filtered (e.g., exclude appraisal forms for `tieu_dung` loans)?
3. Is `land_value` in PROPERTY_LABELS a computed field or should it have a form input?
