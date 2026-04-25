---
phase: 3
title: "Services Split"
status: complete
effort: 3h
---

# Phase 3: Services Split

## File Ownership

- `src/services/report/template.service.ts`
- `src/services/report/data-io.service.ts`
- `src/services/invoice.service.ts`
- `src/services/customer.service.ts`
- `src/services/ai-mapping.service.ts`
- `src/services/khcn-report.service.ts`
- `src/lib/report/fs-store.ts`

## Files to Split

### 1. template.service.ts (447 lines)

Methods: getState, loadRuns, getTemplates, setActiveTemplate, buildTemplateInventory, openBackupFolder, listStateBackups, getStateBackupContent, saveTemplateDocx, listFieldTemplates, createFieldTemplate, attachTemplateToCustomer, updateFieldTemplate, registerTemplateProfile, removeTemplateProfile

**Split strategy:**
- `template-field-operations.service.ts` — listFieldTemplates, createFieldTemplate, updateFieldTemplate, attachTemplateToCustomer (~200 lines)
- `template-profile-operations.service.ts` — registerTemplateProfile, removeTemplateProfile, buildTemplateInventory, saveTemplateDocx (~120 lines)
- `template.service.ts` — main export object re-composing from above + getState, loadRuns, getTemplates, setActiveTemplate, backup methods (~130 lines)

### 2. data-io.service.ts (437 lines)

Two major methods: importData (~260 lines), exportData/exportDataStream (~170 lines)

**Split strategy:**
- `data-io-import.service.ts` — importData + all Import*Record types (~250 lines)
- `data-io-export.service.ts` — exportData, exportDataStream (~130 lines)
- `data-io.service.ts` — re-export barrel + fullCustomerInclude shared constant (~60 lines)

### 3. invoice.service.ts (405 lines)

Methods: listByDisbursement, listAll, getVirtualInvoiceEntries, getById, create, update, bulkMarkPaid, delete, markOverdue, getCustomerSummary

**Split strategy:**
- `invoice-crud.service.ts` — create, update, delete, getById, bulkMarkPaid (~150 lines)
- `invoice-queries.service.ts` — listByDisbursement, listAll, getVirtualInvoiceEntries, getCustomerSummary, markOverdue (~150 lines)
- `invoice.service.ts` — types + re-export barrel composing invoiceService object (~100 lines)

### 4. customer.service.ts (404 lines)

Methods: listCustomers, getCustomerById, createCustomer, updateCustomer, deleteCustomer, saveFromDraft, getFullProfile, toDraft

**Split strategy:**
- `customer-draft.service.ts` — saveFromDraft (~140 lines, complex upsert logic), toDraft (~50 lines)
- `customer.service.ts` — remaining CRUD + getFullProfile + types (~200 lines)

### 5. khcn-report.service.ts (369 lines)

Single exported function `buildKhcnReportData` + `generateKhcnReport`. Calls many `build*Data` helpers already imported.

**Split strategy:**
- `khcn-report-data-builder.ts` — buildKhcnReportData with collateral/loan data assembly (~200 lines)
- `khcn-report.service.ts` — generateKhcnReport + types + re-export builder (~170 lines)

### 6. fs-store.ts (364 lines)

Many small exported functions. Group by concern.

**Split strategy:**
- `fs-store-mapping-io.ts` — readMappingFile, parseMappingJson, readAliasFile, parseAliasJson, buildCatalog, mergeFinancialCatalog (~80 lines)
- `fs-store-state-ops.ts` — createMappingDraft, publishMappingVersion, setActiveTemplate, updateTemplateInventory, appendRunLog (~80 lines)
- `fs-store.ts` — loadState, saveState, getActiveMappingVersion, getActiveTemplateProfile, bootstrapTemplateProfiles, EMPTY_STATE (~200 lines)

### 7. ai-mapping.service.ts (357 lines)

Mix of types, helper functions, and main suggest/batch logic.

**Split strategy:**
- `ai-mapping-helpers.ts` — tokenize, jaccardSimilarity, safeParseJson, validateMapping, validateGrouping, fuzzyMatch (~100 lines)
- `ai-mapping.service.ts` — types + main suggest/batch functions (~200 lines)

## Import Update Checklist

- template.service.ts: imported by API routes in `src/app/api/report/`
- data-io.service.ts: imported by API routes
- invoice.service.ts: imported by `src/app/api/invoices/`
- customer.service.ts: imported by `src/app/api/customers/`
- fs-store.ts: imported by template.service, data-io.service, API routes
- Keep original export names — barrel re-export from main file

## Compile Verification

```bash
npx tsc --noEmit
```

## Todo

- [x] Split template.service.ts (447 → 3 files)
- [x] Split data-io.service.ts (437 → 3 files)
- [x] Split invoice.service.ts (405 → 3 files)
- [x] Split customer.service.ts (404 → 2 files)
- [x] Split khcn-report.service.ts (369 → 2 files)
- [x] Split fs-store.ts (364 → 3 files)
- [x] Split ai-mapping.service.ts (357 → 2 files)
- [x] Verify compile: `npx tsc --noEmit`
