# Brainstorm: KHDN Mapping Re-render Performance — Technical Debt

**Date:** 2026-03-25
**Status:** Deferred — technical debt, no immediate action
**Module:** `src/app/report/khdn/mapping/`

---

## Problem Statement

`useMappingPageLogic` (462 lines) acts as a God Object aggregator — collects all 8 Zustand stores + 10+ feature hooks → returns ~90 fields as a single object to `MappingPageContent`. Any state change in any store triggers full re-render of all child components, even unrelated ones.

## Scout Findings (Corrections to Code Review)

| Review claim | Reality |
|---|---|
| 🔴 ai-suggest not implemented | ✅ Server-side redirect to `?openAiSuggestion=1` — correct pattern |
| 🟡 KHDN/KHCN stores duplication risk | ✅ KHCN has NO mapping module — zero overlap |
| 🟡 useMappingPageLogic too large | ⚠️ Real issue — 462 lines, ~90 return props |

## Agreed Solution: Zustand Component-level Selectors

**Pattern:** Each child component subscribes directly to only the store slices it needs.

```typescript
// BEFORE: props drilled from parent via useMappingPageLogic
function MappingSidebar({ ocrLogs, isImporting, fieldTemplates, ... }) { ... }

// AFTER: component owns its subscriptions
function MappingSidebar() {
  const ocrLogs = useOcrStore(s => s.logs)           // re-renders ONLY when logs change
  const isImporting = useUiStore(s => s.isImporting)
  const fieldTemplates = useFieldTemplateStore(s => s.templates)
  ...
}
```

## What Stays in useMappingPageLogic

- Event handlers / callbacks (memoized with useCallback)
- Cross-store operations (e.g., save draft touches 3 stores at once)
- Complex computed derivations (useMapppingComputed)
- Side effects (useEffect, API calls)

## What Moves to Child Components

| Component | Stores to subscribe directly |
|---|---|
| MappingVisualSection | useMappingDataStore, useOcrStore (suggestions) |
| MappingSidebar | useUiStore (isImporting), useFieldTemplateStore |
| MappingStatusBar | useUndoStore (canUndo), useOcrStore (status/count) |
| MappingHeader | useUiStore (isSaving) |
| OcrReviewModal | useOcrStore (full slice) |

## When to Implement

**Trigger condition:** React DevTools Profiler shows component re-render > 16ms without user-visible change, OR mapping module expands with new feature (loan plan integration, etc.).

**Estimated effort:** Medium — ~15-20 component files to update, no logic changes.

## Risk Assessment

- Low risk: stores remain unchanged, only subscription points move
- Test coverage: existing tests in `mapping/__tests__/` should cover regressions

## Overall KHDN Score

| Category | Score |
|---|---|
| Architecture | 9/10 |
| Code quality | 8.5/10 |
| Performance risk | Medium (deferred) |
| Scalability | 8/10 |
| **Overall** | **8.5/10** |
