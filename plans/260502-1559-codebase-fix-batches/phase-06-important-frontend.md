# Phase 06 — IMPORTANT Frontend + Edge Cases

## Context
- Report: `plans/reports/code-reviewer-260502-1559-frontend-quality.md` (I1..I7, edge cases)

## Overview
- **Priority:** P2
- **Status:** pending
- **Description:** AbortController everywhere; type safety on AI extractor; finally-block fix; OCR reset on customer switch; misc edge cases.

## Issues

### F-I1 — `customer-detail-view.tsx` `loadCustomer()` no abort
**File:** `src/components/customers/customer-detail-view.tsx` L250-251

Refactor `loadCustomer` to accept `signal?: AbortSignal`. Maintain ref:
```ts
const loadAbortRef = useRef<AbortController | null>(null);
async function loadCustomer() {
  loadAbortRef.current?.abort();
  const ctrl = new AbortController();
  loadAbortRef.current = ctrl;
  const res = await fetch(url, { signal: ctrl.signal });
  if (ctrl.signal.aborted) return;
  // ...
}
useEffect(() => () => loadAbortRef.current?.abort(), []);
```

### F-I2 — `useAiOcrActions.ts` empty deps — document why
**File:** `src/app/report/khdn/mapping/hooks/useAiOcrActions.ts` L168, L281

Pattern is correct (`.getState()` always fresh) but undocumented. Add comment:
```ts
// Empty deps intentional: Zustand store accessed via .getState() to avoid
// re-creating callback on every store mutation. HMR-safe because stores are
// module singletons.
// eslint-disable-next-line react-hooks/exhaustive-deps
```
Same for `handleApplyToFieldTemplate` L117-132.

### F-I3 — `AiPasteExtractor`: `any` type + no abort
**File:** `src/components/ui/ai-paste-extractor.tsx` L16, L28-49

```ts
interface ExtractedPayload { /* fields based on /api/ai/extract-text response shape */ }
interface Props { onExtracted: (data: ExtractedPayload) => void; ... }

const abortRef = useRef<AbortController | null>(null);
async function handleExtract() {
  abortRef.current?.abort();
  const ctrl = new AbortController();
  abortRef.current = ctrl;
  const res = await fetch("/api/ai/extract-text", { signal: ctrl.signal, ... });
  // ...
}
function handleClose() { abortRef.current?.abort(); setOpen(false); }
```
Add `aria-expanded={open}` to toggle button (M-1).
Add `maxLength={50000}` to textarea (matches API limit added in S-C1 follow-up — also see edge case below).

### F-I4 — `useAutoTagging.analyzeDocument` no cancel
**File:** `src/app/report/khdn/mapping/hooks/useAutoTagging.ts` L57-109

Add AbortController ref; abort on re-call and on file change.

### F-I5 — `useMappingEffects` customer change race
**File:** `src/app/report/khdn/mapping/hooks/useMappingEffects.ts` L40-54

Use request-id counter pattern (simpler than AbortController for non-fetch loaders):
```ts
const requestIdRef = useRef(0);
useEffect(() => {
  const id = ++requestIdRef.current;
  void (async () => {
    const result = await loadFieldTemplatesRef.current(selectedCustomerId);
    if (id !== requestIdRef.current) return; // stale, drop
    // apply result
  })();
}, [selectedCustomerId]);
```
Coordinate with Phase 3 F-C2 ref refactor.

### F-I6 — `co-borrower handleSave` missing finally
**File:** `src/app/report/customers/[id]/components/customer-co-borrower-section.tsx` L69-89

```ts
try { ... }
catch { setError("Lỗi kết nối"); }
finally { setSaving(false); }
```

### F-I7 — `customer-detail-view.tsx` tab effect double-render
**File:** `src/components/customers/customer-detail-view.tsx` L188-193

Move tab-remap into setter callback to avoid effect:
```ts
function setActiveTabSafe(tab: TabId) {
  const remapped = (isIndividual && tab === "loans") ? "loans-credit" : tab;
  setActiveTab(remapped);
}
```
Replace internal `setActiveTab` calls with `setActiveTabSafe`. Drop the remap effect.

## Edge Cases
1. **AI extract-text length limit** (M-1 from API report): add server-side `if (text.length > 50_000) return 400` in `src/app/api/ai/extract-text/route.ts`.
2. **import-docx file count limit** (M-2): `if (files.length > 5) return 400` in `src/app/api/customers/import-docx/route.ts`.
3. **OCR suggestions stale on customer switch**: in `useMappingEffects` customer-change effect, call `useOcrStore.getState().reset()` before loading new customer's data.
4. **AutoSave snapshots empty fieldCatalog**: in `useAutoSaveSnapshot`, skip snapshot when `fieldCatalog.length === 0 && !explicitlyCleared`.

## Implementation Steps
1. Add AbortController pattern to `customer-detail-view.tsx` `loadCustomer`.
2. Document empty-deps in `useAiOcrActions`.
3. Type `AiPasteExtractor` props; add abort + maxLength + aria-expanded.
4. Add abort to `useAutoTagging.analyzeDocument`.
5. Add request-id counter to `useMappingEffects` customer change.
6. Add `finally { setSaving(false) }` to co-borrower handleSave.
7. Refactor tab remap in `customer-detail-view`.
8. Apply edge cases (text length, file count, OCR reset, autosave guard).

## Todo
- [ ] Abort `loadCustomer` on unmount
- [ ] Document `useAiOcrActions` empty-deps with comment
- [ ] Type `AiPasteExtractor.onExtracted` (drop `any`)
- [ ] AbortController + `maxLength` + `aria-expanded` on AiPasteExtractor
- [ ] Abort `useAutoTagging.analyzeDocument` on re-call
- [ ] Request-id counter in `useMappingEffects` customer effect
- [ ] `finally { setSaving(false) }` in co-borrower
- [ ] Refactor `customer-detail-view` tab remap effect
- [ ] Server-side text length cap in `ai/extract-text`
- [ ] Server-side file count cap in `customers/import-docx`
- [ ] Reset `useOcrStore` on customer switch
- [ ] Guard autosave against empty fieldCatalog snapshot

## Success Criteria
- No `any` in `AiPasteExtractor` props
- All in-flight fetches in mapping/customer flows abort on unmount/re-trigger
- co-borrower save button never permanently stuck
- Customer switch never shows previous OCR suggestions
- Tab effect renders once

## Risk
- **R1:** AbortController + React 18 Strict Mode double-mount can spuriously abort first request — handle `AbortError` silently.
- **R2:** Request-id pattern requires loader to return result (not setState internally) — may need refactor of store actions to return values.
