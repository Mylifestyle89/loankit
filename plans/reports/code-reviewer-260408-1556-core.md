# Core Business Logic Review — 2026-04-08

## Scope
- Requested: `src/core/**`, `src/types/**`, `src/generated/**`, `scripts/**`
- Actual core loan/docx logic lives in `src/lib/loan-plan/`, `src/lib/report/`, `src/lib/import/`, `src/services/khcn-builder-*`, `src/lib/docx-engine-helpers.ts`, `src/core/use-cases/extraction/` — reviewed those too.
- `src/types/` contains only `docx-merger.d.ts` (ambient). `src/generated/prisma` skipped (codegen).
- Files skimmed: ~25 key files; LOC ~3000 in hot paths.

## Overall Assessment
Core financial math is mostly isolated and pure in `loan-plan-calculator.ts` (good). DOCX XML handling is regex-based with multiple known edge-case pitfalls (split-runs, nested tables). Builder files (`khcn-builder-loan-plan.ts`) are doing too much — mixing calc + formatting + alias mapping, 300+ LOC each. Field-sync across types/zod/service/editor is incomplete for `income_source_type`. No dedicated tests for loan-plan calculators or builders.

---

## CRITICAL

### C1. `income_source_type` not synced in `LoanPlanFinancialsExtended` type and editor
- `src/lib/loan-plan/loan-plan-schemas.ts:31` — zod has it.
- `src/services/loan-plan.service.ts:58` — service persists it into `financials_json`.
- `src/app/report/customers/[id]/loan-plans/new/page.tsx:48` — new page sends it.
- `src/lib/loan-plan/loan-plan-types.ts` (L87-118) — `LoanPlanFinancialsExtended` **missing** `income_source_type`.
- `src/app/report/customers/[id]/loan-plans/[planId]/loan-plan-editor-types.ts` — editor `Financials` type **missing** `income_source_type`.
- Impact: edit page cannot read/write `income_source_type`. Depending on how editor posts update, this field may be silently stripped on edit (exact recurrence of the pattern flagged in memory `feedback_loan_plan_extended_field_sync`). Even if not stripped, users lose the ability to change income source after creation.
- Fix: add to both types; verify [planId] page preserves/edits it.

### C2. Regex placeholder scanner joins ALL `<w:t>` across entire XML part
- `src/lib/report/template-parser.ts` L30-36, L71-77.
- `parseDocxPlaceholderInventory` and `parseDocxPlaceholdersFromBuffer` concat EVERY `<w:t>` in `word/document.xml` into one giant string, then run `/\[([^\]\r\n]{1,200})\]/g`.
- Edge case: if an unclosed `[` appears in one paragraph and a `]` in a far-away unrelated paragraph/cell (e.g. a stray "[" in legal boilerplate), a false-positive placeholder spanning arbitrary text will be reported to the UI and validator. Only the `\r\n` in the regex character class guards that, but `<w:t>` content generally has newlines stripped (newlines live in `<w:br/>`), so the guard is weak.
- Contrast: `src/lib/docx-engine-helpers.ts::mergeAdjacentRuns` correctly scans per-paragraph. Placeholder-inventory should do the same: iterate `<w:p>` blocks, then join `<w:t>` within paragraph only.
- Additionally: `BRACKET_RE` is declared at module scope with `g` flag and reused via `matchAll`. `matchAll` resets state so OK; just flagging as fragile pattern.

### C3. `calcFinancials` ignores `termMonths` — annual-only interest
- `src/lib/loan-plan/loan-plan-calculator.ts:21-23, 172-197`.
- `calcInterest(loanAmount, rate) = loanAmount * rate`. So for a 36-month loan, stored `financials.interest` = 1-year interest, not 3 years.
- The docx builder (`khcn-builder-loan-plan.ts:170-174`) separately recomputes `interestCost = rate * loanAmount * months / 12` and overwrites. So rendered templates are OK, BUT `financials_json.interest` and `financials_json.totalCost` persisted by the service (L105, L138) are WRONG for terms ≠ 12 months. Any downstream consumer that reads `financials.interest`/`totalCost` (AI mapping, analytics, reports on the plan itself) will get stale numbers.
- Fix: calcFinancials must accept `termMonths` and compute `interest = loanAmount * rate * months / 12`, OR stop persisting those derived fields and compute on-demand only in the builder.

