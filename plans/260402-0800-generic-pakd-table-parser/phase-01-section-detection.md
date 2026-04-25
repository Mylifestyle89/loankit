---
phase: 1
priority: high
status: completed
effort: medium
completed: 2026-04-02
---

# Phase 1: Section Detection + Revenue Extraction

## Overview
Thêm khả năng phát hiện ranh giới section (cost/summary/revenue) trong bảng Type B, và extract revenue items.

## Context
- [Brainstorm report](../reports/brainstorm-260402-0800-generic-pakd-table-parser.md)
- Reference: Type S parser đã có mode switch cost→revenue (`xlsx-loan-plan-parser-type-s.ts:111`)

## Key Insights
- Section markers trong PAKD thực tế:
  - Cost end: `"Tổng chi phí"`, `"I Chi phí"`, `"I. Tổng chi phí"`
  - Revenue start: `"Doanh thu"`, `"II Doanh thu"`, `"II. Doanh thu"`
  - Profit: `"Lợi nhuận"`, `"III Lợi nhuận"`, `"III. Lợi nhuận"`
  - Summary: rows giữa cost-end và revenue-start (lãi vay, thuế, CP gián tiếp)
- Revenue section có thể có header row riêng (tên cột khác cost section)

## Related Code Files
- **Modify:** `src/lib/import/xlsx-loan-plan-parser-type-b.ts`

## Implementation Steps

### 1. Thêm section marker patterns
```typescript
const SECTION_MARKERS = {
  costTotal: /^(I\.?\s+)?t[oổ]ng\s*(chi\s*ph[ií]|c[oộ]ng)/i,
  revenue: /^(II\.?\s+)?doanh\s*thu/i,
  profit: /^(III\.?\s+)?l[oợ]i\s*nhu[aậ]n/i,
  directCost: /chi\s*ph[ií]\s*tr[uự]c\s*ti[eế]p/i,
  indirectCost: /chi\s*ph[ií]\s*gi[aá]n\s*ti[eế]p/i,
};
```

### 2. Thêm function `splitSections()`
Scan toàn bộ rows sau header, tìm marker rows → xác định:
- `costEndRow`: row index nơi cost section kết thúc
- `summaryStartRow` / `summaryEndRow`: summary section bounds
- `revenueStartRow` / `revenueEndRow`: revenue section bounds

Logic:
```
for each row after header:
  if matches costTotal → costEndRow = i
  if matches revenue → revenueStartRow = i
  if matches profit → revenueEndRow = i (profit row = end of revenue)
```

### 3. Refactor `parseTypeB()` main loop
- Cost items: parse rows from `headerRow+1` to `costEndRow` (hoặc end-of-data nếu không có marker)
- Revenue items: nếu `revenueStartRow` tồn tại:
  - Re-run `findHeaderRow()` trên revenue section (header row có thể khác)
  - Nếu không tìm thấy header → reuse cost column mapping
  - Parse revenue rows → `RevenueItem[]`
- Fallback: không tìm thấy section markers → behavior giống hiện tại (all = cost items)

### 4. Revenue item extraction
- Cùng logic cost items nhưng output `RevenueItem` type
- Map: `name → description`, giữ nguyên `unit, qty, unitPrice, amount`

## Todo
- [x] Thêm SECTION_MARKERS constants
- [x] Implement splitSections() function
- [x] Refactor parseTypeB() để dùng section bounds
- [x] Thêm extractRevenueItems() logic
- [x] Fallback khi không detect được sections

## Success Criteria
- Parse PAKD thiết bị y tế: 31 cost items + 28 revenue items
- Parse PAKD mùi nệm: 12 cost items + 6 revenue items
- TEMPLATE lyly vẫn detect Type S (không ảnh hưởng)
- Không break existing Type B files
