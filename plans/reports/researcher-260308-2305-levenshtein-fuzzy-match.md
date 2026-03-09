# Research: Lightweight Levenshtein Distance & Fuzzy Matching for TypeScript/Node.js

**Date:** 2026-03-08 | **Duration:** Quick research (5 searches) | **Context:** Field key typo suggestions in DOCX template placeholders

---

## Executive Summary

For suggesting closest field_key matches on user typos (e.g., `tong_thu_nhap` → `tong_thu_nhap_rong`), recommend **`fastest-levenshtein`** package. For 100-500 field keys, simple inline algorithm is viable alternative. Edit distance threshold of **2-3** balances precision/recall for template fields.

---

## 1. Package Comparison

### `fastest-levenshtein` (RECOMMENDED)
- **Status:** Most popular, actively maintained
- **Bundle size:** Minimal (~2-3 KB gzipped)
- **Performance:** 10x+ faster than js-levenshtein on benchmarks
- **Key methods:**
  - `distance(a, b)` → returns edit distance number
  - `closest(target, array)` → finds nearest match in array
- **TypeScript support:** Native
- **NPM weekly downloads:** ~1M+

### `js-levenshtein`
- **Status:** Stable but less maintained
- **Performance:** 143 op/s (50 paragraphs) vs `fastest-levenshtein` much higher
- **Use case:** When absolute simplicity > performance

### Other options:
- **`fuse.js`:** 1.58 KB, uses Bitap algorithm (Levenshtein-based), full-featured fuzzy search but overkill for simple field matching
- **`uFuzzy`:** Tiny efficient alternative, optimized for typo detection
- **Inline algorithm:** Feasible for small datasets (<200 fields); ~20 lines of code with 2-row optimization

---

## 2. Performance Profile (Small Datasets: 100-500 fields)

### Benchmarks for Use Case
- **Dataset:** 300 field keys, avg 15-20 chars (`tong_thu_nhap_rong`, `so_tien_vay`, etc.)
- **Operations:** Calculate distance to all 300 fields on single user typo input
- **Estimated speed:**
  - `fastest-levenshtein`: **<1ms** total (3+ microsecs per calculation)
  - Inline algorithm: **~2-5ms** (simpler implementation, more GC pressure)
  - Browser bundle impact: `fastest-levenshtein` adds ~2-3 KB

**Verdict:** `fastest-levenshtein` insignificant bundle cost, negligible latency advantage for this scale. Inline viable if bundling constraints critical.

---

## 3. Inline Implementation (No Dependencies)

```typescript
// Simple 2-row optimization (O(min(m,n)) space)
function levenshteinDistance(a: string, b: string): number {
  const len1 = a.length, len2 = b.length;
  if (len1 === 0) return len2;
  if (len2 === 0) return len1;

  let prev = Array(len2 + 1).fill(0);
  let curr = Array(len2 + 1).fill(0);

  for (let i = 0; i <= len2; i++) prev[i] = i;

  for (let i = 1; i <= len1; i++) {
    curr[0] = i;
    for (let j = 1; j <= len2; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(
        curr[j - 1] + 1,      // insertion
        prev[j] + 1,           // deletion
        prev[j - 1] + cost     // substitution
      );
    }
    [prev, curr] = [curr, prev];
  }
  return prev[len2];
}

function suggestClosestField(
  typo: string,
  fieldKeys: string[],
  threshold = 2
): string | null {
  let closest: string | null = null;
  let minDist = threshold;

  for (const key of fieldKeys) {
    const dist = levenshteinDistance(typo.toLowerCase(), key.toLowerCase());
    if (dist < minDist) {
      minDist = dist;
      closest = key;
    }
  }
  return closest;
}
```

**Pros:** No dependency, ~50 lines with ranking logic
**Cons:** Slower on large datasets, requires manual optimization

---

## 4. Edit Distance Thresholds

### Recommended: `threshold = 2`

| Threshold | Example Matches | Use Case | False Positives |
|-----------|---|---|---|
| **1** | `tong_thu_nhap` ↔ `tong_thuU_nhap` (one char error) | Typos only | Low |
| **2** | `tong_thu_nhap` ↔ `tong_thu_nhap_rong` (2 insertions) | **Field typos** | Minimal |
| **3** | `tong_thu_nhap` ↔ `tong_tu_nhap` (deletion + swap) | Aggressive | Medium |