### C4. Indirect-cost logic drops interest whenever depreciation > 0
- `src/services/khcn-builder-loan-plan.ts:177`
```ts
const totalIndirectCost = (depreciation > 0) ? depreciation : (interestCost + tax);
```
- Greenhouse/trung-dài-hạn templates may want this, but the condition is too broad: any plan with a non-zero `asset_unit_price × land_area_sau / years` silently drops interest + tax from totalIndirectCost AND thus from totalCost/profit displayed in the report. A short-term loan that happens to have depreciation metadata filled would show wrong numbers.
- Fix: gate on `loan_method === "trung_dai"` (or similar explicit flag), not on depreciation presence. And/or include interest + tax + depreciation all together for trung dài hạn.

### C5. Nested-table regex corruption in XML parser
- `src/core/use-cases/extraction/extraction-docx-xml-parser.ts:12` — `W_TABLE_RE = /<w:tbl[\s\S]*?<\/w:tbl>/g`.
- Non-greedy match will terminate at the FIRST `</w:tbl>`, so a cell that contains a nested table produces a truncated outer-table match and an orphan "table" from the remaining XML. Column counts end up misaligned → rows filtered out, repeater extraction silently loses data.
- Row/cell regexes have the same class of issue for nested structures.
- This is an existing known problem (echoed in MEMORY.md `feedback_docx_preview_rangeerror` root cause note on nested tables).
- Fix: use an XML walker (e.g. fast-xml-parser or hand-written stack-balanced scan) for table extraction. Alternatively, pre-strip nested tables or mark them opaque before regex.

---

## IMPORTANT

