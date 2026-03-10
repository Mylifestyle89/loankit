# Phase 3: Full Export API (JSON + XLSX)

## Priority: HIGH | Status: pending

## Overview

Nâng cấp export API để xuất **toàn bộ** dữ liệu khách hàng bao gồm loans, disbursements, invoices, beneficiaries.
Hỗ trợ 2 format: JSON (primary) và XLSX.

## Format Decision: JSON > XLSX

| Criteria | JSON | XLSX |
|----------|------|------|
| Nested data | Native support | Cần multiple sheets |
| Lossless import/export | Yes | Có thể mất relation |
| Human-readable | OK (with formatter) | Excel-friendly |
| Existing codebase | Already used | Partial support |
| File size | Smaller | Larger |

**Decision:** JSON là primary format. XLSX hỗ trợ thêm cho viewing/editing.

## Related Code Files

### Modify
- `src/services/report/data-io.service.ts` — Core export logic, thêm relations
- `src/app/api/report/export-data/route.ts` — Add format param, XLSX support

### Create
- `src/services/report/customer-xlsx-export.service.ts` — XLSX generation logic

### Reference
- `src/lib/xlsx-table-injector.ts` — Existing XLSX utilities

## Export JSON Schema (v2)

```json
{
  "version": "2.0",
  "exported_at": "2026-03-10T...",
  "customers": [
    {
      "customer_code": "...",
      "customer_name": "...",
      "address": "...",
      ... (all customer fields),
      "data_json": "...",
      "loans": [
        {
          "contractNumber": "...",
          "loanAmount": 1000000,
          ... (all loan fields),
          "beneficiaries": [...],
          "disbursements": [
            {
              "amount": 500000,
              ... (all disbursement fields),
              "invoices": [...],
              "disbursementBeneficiaries": [
                {
                  ... (all db fields),
                  "invoices": [...]
                }
              ]
            }
          ]
        }
      ],
      "mapping_instances": [...]
    }
  ],
  "field_templates": [...],
  "field_catalog": [...]
}
```

## Export XLSX Structure

Multiple sheets:
1. **Customers** — Basic customer fields
2. **Loans** — All loans with customer_code reference
3. **Disbursements** — All disbursements with contractNumber reference
4. **Invoices** — All invoices with disbursement reference
5. **Beneficiaries** — All beneficiaries with contractNumber reference

## Implementation Steps

### Step 1: Update exportData() in data-io.service.ts

- Include nested relations (loans → disbursements → invoices)
- Bump version to "2.0"
- Maintain backward compatibility for v1 imports

### Step 2: Add format parameter to route

- `POST /api/report/export-data` with `{ format: "json" | "xlsx", customerIds?, templateIds? }`
- Default: "json"

### Step 3: Implement XLSX export service

- Use `xlsx` package (or existing xlsx-table-injector)
- Generate multi-sheet workbook
- Set column headers with Vietnamese labels
- Auto-width columns

### Step 4: Update streaming for JSON v2

- Extend existing streaming logic for nested data
- Keep memory-efficient batching

## Success Criteria

- [ ] JSON export includes all nested relations
- [ ] XLSX export generates multi-sheet workbook
- [ ] v1 export format still available (backward compat)
- [ ] Streaming works for large datasets
- [ ] File downloads correctly in browser