**For DOCX template field matching:** Start with `threshold = 2`. User typos typically 1-2 character variations (missing char, swap, partial). If false positives occur (suggesting wrong field), tighten to 1 or add prefix-matching secondary filter.

---

## 5. Next.js/React Patterns

### Pattern 1: Server-Side (Recommended for 100+ fields)
```typescript
// app/api/suggest-field.ts
import { distance } from 'fastest-levenshtein';

export async function POST(req: Request) {
  const { typo, fields } = await req.json();

  const suggestions = fields
    .map(key => ({ key, dist: distance(typo, key) }))
    .filter(x => x.dist <= 2)
    .sort((a, b) => a.dist - b.dist)
    .slice(0, 5)
    .map(x => x.key);

  return Response.json({ suggestions });
}
```

### Pattern 2: Client-Side (Recommended for <200 fields)
```typescript
// lib/field-suggestions.ts
import { closest } from 'fastest-levenshtein';

export function suggestField(typo: string, fields: string[]): string | null {
  const match = closest(typo, fields);
  // closest() returns the match with lowest distance
  // Optionally check distance manually if threshold needed
  return match;
}
```

### Pattern 3: React Component
```tsx
const [suggestions, setSuggestions] = useState<string[]>([]);

const handleFieldChange = (value: string) => {
  if (value.length >= 3) {
    const sugg = availableFields
      .map(f => ({ field: f, dist: distance(value, f) }))
      .filter(x => x.dist <= 2)
      .sort((a, b) => a.dist - b.dist)
      .slice(0, 3);
    setSuggestions(sugg.map(x => x.field));
  }
};
```

**Pattern choice:** `fastest-levenshtein` in client-side React (build-time overhead minimal for 2-3 KB). Move to server if real-time performance critical on 1000+ field keys.

---

## 6. Fuse.js Comparison (Not Recommended Here)

- **When to use Fuse.js:** Full-text search, weighted scoring across multiple fields, tokenization needed
- **Why not for this use case:** Overkill; Fuse.js optimizes for prefix matching + scoring, adds ~9 KB min
- **Our use case is simpler:** Single string match with distance threshold; Levenshtein is sufficient

---

## Implementation Recommendation

### For DOCX Template Field Suggestions:

1. **Package Choice:** `fastest-levenshtein`
   - npm install fastest-levenshtein
   - Add to tsconfig allowSyntheticDefaultImports if needed

2. **Implementation Location:** Server API route (`app/api/suggest-field`) or utility function
   - If <200 fields: client-side (React component)
   - If 200+ fields: server-side (API call on blur/change)

3. **Threshold:** Start `2`, adjust down to `1` if false positives

4. **Usage:**
   ```typescript
   import { closest, distance } from 'fastest-levenshtein';

   const typo = '[tong_thu_nhap]'; // user input
   const suggestions = templateFields
     .filter(f => distance(typo, f) <= 2)
     .sort((a, b) => distance(typo, a) - distance(typo, b))
     .slice(0, 5);
   ```

5. **No need for:** Fuse.js, inline algorithm, or other libraries

---

## Unresolved Questions

- What's the expected field count in real templates? (Impacts server vs client decision)
- Should suggestions show edit distance score to user, or just "did you mean X?"
- Case sensitivity needed? (Current recommendation: lowercase for comparison)

---

## Sources

- [fastest-levenshtein - npm](https://www.npmjs.com/package/fastest-levenshtein)
- [GitHub - ka-weihe/fastest-levenshtein](https://github.com/ka-weihe/fastest-levenshtein)
- [GitHub - gustf/js-levenshtein](https://github.com/gustf/js-levenshtein)
- [Levenshtein Distance Optimization Guide - Turnerj Blog](https://turnerj.com/blog/levenshtein-distance-part-3-optimize-everything)
- [Fuzzy String Matching in Python Tutorial - DataCamp](https://www.datacamp.com/tutorial/fuzzy-string-python)
- [Fuse.js | Official Documentation](https://www.fusejs.io/)
- [GitHub - leeoniya/uFuzzy](https://github.com/leeoniya/uFuzzy)
