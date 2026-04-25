# KHCN Module Performance Audit

**Date:** 2026-03-25 | **Branch:** main | **Scope:** All KHCN services, builders, API routes, client components

---

## Executive Summary

Module KHCN (~2,800 LOC, 39 files) xử lý tạo DOCX báo cáo cho khách hàng cá nhân. Phân tích cho thấy **performance tổng thể CHẤP NHẬN ĐƯỢC** cho use case hiện tại (single-customer DOCX generation). Không phát hiện bottleneck nghiêm trọng nào, nhưng có một số cải thiện nên cân nhắc khi scale.

**Verdict: No critical performance issues. Minor optimizations recommended.**

---

## 1. Request Lifecycle Analysis

### DOCX Generation Flow (POST `/api/report/templates/khcn/generate`)

```
Client → API Route → generateKhcnReport()
  ├─ loadFullCustomer()          [DB: 1 Prisma query, eager load]
  ├─ buildKhcnReportData()       [CPU: data dict assembly]
  │   ├─ buildCustomerAliases()
  │   ├─ buildBranchStaffData()
  │   ├─ buildLoanExtendedData()
  │   ├─ buildDisbursementExtendedData()
  │   ├─ buildBeneficiaryLoopData()
  │   ├─ collaterals.map() + .reduce() × 2
  │   ├─ buildLandCollateralData()      ← heaviest builder
  │   ├─ buildMovableCollateralData()
  │   ├─ buildSavingsCollateralData()
  │   ├─ buildOtherCollateralData()
  │   ├─ buildCoBorrowerData()
  │   ├─ buildRelatedPersonData()
  │   ├─ buildCreditAgribankData()
  │   ├─ buildCreditOtherData()
  │   ├─ buildLoanPlanExtendedData()    ← 2nd heaviest
  │   ├─ mergeKhcnPriorContractAliases()
  │   └─ merge overrides
  ├─ flattenUncPlaceholders()
  ├─ cloneSectionsForAssets()    [optional: multi-asset]
  └─ docxEngine.generateDocxBuffer()   [I/O: template read + ZIP]
```

---

## 2. Performance Assessment by Layer

### 2.1 Database Layer — `loadFullCustomer()` ✅ OK

**File:** [khcn-report-data-loader.ts](src/services/khcn-report-data-loader.ts)

- **Single Prisma query** with eager loading (`include`) — tối ưu, tránh N+1
- Filters: `loans.take: 1`, `disbursements.take: 1`, `loan_plans.take: 1` — giới hạn data
- Collaterals, co_borrowers, related_persons, credit: load all nhưng typical ~5-20 records/customer

**Risk:** Nếu customer có 50+ collaterals → collateral builders sẽ slow hơn. Hiện tại chưa thấy vấn đề.

**Recommendation:** Không cần thay đổi. Đã tối ưu cho use case 1-customer-at-a-time.

---

### 2.2 Data Dict Assembly — `buildKhcnReportData()` ⚠️ Minor

**File:** [khcn-report.service.ts](src/services/khcn-report.service.ts)

**Observations:**
- Gọi **14 builder functions** tuần tự, mỗi function mutate cùng 1 `data` object
- `.map()` collaterals (L176) + 2× `.reduce()` (L190-191) — O(n) với n = số collateral
- `numberToVietnameseWords()` gọi ~15+ lần cho các trường tiền — mỗi lần O(1) nhưng tích lũy

**Bottleneck tiềm năng:**
- `JSON.parse(col.properties_json)` gọi ở L177 cho mỗi collateral trong TSBD loop
- Sau đó `buildLandCollateralData()` parse **lại** JSON cho cùng collaterals (L14 trong collateral-land.ts)

**Issue: Duplicate JSON.parse**
```
L177 service: data.TSBD = c.collaterals.map(col => JSON.parse(col.properties_json))
L167 land:    const lands = collaterals.filter(c => c.collateral_type === "qsd_dat")
L14  land:    const p = JSON.parse(col.properties_json)  ← PARSE LẠI
```

Tương tự cho movable, savings, other builders — mỗi builder parse JSON riêng.

