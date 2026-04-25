---
phase: 2
priority: medium
status: completed
effort: low
completed: 2026-04-02
---

# Phase 2: Summary Meta Extraction

## Overview
Extract metadata tài chính (lãi vay, thuế, nhu cầu vốn, vốn tự có) từ summary section trong Type B files.

## Context
- Summary section nằm giữa cost-end và revenue-start
- Chứa: "Chi phí trực tiếp", "Chi phí gián tiếp", "Lãi vay", "Thuế", "Nhu cầu vốn", "Vốn tự có"

## Key Insights
Từ file mẫu:
- **PAKD y tế** (rows 37-42): `Tổng chi phí=5033M, CP trực tiếp=4786M, CP gián tiếp=246M, Lãi vay=127.5M (1500M×8.5%), Thuế=119M`
- **PAKD mùi nệm** (rows 17-22): `Tổng chi phí=5130M, CP trực tiếp=4952M, CP gián tiếp=205M, Lãi vay=140M (2000M×7%), Thuế=24M`
- Pattern: Lãi vay row chứa loanAmount (col SL/ĐG) × interestRate (col ĐG/SL)

## Related Code Files
- **Modify:** `src/lib/import/xlsx-loan-plan-parser-type-b.ts`

## Implementation Steps

### 1. Thêm function `extractSummaryMeta()`
Scan summary rows, match patterns:

```typescript
const SUMMARY_PATTERNS: Record<string, keyof XlsxParseMeta> = {
  'lãi vay': → extract loanAmount × interestRate
  'thuế': → meta.tax
  'nhu cầu vốn': → meta.totalCost  
  'vốn tự có': → meta.counterpartCapital
  'tổng chi phí': → meta.totalCost
  'doanh thu' (II row): → meta.totalRevenue
  'lợi nhuận' (III row): → meta.profit
};
```

### 2. Lãi vay parsing logic
Row lãi vay có format đặc biệt:
- PAKD y tế: `[Lãi vay ngân hàng] [đồng] [1500000000] [0.085] [127500000]`
  → loanAmount=1.5B, interestRate=0.085
- PAKD mùi nệm: `[Lãi vay] [0.07] [2000000000] [140000000]`
  → interestRate=0.07, loanAmount=2B

Logic: trong row "lãi vay", tìm:
- Số < 1 → interestRate (e.g. 0.07, 0.085)
- Số lớn nhất (không phải thành tiền cuối) → loanAmount
- Thành tiền = loanAmount × interestRate (verify)

### 3. Populate meta object
```typescript
meta.interestRate = detected rate
meta.loanAmount = detected amount
meta.tax = detected tax
meta.totalCost = totalDirectCost + totalIndirectCost
meta.totalRevenue = sum of revenue amounts
meta.profit = totalRevenue - totalCost
meta.counterpartCapital = detected or calculated
```

## Todo
- [x] Implement extractSummaryMeta() function
- [x] Handle lãi vay row parsing (extract rate + amount)
- [x] Handle thuế row parsing
- [x] Populate XlsxParseMeta fields
- [x] Add warnings for undetected meta fields

## Success Criteria
- PAKD y tế: extract loanAmount=1.5B, interestRate=8.5%, thuế=119M
- PAKD mùi nệm: extract loanAmount=2B, interestRate=7%, thuế=24M
- Meta fields populated correctly in XlsxParseResult