### I1. `mergeAdjacentRuns` depth calculation uses wrong source
- `src/lib/docx-engine-helpers.ts:163-171`.
- When merging run `j` into run `i`, the loop recomputes `depth` from `nodes[j].text` (original), but it should recompute from what just got appended. In practice this equals `textMods[j].newText` only because empty-string has already been set — the depth loop actually looks at the ORIGINAL text. Since `textMods[i].newText += textMods[j].newText` uses the mod, but depth counts `nodes[j].text`, the two diverge if any earlier merge has already mutated `textMods[j]`. With simple single-level placeholders this mostly works; with multiple placeholders in the same paragraph spanning adjacent runs, it can under/over-count.
- Also: outer `for (i)` doesn't skip past the `j` indices that were consumed — next `i = j'` starts at an empty `newText` (depth 0 → skipped) so behavior is probably correct by accident. Document this invariant or explicitly advance `i`.
- No test coverage for split-run edge cases.

### I2. Revenue unit is silently overridden in tiêu dùng / trung dài hạn
- `src/services/khcn-builder-loan-plan.ts:161` — `ĐVT: r.unit ?? "đ"` applies across all revenue contexts. OK for many but tiêu dùng `xay_dung` or `an_uong` may want "đơn vị" / "suất" defaulting. Minor but inconsistent with cost items which use `""` default.

### I3. Tax/interest double-formatting and duplicate alias assignment
- `src/services/khcn-builder-loan-plan.ts:116-123` sets `PA.Thuế`, `PA.Tổng chi phí`, `PA.Tổng chi phí gián tiếp`, etc. from raw financials, then L188-195 OVERWRITES the same keys with recomputed values. Works by ordering, but fragile: future code reordering will silently change output. Consolidate into a single emit block after all computations.

### I4. `calcRepaymentSchedule` preferential-rate switching uses year-1 of (p * freq / 12)
- `loan-plan-calculator.ts:156-158`. `currentYear = Math.ceil(p * freq / 12)`.
- With `freq=12` (yearly): year = p, correct.
- With `freq=6`: p=1 → year=1, p=2 → year=1, p=3 → year=2, correct (two 6-month periods in year 1).
- With `freq=1` (monthly): p=1 → year=1 … p=12 → year=1 (12*1/12=1), p=13 → year=2. Correct.
- With `freq=3`: p=4 → year=1 (4*3/12=1), p=5 → year=2. Wrong — period 5 starts at month 13 which is year 2 ✓. Actually correct. OK this is fine; keeping note only. No fix.

### I5. `xlsx-loan-plan-parser-type-b.ts::extractItems` may drop valid rows
- L80: `if (amount === 0 && qty === 0 && unitPrice === 0) continue;`
- A row with only a name (e.g. free-form note rows, headers carried over from splitSections that SECTION_MARKERS didn't catch) gets silently dropped. Usually fine, but a section whose marker regex didn't match leaves phantom header in the items list. No warning for skipped non-empty names.
- Also `SKIP_ROW_PATTERNS = /^(t[oổ]ng|c[oộ]ng|total|sum)/i` — matches any name STARTING with "tổng", e.g. "Tổng hợp vật tư phụ" is dropped. Consider word-boundary.

### I6. `buildLoanPlanExtendedData` — `cpCapital` uses already-persisted counterpartCapital without recalculation
- L99-111, then L223-228 recomputes from cost items. The early assignment of `PA.Tỷ lệ vốn đối ứng` (L111-113) runs before cost items parsed, then gets OVERWRITTEN at L227-229. Same class as I3 (double write, fragile).

### I7. Numeric coercion risks in `parseNum` / `num()`
- `khcn-builder-loan-plan-tieu-dung.ts:27` — `const num = (v) => Number(v) || 0`. Drops legitimate `NaN` checks but also drops `0.0` is fine. However `Number("1,000")` in Vietnamese locale strings returns `NaN` → `0`. If any financials field comes from user typing with commas, it silently becomes 0. Builders should use a single locale-aware parser (there is `parseNum` in `xlsx-number-utils.ts` — reuse across modules).

### I8. `template-parser.ts` BRACKET_RE allows `{1,200}` — DoS via long matches
- L8: unbounded cell text plus `[^\]\r\n]{1,200}` is bounded so OK, but `\[.{1,200}\]` inside joined full-document text is O(n × 200) worst case. Non-critical (parsed files are trusted), but flag.

### I9. Files > 200 LOC (per CLAUDE.md rule)
- `src/services/khcn-builder-loan-plan.ts` — 308 LOC. Mixing: field aliasing, derived calcs, fee computation, PA_TRANO building. Split into:
  - `khcn-builder-loan-plan-sxkd.ts` (cost/revenue/ratio)
  - `khcn-builder-loan-plan-repayment.ts` (PA_TRANO + prepayment fees)
  - keep `khcn-builder-loan-plan.ts` as dispatcher.
- `src/services/auto-process.service.ts` — 305 LOC.
- `src/services/khcn-report-data-builder.ts` — 267 LOC.
- `src/lib/docx-engine-helpers.ts` — 240 LOC.
- `src/services/khcn-builder-loan-plan-tieu-dung.ts` — exactly 200 LOC, borderline.

### I10. No tests for loan-plan math or DOCX run merging
- `src/lib/loan-plan/` — zero tests. This is the financial core of the product.
- `mergeAdjacentRuns`, `cleanupRenderedDocXml`, `parseDocxPlaceholdersFromBuffer` — no tests.
- Recommended minimum:
  - `calcRepaymentSchedule` with freq 1/3/6/12, preferential-rate years, rounding modes (incl. last-period adjustment sums exactly to loanAmount).
  - `calcFinancials` — ensure derived totals are consistent.
  - `mergeAdjacentRuns` — 3 fixtures: single split, nested bracket, multi-placeholder paragraph.
  - `parseDocxPlaceholdersFromBuffer` — fixture with `[A]` in row 1 and unclosed `[` in row 2 (should NOT cross paragraphs).

---

## NICE-TO-HAVE

### N1. Magic constants
- `khcn-builder-loan-plan.ts:199` — `SUPPLY_ITEMS` hard-coded to 9 agriculture materials. Belongs in a registry (by category/template), not inline.
- `MIN_FEE = 1_000_000`, 4%/3%/2% fee tiers, 16M cap: duplicated in both `khcn-builder-loan-plan.ts:277-301` and `khcn-builder-loan-plan-tieu-dung.ts:167-198`. Extract to `loan-plan-constants.ts`.

### N2. Date-serial detection heuristic
- `khcn-builder-loan-plan.ts:73` — `numDate > 30000 && numDate < 100000` for Excel serials. Brittle: date `1/1/2174` = 100464 outside bound, and any random number in that range gets converted. Prefer using metadata from the XLSX parser (propagate cell type) than guessing at render time.

### N3. `withDsAliases` / `emit*` duplication across collateral builders
- land/movable/savings each manually prefix with `SĐ.`, `ĐS.`, `TK.`, `STK.`, `TSK.`. DRY into one helper that takes prefix + object and returns aliased clone.

### N4. `decodeXmlEntities` in two places
- `src/lib/report/template-parser.ts:46` and `src/core/use-cases/extraction/extraction-text-helpers.ts::decodeXmlText`. Same function, not shared. Consolidate.

### N5. `PA.Tên phương án = plan.name` overwrites after earlier assignment
- Minor: L96 sets `PA.Tên phương án`; would be clearer placed near the top of the function with the other PA metadata.

### N6. `cleanupRenderedDocXml` — regex may strip intentional empty rows with text in drawings/SDT content
- L225: `visibleText = row.replace(/<[^>]+>/g, "").trim()` — strips all tags, so a row whose only visible "content" is an inline image / checkbox / SDT control is considered empty and removed. Guarded partially by `w:hRule="exact"`. Consider also guarding on `<w:drawing` or `<w:pict`.

---

## Positive Observations
- `loan-plan-calculator.ts` is small, pure, and composable (calc* functions separable). Good discipline.
- `mergeAdjacentRuns` handles the per-paragraph merging correctly for the common case — non-trivial OOXML work.
- `xlsx-loan-plan-parser-type-b.ts` uses fuzzy column detection with a sensible fallback order.
- `khcn-builder-collateral-movable.ts` is under 120 LOC and well-structured.
- `EXTENDED_FINANCIAL_KEYS` list centralizes the JSON merge fields (just needs to stay in sync with types — which is currently its weak point).
- `noClone` dead-code removal completed — no residual references in `src/`.
- Zod schema + INCOME_SOURCE_TYPES enum is well typed.

---

## Recommended Actions (prioritized)
1. **C1** — Add `income_source_type` to `LoanPlanFinancialsExtended` and editor `Financials`; wire into edit page. (prevents silent-strip regression)
2. **C3** — Either pass `termMonths` into `calcFinancials` or stop persisting `interest`/`totalCost` derived fields. Current persisted values are wrong for term ≠ 12 months.
3. **C4** — Gate `depreciation > 0` override on explicit loan method (`trung_dai`).
4. **C2** — Rewrite `parseDocxPlaceholdersFromBuffer` to scan per-`<w:p>`, not per XML part.
5. **C5** — Replace `W_TABLE_RE` greedy-less regex with XML-aware walker (or stack-balanced scan). Nested tables are silently corrupted today.
6. **I10** — Add unit tests: `calcRepaymentSchedule` (all freq/rounding combos), `mergeAdjacentRuns`, `parseDocxPlaceholdersFromBuffer`.
7. **I1 / I3 / I6** — Refactor builders to a single-write pattern; split `khcn-builder-loan-plan.ts` into ≤200 LOC modules.
8. **N1** — Extract fee constants and supply-items registry.

---

## Metrics
- Files reviewed: ~25
- LOC reviewed: ~3000
- Critical issues: 5
- Important issues: 10
- Nice-to-have: 6
- Test coverage for loan-plan math: **0 tests**
- Files > 200 LOC in scope: 4

---

## Unresolved Questions
1. **C1**: Does the loan plan edit flow currently lose `income_source_type` on update, or is it preserved via the `key in data` branch in `updatePlan` (L142-146)? Service keeps existing value if not in data, so may be safe — but the user cannot change it. Intended?
2. **C3**: Is `financials.interest` read anywhere else (AI mapping, BCĐX auto-fill, analytics)? Grep suggests builders override, but external consumers may not. Need to confirm before changing calc semantics.
3. **C4**: Are there non-trung-dài-hạn plans with non-zero `asset_unit_price`/`land_area_sau`? If never, current code is safe-by-convention; if ever, it's a bug.
4. **C5**: How prevalent are nested tables in real `report_assets/KHCN templates/` files? If ≤0 today, acceptable risk with explicit guard; if any, fix immediately.
5. **I2**: Is `"đ"` the correct default for all revenue-item unit fields, or should tiêu dùng / kinh doanh differ?
6. Scope clarification: The prompt said `src/core/**` but core domain logic lives in `src/lib/loan-plan/`, `src/lib/report/`, `src/services/khcn-builder-*`. Is this review scope correctly expanded, or should `src/core/**` be interpreted literally (in which case the actual files are only `errors/` and `use-cases/extraction/` + `use-cases/*.ts`)?
