# Code Review: XLSX Loan Plan Parser

## Scope
- Files: 9 (types, detector, parser-a, parser-b, orchestrator, API route, hook, modal, page)
- LOC: ~560
- Focus: new XLSX import feature for loan plans

## Overall Assessment
Clean, well-modularized implementation. Good separation: types -> detector -> parsers -> orchestrator -> API -> UI. No DN regression risk — import route is additive, existing `POST /api/loan-plans` schema validation unchanged. A few security and correctness issues below.

---

## Critical Issues

### 1. [Security] parseNum strips dots — breaks decimal numbers
**Files:** `xlsx-loan-plan-parser-type-a.ts:40`, `xlsx-loan-plan-parser-type-b.ts:62`

```ts
const s = String(val).replace(/[,\s.đ]/g, "");
```

This strips ALL dots, so `1500.50` becomes `150050`. Vietnamese formatting uses dots as thousand separators (`1.500.000`) but XLSX cells often contain actual decimal values. The regex can't distinguish.

**Fix:** Strip dots only when they appear as thousand separators (followed by 3 digits), preserve decimal dots:
```ts
const s = String(val).replace(/đ/g, "").replace(/(\d)\.(\d{3})/g, "$1$2").replace(/,/g, "").trim();
```

### 2. [Security] No MIME type / magic bytes validation
**File:** `src/app/api/loan-plans/import/route.ts`

Extension check alone is insufficient. A malicious file renamed to `.xlsx` passes validation. XLSX files are ZIP archives — check magic bytes `PK` (0x50 0x4B) at minimum, or rely on `XLSX.read()` try-catch (which already exists). Low real-world risk since `requireAdmin()` gates access, but worth adding a magic bytes check.

**Fix:** Add before parsing:
```ts
if (buffer[0] !== 0x50 || buffer[1] !== 0x4B) {
  return NextResponse.json({ ok: false, error: "File không phải định dạng XLSX hợp lệ" }, { status: 400 });
}
```

---

## High Priority

### 3. parseRate edge case: "8,5%/nam" with comma decimal
**File:** `xlsx-loan-plan-parser-type-a.ts:46-55`

`parseRate("8,5%/năm")` -> strips `/năm` -> `"8,5%"` -> `parseNum("8,5")` which strips the dot+comma -> broken. Vietnamese decimals use comma (`8,5%`).

**Fix:** In `parseRate`, replace comma with dot before parsing:
```ts
const cleaned = s.replace(",", ".").replace("%", "");
```

### 4. `confirmImport` payload bypasses Zod validation
**File:** `use-xlsx-loan-plan-import.ts:44` posts to `/api/loan-plans` with `Record<string, unknown>` payload.

The existing POST route uses `createPlanSchema.parse(body)`. If the XLSX import payload shape doesn't match `createPlanSchema`, it will 400. This coupling is implicit — if schema changes, import breaks silently.

**Recommendation:** Import the schema type and validate client-side before POST, or create a dedicated `/api/loan-plans/import/confirm` route.

### 5. Preview modal stale state on re-open
**File:** `xlsx-import-preview-modal.tsx:21-25`

`useState(parseResult.costItems)` captures initial value. If `parseResult` changes (user uploads another file while modal open), the modal shows stale data.

**Fix:** Add `key={parseResult}` on the modal or use `useEffect` to sync.

---

## Medium Priority

### 6. `load()` in page.tsx missing try-catch
**File:** `loan-plans/page.tsx:37-43`

If fetch fails (network error), `res.json()` throws unhandled. Wrap in try-catch.

### 7. `handleDelete` missing error handling
**File:** `loan-plans/page.tsx:47-50`

No check on response status. Silent failure if delete fails.

### 8. Type B: Roman numeral skip regex too aggressive
**File:** `xlsx-loan-plan-parser-type-b.ts:92`

`/^[IVX]+\.?\s/` matches legitimate items starting with "I " like "I. Chi phi gong" (section header) but also "IV giong" if it's an actual item. Acceptable trade-off, but document the assumption.

### 9. `META_KEY_MAP` maps "Tong nhu cau von" and "Tong chi phi du kien" both to `totalCost`
**File:** `xlsx-loan-plan-parser-type-a.ts:32-33`

Last-write-wins — if both exist in the same file, one overwrites silently. Should use separate keys or pick priority.

---

## Low Priority

- `fmtVND` is duplicated in both `xlsx-import-preview-modal.tsx` and `page.tsx` — extract to shared
- `customerId` is appended to FormData in hook but not used in the import route — dead data
- Modal file at 160 lines, acceptable

## DN Regression Assessment
**No regression risk.** Import route is a new `POST /api/loan-plans/import/route.ts` — completely additive. Existing loan plan CRUD routes unchanged. The confirm flow reuses existing `POST /api/loan-plans` with Zod validation, so invalid data won't corrupt DB.

## Edge Cases
| Case | Handled? |
|------|----------|
| Empty sheet | Yes — orchestrator checks `SheetNames.length === 0` |
| Missing fields | Yes — defaults to 0/"don vi" |
| Vietnamese diacritics | Yes — fuzzy regex patterns cover variations |
| 0-row data sheet | Yes — Type A returns error if < 2 rows |
| Corrupt XLSX | Yes — try-catch in orchestrator |
| Large file | Yes — 5MB limit in route |

## Recommended Actions (Priority Order)
1. Fix `parseNum` dot-stripping logic (Critical — data correctness)
2. Add magic bytes check (Critical — defense in depth)
3. Fix `parseRate` comma handling (High)
4. Add try-catch to `load()` and `handleDelete` (Medium)
5. Resolve duplicate `totalCost` mapping (Medium)
