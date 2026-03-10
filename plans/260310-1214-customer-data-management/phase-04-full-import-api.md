# Phase 4: Full Import API (JSON + XLSX)

## Priority: HIGH | Status: pending | Depends on: Phase 3

## Overview

Nâng cấp import API để nhập toàn bộ dữ liệu khách hàng bao gồm loans, disbursements, invoices, beneficiaries từ file JSON/XLSX đã export.

## Related Code Files

### Modify
- `src/services/report/data-io.service.ts` — Core import logic, thêm relations
- `src/app/api/report/import-data/route.ts` — Add XLSX parsing, v2 format

### Create
- `src/services/report/customer-xlsx-import.service.ts` — XLSX parsing logic

## Import Logic

### JSON v2 Import Flow

1. Parse JSON, check `version`
2. For each customer:
   a. Upsert customer by `customer_code`
   b. For each loan: upsert by `contractNumber`
   c. For each disbursement: create/update under loan
   d. For each invoice: upsert by `(invoiceNumber, supplierName)`
   e. For each beneficiary: create/update under loan
   f. For each disbursementBeneficiary: create/update
3. Import templates (existing logic)
4. Return counts

### XLSX Import Flow

1. Parse XLSX workbook
2. Read each sheet → construct JSON structure
3. Link sheets via reference keys (customer_code, contractNumber)
4. Delegate to same import logic as JSON

### Upsert Strategy

| Entity | Upsert Key | Conflict Resolution |
|--------|-----------|-------------------|
| Customer | customer_code | Update all fields |
| Loan | contractNumber | Update all fields |
| Disbursement | loanId + disbursementDate + amount | Create if not exists |
| Invoice | invoiceNumber + supplierName | Update all fields |
| Beneficiary | loanId + accountNumber | Update if exists |

## Implementation Steps

### Step 1: Extend Zod schema for v2 import

Add nested arrays: loans, disbursements, invoices, beneficiaries

### Step 2: Update importData() in data-io.service.ts

- Detect version (v1 → existing, v2 → full import)
- Transaction wrapping all upserts
- Order: customers → loans → beneficiaries → disbursements → invoices

### Step 3: Implement XLSX import service

- Parse multi-sheet workbook
- Map sheet data to JSON structure
- Validate references between sheets

### Step 4: Update import route

- Accept multipart/form-data for XLSX files
- Detect format from content-type or file extension
- Return detailed import summary

## Success Criteria

- [ ] JSON v2 import creates all nested entities correctly
- [ ] XLSX import parses multi-sheet and creates entities
- [ ] Upsert logic handles duplicates gracefully
- [ ] Transaction rollback on error
- [ ] v1 JSON import still works (backward compat)
- [ ] Import summary shows count per entity type

## Risk Assessment

- **Data integrity**: Foreign key relationships must be created in correct order (parent before child)
- **Large files**: Transaction with many operations. Mitigate: batch within transaction.
- **Duplicate handling**: Use unique constraints for upsert keys.
