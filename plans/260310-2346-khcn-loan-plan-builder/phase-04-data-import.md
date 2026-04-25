## Phase 4: Data Import (.bk + .apc)

**Priority:** P2 | **Status:** done | **Effort:** 3h | **Depends:** Phase 1

### Context
- `.bk` = KH data instance (JSON: `Clients[].ClientAttributes[] + ClientAssets[]`)
- `.apc` = template schema (JSON: `Attributes[] + AssetCategories[] + Documents[]`)
- Existing bk-importer handles corporate .bk → reuse for KHCN
- .apc is NEW format — needs separate parser

### Two formats

| | .bk | .apc |
|---|---|---|
| Purpose | Customer data instance | Loan template schema |
| Structure | `Clients[].ClientAttributes[]` | `Attributes[]` (field defs) |
| Assets | `ClientAssets[{Code, AssetProperties}]` | `AssetCategories[{Code, Assets[]}]` |
| Documents | ❌ | `Documents[]` (DOCX file list) |
| Used for | Fill data into templates | Define available fields + templates per loan method |

### Implementation Steps

1. **Extend .bk importer for KHCN**
   - Existing resolver maps ClientAttributes → field keys
   - Add KHCN-specific key mappings (CCCD, Năm sinh, Danh xưng, SĐT...)
   - Auto-detect customer_type from attributes (has "Vốn điều lệ" → corporate, has "CMND" → individual)
   - Reuse existing `saveFromDraft()` flow

2. **Create .apc parser (NEW)**
   - Parse `Attributes[]` → field definitions (name, type, position)
   - Parse `AssetCategories[]` → available asset sections for this loan method
   - Parse `Documents[]` → required DOCX template list
   - Use .apc to auto-configure loan method template sets

3. **Import flow**
   - Upload .bk → parse → create/update customer + fill all asset data
   - Upload .apc → parse → register loan method template config
   - OR: .apc used at setup time to define system config, .bk used at runtime for KH data

### Related Files
- `src/services/customer.service.ts` (saveFromDraft)
- `report_pipeline/resolver.py` (existing bk resolver)
- `report_assets/backups/Trồng hoa Cát tường/Bui_Thi_Thu_Ha.bk`
- `report_assets/backups/*/export.apc` (3 loan method schemas)

### Success Criteria
- .bk import creates individual customer with all attributes + assets
- .apc parsed to configure loan method template sets
- Auto-detect corporate vs individual from .bk content
