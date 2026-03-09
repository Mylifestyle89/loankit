# Code Review: AI Extraction Pipeline Refactor (P01 + P02 + P03)

## Scope

| Metric | Value |
|--------|-------|
| Files reviewed | 9 (6 new, 3 modified) |
| Total LOC | 1,305 |
| Focus | Modularization, Zod validation, structured JSON schemas |
| Build | tsc clean, 111/111 tests pass |

### Files

**New (extraction/):**
- `extraction-text-helpers.ts` (160 LOC) - shared text utilities
- `extraction-docx-xml-parser.ts` (139 LOC) - DOCX XML table parsing
- `extraction-docx-table-fields.ts` (59 LOC) - 2-col table field extraction
- `extraction-docx-paragraph.ts` (74 LOC) - adjacent paragraph extraction
- `extraction-docx-repeater.ts` (141 LOC) - repeater/multi-row extraction
- `extraction-value-validator.ts` (159 LOC) - Zod validation layer

**Modified:**
- `extract-fields-from-docx-report.ts` (171 LOC) - rewritten as orchestrator
- `extract-fields-from-ocr.ts` (94 LOC) - validation integration
- `document-extraction.service.ts` (309 LOC) - structured JSON schemas

---

## Overall Assessment

Refactor bien thuc hien tot. 660-line monolith duoc tach thanh 6 module dung huong, moi file duoi 200 LOC (tru `document-extraction.service.ts` o 309 LOC). DRY compliance tot — shared types va helpers dung chung giua DOCX va OCR pipelines. Validation layer (Zod) tich hop dung vi tri. Structured schemas cho OpenAI/Gemini duoc implement chinh xac.

**Verdict: APPROVE voi 1 High va vai Medium suggestions.**

---

## Critical Issues

Khong co.

---

## High Priority

### H1. Timer leak trong timeout promise (DOCX orchestrator, line 65-69)

```typescript
const timeoutPromise = new Promise<never>((_, reject) => {
  const timer = setTimeout(() => {
    clearTimeout(timer);  // clearTimeout inside own callback = no-op
    reject(new AiMappingTimeoutError("DOCX extraction timed out."));
  }, timeoutMs);
});
```

`clearTimeout(timer)` ben trong callback cua chinh no la no-op — timer da fire roi. Van de thuc su: khi `parsePromise` resolve truoc timeout, timer van chay trong background cho den khi fire va reject (nhung khong ai catch). Dieu nay:
- Giu reference trong event loop (nho nhung co the tich luy khi goi nhieu lan)
- Unhandled rejection co the log warning tuy runtime

**Fix:** Dung `AbortController` hoac clear timer sau race:

```typescript
let timer: ReturnType<typeof setTimeout>;
const timeoutPromise = new Promise<never>((_, reject) => {
  timer = setTimeout(() => reject(new AiMappingTimeoutError("...")), timeoutMs);
});
try {
  return await Promise.race([parsePromise, timeoutPromise]);
} finally {
  clearTimeout(timer!);
}
```

Same issue ton tai o `extract-fields-from-ocr.ts` line 44-48.

**Impact:** Memory leak potential khi xử ly nhieu file lien tiep. Trong production co the tich luy.

---

## Medium Priority

### M1. `document-extraction.service.ts` vuot 200 LOC (309 LOC)

File nay chua ca schema builders, prompt builder, sanitize, timeout wrapper, 2 provider implementations, va service export. Theo project convention (< 200 LOC), nen tach:
- Schema builders (`buildOpenAIJsonSchema`, `buildGeminiResponseSchema`) → `extraction-ai-schema-builders.ts`
- Provider implementations (`extractViaOpenAI`, `extractViaGemini`) → giu trong service hoac tach rieng

Tuy nhien, day la file duy nhat vuot gioi han va logic kha cohesive. Co the chap nhan o muc medium priority.

### M2. `as any` cast cho Gemini responseSchema (line 227)

```typescript
responseSchema: buildGeminiResponseSchema(fields) as any,
```

Da co eslint-disable comment, nhung nen them note giai thich tai sao: Gemini SDK type khong match voi thuc te API accept. Hien tai co eslint-disable, coi nhu acceptable.

### M3. `buildHeaderValueCandidates` split tren `-` co the false positive

```typescript
const split = line.split(/[:\-]/);
```

Lines nhu `"Ngay 15-03-2024"` se bi split sai — tao header `"Ngay 15"` va value `"03-2024"`. Tuong tu `"Ho-Chi-Minh"` se bi tach.

**Suggestion:** Uu tien split tren `:` truoc, chi fallback sang `-` khi khong co `:`:

```typescript
let split = line.split(":");
if (split.length < 2) split = line.split("-");
```

Tuy nhien, day la logic cu (khong thay doi trong refactor), nen co the de lai cho improvement rieng.

### M4. Duplicate `as OcrFieldSuggestion[]` casts (OCR pipeline)

