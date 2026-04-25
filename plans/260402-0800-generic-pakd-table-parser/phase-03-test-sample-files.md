---
phase: 3
priority: high
status: completed
effort: low
completed: 2026-04-02
---

# Phase 3: Test với 3 file mẫu

## Overview
Viết test và verify parser mới với 3 file PAKD mẫu.

## Test Files
1. `report_assets/KHCN templates/Phương án vay vốn xlsx/TEMPLATE-hoa-lyly-han-muc.xlsx` → vẫn detect Type S
2. `report_assets/KHCN templates/Phương án vay vốn xlsx/PAKD thiết bị y tế.xlsx` → Type B+
3. `report_assets/KHCN templates/Phương án vay vốn xlsx/PAKD mui nệm.xlsx` → Type B+

## Related Code Files
- **Existing tests:** check for `__tests__` or `*.test.ts` files related to xlsx parser
- **Modify/Create:** test file for Type B+ parser

## Expected Results

### PAKD thiết bị y tế
- costItems: 31 items (rows 2-32: Máy xoa bóp → Chi phí khác)
- revenueItems: 28 items (rows 44-71: same products, higher prices)
- meta: loanAmount=1.5B, interestRate=0.085, tax=119278800
- profit: 930787200

### PAKD mùi nệm
- costItems: 12 items (rows 2-13: Trần cacbon → Chi phí khác)
- revenueItems: 6 items (rows 24-29: Bọc trần → Các loại khác)
- meta: loanAmount=2B, interestRate=0.07, tax=24000000
- profit: 459000000

### TEMPLATE lyly (regression)
- Must still detect as Type S → parseTypeS() handles it
- No behavior change

## Implementation Steps
1. Find existing test infrastructure
2. Write unit test for parseTypeB() with sample files
3. Test section detection accuracy
4. Test meta extraction accuracy
5. Regression test: existing Type B files still work
6. Manual E2E: upload via app UI → verify imported data

## Todo
- [x] Locate existing test files
- [x] Write parseTypeB tests with PAKD y tế
- [x] Write parseTypeB tests with PAKD mùi nệm
- [x] Verify TEMPLATE lyly still routes to Type S
- [x] Manual E2E test via app upload

## Success Criteria
- All assertions pass for cost/revenue item counts
- Meta values match expected within 1% tolerance
- No regression on existing parsers (Type A, S)