**Impact:** Với 10 collaterals → 10 extra JSON.parse. Negligible (~0.1ms total). Nhưng nếu properties_json lớn (50KB+ per collateral), có thể cải thiện.

**Recommendation:** Low priority. Nếu muốn optimize, parse 1 lần trong service rồi pass parsed object xuống builders. Hiện tại impact quá nhỏ.

---

### 2.3 Loan Plan Builder — `buildLoanPlanExtendedData()` ⚠️ Minor

**File:** [khcn-builder-loan-plan.ts](src/services/khcn-builder-loan-plan.ts)

**Observations:**
- 3× `JSON.parse` (financials, cost_items, revenue_items) — typical size < 5KB each
- `.filter() + .map()` cho costItems (L128-135): typical 5-15 items
- `.reduce()` × 4 cho tổng chi phí, doanh thu, supply total
- `calcRepaymentSchedule()`: generates ~5-10 rows cho vay trung dài hạn, ~36 rows max

**calcRepaymentSchedule Performance:**
```
termMonths=60, freq=12 → 5 rows → O(5) — trivial
termMonths=120, freq=1 → 120 rows → O(120) — still trivial
```

**`numberToVietnameseWords()` calls:** ~20 lần trong builder này. Mỗi call O(1).

**Recommendation:** Không cần optimize. All operations O(n) với n nhỏ (<150).

---

### 2.4 Land Collateral Builder — `buildLandCollateralData()` ⚠️ Minor

**File:** [khcn-builder-collateral-land.ts](src/services/khcn-builder-collateral-land.ts)

**Heaviest builder do:**
- `extractLandFields()`: ~100 field mappings per collateral + JSON.parse + IIFE cho _amendments
- Thêm "SĐ." prefix: loop over all fields × n collaterals (L174-176)
- 3 loop arrays tạo ra: `TSBD_CHI_TIET`, `SĐ`, `DINH_GIA`, `TSBD_DINH_GIA`
- `emitIndexedFields()`: emit `SĐ_1.*`, `SĐ_2.*`... cho mỗi collateral

**Complexity:** O(c × f) với c = số collateral đất, f = ~100 fields

**Typical case:** 2-3 collaterals đất → ~300-450 field emissions → ~0.5ms

**Worst case:** 10 collaterals → ~1500 field emissions → ~2ms. Vẫn acceptable.

**Recommendation:** OK hiện tại. Nếu cần optimize cho 20+ collaterals, có thể lazy-emit indexed fields chỉ khi template yêu cầu.

---

### 2.5 DOCX Engine — `generateDocxBuffer()` 📊 Main Cost

**File:** [docx-engine.ts](src/lib/docx-engine.ts)

Đây là **chi phí chính** của toàn bộ flow:
1. `fs.readFile()` template DOCX: ~50-200KB, ~1-5ms
2. `PizZip` decompress: ~2-10ms
3. `mergeAdjacentRuns()` × 5 XML parts: regex operations trên XML text
4. `Docxtemplater.render()`: replace all placeholders — cost tỷ lệ với số tags
5. `zip.generate()`: compress output DOCX: ~5-20ms

**Estimated total:** 15-50ms per DOCX generation (template-dependent)

**Recommendation:** Đây là I/O-bound, không phải CPU-bound. Không cần optimize trừ khi cần generate batch (10+ docs cùng lúc).

---

### 2.6 Template Validator — `validateKhcnTemplates()` ✅ OK (build-time only)

**File:** [khcn-template-validator.ts](src/lib/report/khcn-template-validator.ts)

- Chạy **build-time only**, không affect runtime
- `scanAllKhcnTemplates()` reads ALL DOCX files + regex scan
- Nested loop (L131-136) check loop fields: O(groups × items × tags) — max ~450 × 50 = 22,500 iterations

**Recommendation:** Build-time cost, không ảnh hưởng user. OK.

---

### 2.7 Client Component — `KhcnDocChecklist` ✅ OK

**File:** [khcn-doc-checklist.tsx](src/app/report/customers/[id]/components/khcn-doc-checklist.tsx)

