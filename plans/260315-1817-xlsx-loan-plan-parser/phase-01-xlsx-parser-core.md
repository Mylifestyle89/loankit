---
phase: 1
title: "XLSX Parser Core - Type Detection & Parsers A/B"
status: complete
effort: 2.5h
completed: 2026-03-15
---

# Phase 1: XLSX Parser Core

## Overview
Build pure-function parser modules that read XLSX workbook -> detect type -> extract CostItem[] + meta fields.

## Key Insights
- Type A: Row1 = headers with `_DG`/`_SL`/`_TT` suffixes, Row2 = values. Sheet2 has `[PA.xxx]` placeholders for meta.
- Type B: Vertical table with STT | Ten hang | DVT | SL | DG | TT columns. Headers vary in casing/wording.
- Type C: Unstructured -> return error result immediately.
- Existing pattern in `bk-importer.ts`: pure function returns result object with status/message/data/metadata.

## Files to Create

### `src/lib/import/xlsx-loan-plan-types.ts` (~40 lines)
```ts
export type XlsxParseResult = {
  status: "success" | "partial" | "error";
  message: string;
  detectedType: "A" | "B" | "C" | "unknown";
  costItems: CostItem[];
  revenueItems: RevenueItem[];
  meta: {
    name?: string;
    loanAmount?: number;
    interestRate?: number;
    turnoverCycles?: number;
    tax?: number;
    loan_method?: string;
    // extra meta from PA placeholders
    [key: string]: unknown;
  };
  warnings: string[];
};
```

### `src/lib/import/xlsx-loan-plan-detector.ts` (~60 lines)
Type detection logic:
1. Read Sheet1 row 1 headers
2. If any header ends with `_DG`, `_SL`, `_TT` -> Type A
3. If headers include fuzzy match for ["STT", "Ten hang"/"Noi dung", "DVT"/"Don vi", "SL"/"So luong", "DG"/"Don gia", "TT"/"Thanh tien"] -> Type B
4. Check Sheet2 for `[PA.xxx]` patterns -> confirms Type A
5. Otherwise -> Type C

Detection function:
```ts
export function detectXlsxType(workbook: WorkBook): "A" | "B" | "C"
```

### `src/lib/import/xlsx-loan-plan-parser-type-a.ts` (~120 lines)
Parse Type A horizontal key-value:
1. Read Sheet1 Row1 headers, Row2 values
2. Group by base name: e.g. `Phan huu co` -> `{_DG: unitPrice, _SL: qty, _TT: amount}`
3. Map to CostItem[] with unit from header or default "kg"
4. Read Sheet2 for `[PA.xxx]` placeholders -> extract meta fields (loan amount, interest rate, etc.)
5. Handle known cost item name variations (normalize Vietnamese)

Known cost items mapping:
```
"Xu ly dat" -> { name: "Xử lý đất", unit: "công" }
"Cay giong" -> { name: "Cây giống", unit: "cây" }
"Phan huu co" -> { name: "Phân hữu cơ", unit: "kg" }
"Dam" -> { name: "Đạm", unit: "kg" }
"Lan" -> { name: "Lân", unit: "kg" }
"KaLi" -> { name: "KaLi", unit: "kg" }
"NPK" -> { name: "NPK", unit: "kg" }
"Thuoc BVTV" -> { name: "Thuốc BVTV", unit: "chai" }
"Chi phi tuoi" -> { name: "Chi phí tưới", unit: "lần" }
"Cong lao dong" -> { name: "Công lao động", unit: "công" }
"Voi" -> { name: "Vôi", unit: "kg" }
"Con giong" -> { name: "Con giống", unit: "con" }
"Thuc an" -> { name: "Thức ăn", unit: "kg" }
```

Meta field mapping from `[PA.xxx]`:
```
"So tien vay" -> loanAmount
"Lai suat vay" -> interestRate
"Thoi han vay" -> turnoverCycles
"Muc dich vay" -> name
"Von doi ung" -> (store in meta)
"San luong" -> (revenue hint)
"Thu nhap" -> (revenue hint)
```

### `src/lib/import/xlsx-loan-plan-parser-type-b.ts` (~120 lines)
Parse Type B vertical table:
1. Find header row by fuzzy matching column names
2. Map columns: STT, name, unit, qty, unitPrice, amount
3. Iterate data rows until empty STT or total row
4. Skip summary/total rows (detect by "Tong"/"Cong" in name column)
5. Build CostItem[] from rows
6. Search for meta fields in cells outside the table (scan for patterns like "So tien vay:", "Lai suat:")

Fuzzy header matching:
```ts
const HEADER_PATTERNS = {
  stt: /^(stt|tt|#)$/i,
  name: /^(t[eê]n\s*h[aà]ng|n[oộ]i\s*dung|di[eễ]n\s*gi[aả]i|h[aạ]ng\s*m[uụ]c)/i,
  unit: /^([đd][vơ]t|[đd][oơ]n\s*v[iị])/i,
  qty: /^(sl|s[oố]\s*l[uư][oợ]ng)/i,
  unitPrice: /^([đd]g|[đd][oơ]n\s*gi[aá])/i,
  amount: /^(tt|th[aà]nh\s*ti[eề]n)/i,
};
```

### `src/lib/import/xlsx-loan-plan-parser.ts` (~50 lines)
Main entry point orchestrator:
```ts
import * as XLSX from "xlsx";
export function parseXlsxLoanPlan(buffer: Buffer): XlsxParseResult {
  const workbook = XLSX.read(buffer);
  const type = detectXlsxType(workbook);
  if (type === "C") return errorResult("unsupported");
  if (type === "A") return parseTypeA(workbook);
  return parseTypeB(workbook);
}
```

## Implementation Steps
1. Create types file
2. Create detector with type A/B/C heuristics
3. Create Type A parser with cost item + meta extraction
4. Create Type B parser with fuzzy header matching
5. Create orchestrator entry point
6. Verify no compile errors

## Success Criteria
- `parseXlsxLoanPlan(buffer)` returns valid `XlsxParseResult` for Type A and B files
- Type C returns error status with helpful message
- All cost items mapped to `CostItem` type
- Meta fields extracted where available
- No compile errors