```typescript
// line 80
suggestions = extractByHeuristic(...) as OcrFieldSuggestion[];
// line 84
const validated = validateAndAdjustSuggestions(...) as OcrFieldSuggestion[];
```

`validateAndAdjustSuggestions` tra ve `FieldSuggestion[]` nhung actual type la `OcrFieldSuggestion` vi source duoc preserve. Cast la dung nhung co the improve bang generic type parameter trong `validateAndAdjustSuggestions`.

### M5. Khong co barrel export (index.ts) cho extraction/

Hien tai moi consumer phai import truc tiep tung file. Mot `index.ts` re-export se giup:
- Import gon hon
- Control public API cua module

---

## Low Priority

### L1. `toTypedValue` return type rong (`string | number | boolean | null`) nhung boolean case khong duoc handle

Function chi xu ly `number`, `percent`, `date`, va default `text`. `boolean` field type se tra ve string. Khong sai nhung type signature hoi misleading.

### L2. Magic numbers cho confidence scores

Confidence scores (0.82, 0.68, 0.75, 0.65, 0.78, 0.8, 0.7) scatter across files. Co the extract thanh named constants trong `extraction-text-helpers.ts` de dễ tune.

### L3. Vietnamese comment trong `document-extraction.service.ts`

Mix Vietnamese va English comments. Khong anh huong function nhung nen consistent.

---

## Edge Cases Found by Scout

1. **Timer leak (H1 above):** Timeout promise khong duoc cleanup khi main promise resolve truoc. Anh huong ca DOCX va OCR pipelines.

2. **Regex greedy match trong XML parser:** `W_TABLE_RE = /<w:tbl[\s\S]*?<\/w:tbl>/g` dung lazy match (`*?`) — dung. Nhung nested `<w:tbl>` (rare nhung possible trong complex DOCX) se bi parse sai. Acceptable risk.

3. **`parseVietnameseNumber` edge case:** Input `"1.2"` (1 dot, 1 decimal digit) — regex `/^\d{1,3}(\.\d{3})*(,\d+)?$/` khong match nen fallback sang `Number("1.2")` = 1.2. OK.

4. **`isValidDate` khong cover "Ngay XX thang YY nam ZZZZ":** Vietnamese text dates trong formal documents thuong dung format nay. Validator se tra `"warning"` (khong reject), nen acceptable.

5. **Race condition:** Neu `parseXmlTablesRaw` throw (corrupt ZIP), error propagate dung len orchestrator. No issue.

6. **Downstream consumer intact:** `extract-fields-from-report.ts` (line 20-25) dung inline type, khong import `DocxFieldSuggestion` truc tiep — nen refactor khong break consumer.

---

## Positive Observations

1. **Clean separation of concerns** — Moi module co 1 trach nhiem ro rang
2. **PII scrubbing preserved** — `securityService.scrubSensitiveData` goi dung vi tri cho text fields, skip cho number/percent
3. **Dedup strategy dung** — `dedupeByField` giu suggestion co confidence cao nhat
4. **Validation layer non-destructive** — Chi adjust confidence, khong reject data. Phu hop voi AI extraction (values co the unusual format)
5. **Structured schemas** — OpenAI `json_schema` strict mode + Gemini `responseSchema` — giam hallucination va invalid JSON
6. **Good error boundaries** — `documentExtractionService.extractFields` catch-and-return-empty, khong block main flow
7. **File naming** — Kebab-case, descriptive, self-documenting

---

## Recommended Actions

1. **[High] Fix timer leak** trong ca `extract-fields-from-docx-report.ts` va `extract-fields-from-ocr.ts` — dung try/finally + clearTimeout
2. **[Medium] Consider splitting** `document-extraction.service.ts` neu them logic moi (hien 309 LOC, gan gioi han)
3. **[Medium] Improve header:value split** logic de tranh false positive voi dates va hyphenated names (co the lam trong separate PR)
4. **[Low] Add barrel export** `extraction/index.ts`
5. **[Low] Extract confidence constants** thanh named constants

---

## Metrics

| Metric | Value |
|--------|-------|
| All files under 200 LOC | 8/9 (document-extraction.service.ts = 309) |
| Type safety | Good — 1 justified `as any` (Gemini SDK), vai `as Type[]` casts |
| DRY compliance | Pass — shared helpers, no duplication between DOCX/OCR |
| Security (PII scrub) | Pass — scrub preserved, number fields excluded correctly |
| Behavior change in P01 | None detected — pure refactor |
| Zod validation | Correct — VN number, date, percent, boolean formats covered |
| Structured schemas | Correct — OpenAI strict + Gemini responseSchema |

---

## Unresolved Questions

1. `document-extraction.service.ts` o 309 LOC — chap nhan hay bat buoc tach?
2. `buildHeaderValueCandidates` split tren `-` — fix now hay defer?