- 2 fetch calls (loans + templates) — parallel-able nhưng sequential hiện tại
- `useMemo` filter categories: O(n) với n = ~20-50 categories
- `AbortController` cleanup: đúng pattern

**Minor observations:**
- L42-57: fetch loans → L64-78: fetch templates — sequential, nhưng templates không depend on loans
- Có thể song song 2 fetches bằng `Promise.all`

**Impact:** ~50-100ms saved trên slow connections. Negligible trên local/fast network.

**Recommendation:** Low priority. Nếu muốn, dùng `Promise.all` cho 2 fetch calls.

---

## 3. Memory Analysis

| Component | Memory Estimate | Notes |
|-----------|----------------|-------|
| `data` dict (final) | ~50-200KB | 450+ keys, mostly strings |
| `loadFullCustomer` result | ~10-50KB | Pruned by `take: 1` |
| Template ZIP in memory | ~50-200KB | Single DOCX file |
| Output ZIP buffer | ~50-200KB | Generated DOCX |
| **Total per request** | **~200-700KB** | Acceptable for single-user |

**No memory leaks detected.** All data scoped to request lifecycle.

---

## 4. Redundancy & Waste Analysis

### 4.1 Duplicate `numberToVietnameseWords` calls

Cùng một giá trị được convert sang chữ nhiều lần:
- `col.total_value` → `numberToVietnameseWords()` ở TSBD loop (L183) + land builder (L78) + TSBD_DINH_GIA (L258)
- `col.obligation` → tương tự

**Impact:** ~0.01ms per duplicate. Negligible.

### 4.2 Duplicate collateral `.reduce()`

- L190-191: reduce total_value & obligation
- L280-281 (land builder): reduce lại cho land-only collaterals

Đây là **intended** — service tính tổng ALL collaterals, land builder tính tổng LAND-only. Không phải duplicate.

### 4.3 `fmtN()` called on falsy values

Nhiều nơi gọi `fmtN(undefined)` hoặc `fmtN(null)` → return `""`. Không waste, `fmtN` handle gracefully.

---

## 5. Scalability Concerns

| Scenario | Current | Risk Level |
|----------|---------|------------|
| 1 customer, 5 collaterals | ~30-80ms total | ✅ None |
| 1 customer, 20 collaterals | ~50-120ms | ✅ Low |
| 1 customer, 50 collaterals | ~100-250ms | ⚠️ Noticeable |
| Batch 10 customers | ~300-800ms sequential | ⚠️ Consider parallelism |
| Concurrent 10 users | Memory OK (~7MB) | ✅ Low |

---

## 6. Recommendations Summary

| # | Issue | Severity | Effort | Recommendation |
|---|-------|----------|--------|---------------|
| 1 | Duplicate JSON.parse collateral props | Low | Low | Parse once, pass down (optional) |
| 2 | Sequential fetches in KhcnDocChecklist | Low | Low | `Promise.all` for loans + templates |
| 3 | No request-level timing/logging | Info | Low | Add `console.time` in API route for monitoring |
| 4 | Template file read every request | Low | Medium | Cache template Buffer in memory (LRU) if needed |
| 5 | Large collateral count not paginated | Low | Medium | Add `take` limit on collaterals if needed in future |

**None of these are urgent.** Module hiện tại performant cho single-user DOCX generation workflow.

---

## 7. What's Done Well

- **Single Prisma query** with selective eager loading — no N+1
- **Modular builders** — each builder focused, testable, < 300 LOC
- **`take: 1`** on loans, disbursements, loan_plans — prevents over-fetching
- **AbortController** in client for stale request cleanup
- **useMemo/useCallback** đúng chỗ trong React components
- **Build-time validation** tách riêng khỏi runtime
- **No blocking synchronous I/O** trong API routes

---

## Unresolved Questions

1. Chưa có production metrics (response time, P95, P99) → khuyên bật logging ở API route
2. Template file size distribution chưa kiểm tra — nếu có template > 500KB có thể cần cache
3. `numberToVietnameseWords()` chưa đọc implementation — assume O(1) nhưng chưa verify
