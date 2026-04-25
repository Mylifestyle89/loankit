# Code Review: Type B XLSX Parser Upgrade

**File:** `src/lib/import/xlsx-loan-plan-parser-type-b.ts` (299 lines)
**Scope:** Smart section detection for PAKD business plan Excel files
**Related:** `xlsx-loan-plan-types.ts`, `xlsx-loan-plan-parser.ts`, `xlsx-loan-plan-parser-type-s.ts`, API route `loan-plans/import/route.ts`

---

## Overall Assessment

Parser chất lượng tốt. Logic section detection rõ ràng, `extractItems()` được tái sử dụng cho cả cost và revenue. Metadata extraction thông minh với heuristic phân biệt rate vs amount. Tuy nhiên có vài edge case và 1 vấn đề file size cần xử lý.

---

## Critical Issues

Không có.

---

## High Priority

### H1. File vượt 200 dòng (299 LOC)

File hiện tại 299 dòng, vượt giới hạn 200 LOC. Đề xuất tách:
- `xlsx-type-b-section-detector.ts`: `splitSections()`, `SECTION_MARKERS`, `SectionBounds` type (~50 LOC)
- `xlsx-type-b-meta-extractor.ts`: `extractSummaryMeta()` (~60 LOC)
- Giữ lại parser chính: `findHeaderRow()`, `extractItems()`, `parseTypeB()`, `parseNum()` (~150 LOC)

### H2. `interestRate` heuristic dễ sai với lãi suất >= 1

```typescript
// Line 197: Chỉ detect rate khi n < 1
const rate = nums.find((n) => n > 0 && n < 1);
```

Lãi suất 8.5% được lưu dạng 0.085 thì OK. Nhưng nếu file Excel ghi `8.5` (phần trăm, không chia 100), heuristic sẽ bỏ qua. Cần thêm fallback:

```typescript
const rate = nums.find((n) => n > 0 && n < 1)
  ?? (() => {
    const pct = nums.find((n) => n > 0 && n <= 30); // 1% - 30%
    return pct ? pct / 100 : undefined;
  })();
```

### H3. `parseNum` DRY violation với Type S parser

`parseNum()` giống nhau ở cả Type B (line 81) và Type S (line 12), chỉ khác Type S xử lý thêm `%`. Nên extract ra `xlsx-parse-utils.ts` shared module.

---

## Medium Priority

### M1. `extractSummaryMeta` scan toàn bộ rows lần thứ 2 (line 227-238)

Sau khi scan `bounds.summaryRows`, hàm lại loop toàn bộ `rows` để tìm totalRevenue/profit. Nên gộp vào `splitSections()` khi đã scan marker rows, hoặc dùng `bounds.revenueStart` / profit marker index thay vì re-scan.

### M2. Roman numeral skip regex quá rộng

```typescript
// Line 159
if (/^[IVX]+\.?\s/i.test(nameVal)) continue;
```

Pattern này với flag `i` sẽ match chữ thường `i`, `v`, `x`. Nếu có hàng tên "ivermectin" hoặc "vitamin" bắt đầu bằng `iv...` sẽ bị skip. Fix: bỏ flag `i`:

```typescript
if (/^[IVX]+\.?\s/.test(nameVal)) continue;
```

### M3. `getRowText` join toàn bộ row có thể match false positive

```typescript
// Line 91: join mọi cell thành 1 chuỗi
return row.map((c) => String(c ?? "").trim()).filter(Boolean).join(" ");
```

Khi check `SECTION_MARKERS.interest.test(rowText)` (line 118), nếu 1 cell chứa "lãi" và cell khác chứa "vay" ở row không liên quan, sẽ match sai. Tuy nhiên, xác suất thấp trong context PAKD files. Nên document risk này bằng comment.

### M4. CostItem vs RevenueItem field name mismatch

`CostItem` dùng `name`, `RevenueItem` dùng `description`. Parser extract chung qua `extractItems()` rồi map tại line 274. Đây là design OK, nhưng nếu `extractItems` return type có `name` field, mapping `description: item.name` dễ gây nhầm khi đọc. Consider return type alias rõ hơn.

### M5. `tax` marker quá generic

```typescript
// Line 28
tax: /thu[eế]/i,
```

Pattern `thuế` sẽ match bất kỳ row nào chứa "thuế", kể cả "thuế GTGT đầu vào", "thuế nhập khẩu". Nếu file có nhiều dòng thuế, chỉ dòng cuối được ghi vào `meta.tax` (overwrite). Nên ưu tiên row có "thuế TNDN" hoặc "thuế thu nhập" nếu có.

---

## Low Priority

### L1. Magic number `10` trong `findHeaderRow`

```typescript
// Line 48: scan 10 rows
for (let i = startFrom; i < Math.min(rows.length, startFrom + 10); i++)
```

Nên extract thành constant `MAX_HEADER_SCAN_ROWS = 10`.

### L2. Default unit "đơn vị" hardcoded

Line 168: `"đơn vị"` xuất hiện ở cả Type B và Type S. Nên là shared constant.

---

## Edge Cases Found

1. **Empty sheet / no data rows**: `findHeaderRow` returns null -> parser returns error. OK.
2. **Revenue section detected nhưng không có header row mới**: Fallback dùng cost header cols (line 271). OK nhưng nếu revenue table có cột khác layout hoàn toàn mà không có header, items sẽ bị parse sai mà không warning.
3. **Merged cells**: XLSX `sheet_to_json` với `header:1` sẽ bỏ trống merged cells. Nếu section marker nằm trong merged cell, `splitSections` có thể miss boundary.
4. **Multiple sheets**: Parser chỉ đọc `SheetNames[0]` (line 248). Nếu PAKD data nằm sheet khác, sẽ miss. Đây là by-design nhưng nên document.
5. **`loanAmount` extraction khi `amountCol` = 0**: Line 200 filter `n !== amountCol` nhưng nếu amount column trống (0), filter `n !== 0` đã loại hết candidate hợp lệ. Edge case: row có lãi vay nhưng cột thành tiền trống -> `loanAmount` sẽ lấy giá trị lớn nhất từ nums, có thể đúng hoặc sai.
6. **Rate = 0.085 vs 8.5**: Đã nêu ở H2.

---

## Positive Observations

- `findHeaderRow` fuzzy matching linh hoạt, handle nhiều variant tiếng Việt
- `extractItems()` tái sử dụng tốt cho cost và revenue
- Revenue section tự tìm header row riêng (line 269) - smart fallback
- Warning system rõ ràng, phân biệt partial vs success
- API route có đầy đủ validation: auth, extension, size, magic bytes

---

## Recommended Actions

1. **[H1]** Tách file thành 3 modules (section detector, meta extractor, parser chính)
2. **[H2]** Thêm fallback cho interest rate dạng phần trăm (1-30)
3. **[H3]** Extract shared `parseNum` vào `xlsx-parse-utils.ts`
4. **[M2]** Bỏ flag `i` trong Roman numeral regex
5. **[M5]** Ưu tiên match "thuế TNDN" trước generic "thuế"

---

## Metrics

- **Type Coverage:** 100% (all functions typed, no `any`)
- **File Size:** 299 LOC (vượt 200 LOC limit)
- **Linting:** TS compiles OK (path alias errors are build-env only)
- **Test Coverage:** 3 test cases passing (y tế, mùi nệm, template lyly)

---

## Unresolved Questions

1. Lãi suất trong file Excel thực tế luôn ở dạng decimal (0.085) hay có file ghi 8.5%?
2. Có file PAKD nào có dữ liệu ở sheet thứ 2+ không?
3. Có cần handle merged cells trong section markers không?
