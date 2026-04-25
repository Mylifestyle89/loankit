## Phase 4: KHCN .bk Import

**Priority:** P2 | **Status:** pending | **Effort:** 2h | **Depends:** Phase 2

### Context
- Existing importer: `src/lib/import/bk-importer.ts` — parses ClientAttributes
- BK mapping: `src/lib/import/bk-mapping.ts`
- Decision: .bk format SAME for individual => reuse 100%

### Requirements
- Add KHCN-specific BK_TO_FRAMEWORK_MAPPING entries
- Auto-detect individual from .bk content (presence of CCCD/CMND key)
- Set customer_type="individual" when saving from KHCN .bk

### Implementation Steps

1. **Extend bk-mapping.ts**
   - Map BK keys for CCCD, DOB, phone, marital status etc. to framework keys
   - Example: `"So CCCD/CMND" -> "A.general.cccd"`

2. **Detection logic in saveFromDraft**
   - Already handled in Phase 2: if cccd present => individual
   - No changes needed in bk-importer.ts itself

3. **Test with sample .bk**
   - Use `report_assets/backups/Trồng hoa Cát tường/Bui_Thi_Thu_Ha.bk`
   - Verify individual fields extracted correctly

### Related Files
- `src/lib/import/bk-mapping.ts` (modify — add KHCN key mappings)

### Success Criteria
- Import KHCN .bk => customer created with type="individual"
- CCCD, phone, DOB populated
- No regression on corporate .bk import
