# Phase 3: Enhance Fuzzy Matching with Levenshtein Distance

## Context

- [placeholder-utils.ts](../../src/lib/report/placeholder-utils.ts) — current substring-based matching
- [Researcher report: Levenshtein](../reports/researcher-260308-2305-levenshtein-fuzzy-match.md)

## Overview

- **Priority:** Medium
- **Status:** Pending
- **Effort:** 0.5h
- Replace substring-based `suggestAliasForPlaceholder()` with Levenshtein distance for better typo detection.

## Key Insights

- Current implementation uses `includes()` — misses transposition typos (`tong_thu_nhap` vs `tong_thi_nhap`)
- `fastest-levenshtein` package: 2-3KB, 10x faster than alternatives, has `distance()` + `closest()` APIs
- For 100-500 field keys, Levenshtein is <1ms — no perf concern
- Threshold ≤ 3 edit distance catches most single-word typos without too many false positives
- Keep existing substring logic as fallback when Levenshtein finds no matches

## Requirements

### Functional
- Detect typos like `tong_thu_nhep` → suggest `tong_thu_nhap` (1 edit)
- Detect missing/extra chars: `tong_thu_nha` → `tong_thu_nhap` (1 edit)
- Detect transpositions: `tong_thi_nhap` → `tong_thu_nhap` (1 edit)
- Return top 5 suggestions sorted by edit distance (closest first)
- Combine Levenshtein + substring matching for best coverage

### Non-Functional
- `fastest-levenshtein` is client-safe (no Node.js deps) — works in both server and client
- Bundle impact: ~2-3KB gzipped

## Related Code Files

### Modify
- `src/lib/report/placeholder-utils.ts` — enhance `suggestAliasForPlaceholder()`

### Dependencies
- Install: `npm install fastest-levenshtein`

## Implementation Steps

1. Install `fastest-levenshtein`:
   ```bash
   npm install fastest-levenshtein
   ```

2. Update `placeholder-utils.ts`:

```typescript
import { distance } from "fastest-levenshtein";

export function suggestAliasForPlaceholder(placeholder: string, fieldKeys: string[]): string[] {
  const raw = placeholder.trim().toLowerCase();
  const noPrefix = raw.includes(".") ? raw.split(".").slice(1).join(".") : raw;
  const normalized = noPrefix.replaceAll(/[\s_.]/g, "");

  // Score each field key by combined Levenshtein + substring match
  const scored = fieldKeys.map((field) => {
    const key = field.toLowerCase().replaceAll(/[\s_]/g, "");
    const editDist = distance(normalized, key);
    const isSubstring = key.includes(normalized) || normalized.includes(key);
    // Prioritize: exact substring match (score 0), then edit distance
    const score = isSubstring ? Math.min(editDist, 1) : editDist;
    return { field, score };
  });

  return scored
    .filter((s) => s.score <= 3) // threshold: max 3 edits
    .sort((a, b) => a.score - b.score)
    .slice(0, 5)
    .map((s) => s.field);
}
```

3. Verify existing tests still pass (if any)
4. Test with known typo scenarios

## Todo List

- [ ] Install `fastest-levenshtein` package
- [ ] Update `suggestAliasForPlaceholder()` with Levenshtein scoring
- [ ] Test: single char typo → correct suggestion
- [ ] Test: transposition → correct suggestion
- [ ] Test: no close match → empty suggestions
- [ ] Verify client-safe (no Node.js imports)

## Success Criteria

- Typo `tong_thu_nhep` → suggests `tong_thu_nhap` as #1
- Missing char `tong_thu_nha` → suggests `tong_thu_nhap`
- Completely wrong placeholder → returns empty (no false positives)
- Existing substring matches still work
- No bundle size regression beyond ~3KB

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| False positives at threshold 3 | Low | Start with 3, tighten to 2 if needed |
| Package not maintained | Minimal | Algorithm is trivial, can inline if needed |
