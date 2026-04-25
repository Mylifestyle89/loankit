---
phase: 0AB
title: "AI Utilities Extraction (Provider + JSON)"
status: complete
priority: P1 — HIGH impact, LOW risk
effort: 1.5h
blocks: [phase-03]
note: "Merged with Phase 0B (Red Team #1: both write src/lib/ai/index.ts)"
---

# Phase 0AB: AI Utilities Extraction (Provider + JSON)

## Overview

Extract duplicated AI provider selection logic (check env → pick OpenAI/Gemini → fallback) into single shared module.

## Current State — 3 duplicate implementations

| File | Lines | Pattern |
|------|-------|---------|
| `src/services/ai-mapping.service.ts` | 327-340 | env check → OpenAI/Gemini → fallback |
| `src/services/financial-analysis.service.ts` | 238-258 | Same pattern, slightly different var names |
| `src/services/auto-tagging-ai-helpers.ts` | 154-160 | Same pattern, compact version |

All follow identical logic:
```typescript
const provider = (process.env.AI_MAPPING_PROVIDER ?? "").toLowerCase();
if (provider === "openai") { /* call OpenAI */ }
else if (provider === "gemini") { /* call Gemini */ }
else if (process.env.OPENAI_API_KEY) { /* fallback OpenAI */ }
else if (process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY) { /* fallback Gemini */ }
else { throw new Error("No AI provider configured"); }
```

## Target State

New shared module: `src/lib/ai/ai-provider-resolver.ts`

```typescript
// Returns { provider: "openai" | "gemini", apiKey: string }
export function resolveAiProvider(): { provider: string; apiKey: string }
```

## Implementation Steps

1. Create `src/lib/ai/ai-provider-resolver.ts` with shared logic
2. Create `src/lib/ai/index.ts` barrel export
3. Replace inline provider logic in `ai-mapping.service.ts`
4. Replace inline provider logic in `financial-analysis.service.ts`
5. Replace inline provider logic in `auto-tagging-ai-helpers.ts`
6. Run `npx tsc --noEmit` to verify

## File Ownership

- CREATE: `src/lib/ai/ai-provider-resolver.ts`
- CREATE: `src/lib/ai/index.ts`
- MODIFY: `src/services/ai-mapping.service.ts` (remove ~15 lines)
- MODIFY: `src/services/financial-analysis.service.ts` (remove ~20 lines)
- MODIFY: `src/services/auto-tagging-ai-helpers.ts` (remove ~8 lines)

## Part 2: extractJsonObject Dedup (merged from Phase 0B)

### Current State — 3 implementations

| File | Lines | Variant |
|------|-------|---------|
| `src/services/ai-mapping.service.ts` | 57-77 | Private, compact (20 lines) |
| `src/services/auto-tagging-ai-helpers.ts` | 56-68 | Exported, compact (12 lines) |
| `src/services/financial-analysis.service.ts` | 157-198 | Private, robust (41 lines, 3-step fallback) |

### Target

Use financial-analysis version (most robust) as canonical: `src/lib/ai/extract-json-from-ai-response.ts`

### Steps

7. Create `src/lib/ai/extract-json-from-ai-response.ts` (based on financial-analysis version)
8. Update `src/lib/ai/index.ts` with named export (no `export *`)
9. Replace in `ai-mapping.service.ts` — delete private fn, import shared
10. Replace in `auto-tagging-ai-helpers.ts` — delete exported fn, re-export from shared for compat
11. Replace in `financial-analysis.service.ts` — delete private fn, import shared

## Todo

- [x] Create ai-provider-resolver.ts
- [x] Create extract-json-from-ai-response.ts
- [x] Create barrel index.ts (named exports only — Red Team #12)
- [x] Update ai-mapping.service.ts (both provider + JSON)
- [x] Update financial-analysis.service.ts (both provider + JSON)
- [x] Update auto-tagging-ai-helpers.ts (both provider + JSON)
- [x] Compile check
- [x] Git commit checkpoint

## Success Criteria

- Single source of truth for AI provider selection AND JSON extraction
- Adding new provider (e.g., Claude) requires editing 1 file
- All 3 services import from `@/lib/ai`
- Named exports only (tree-shaking safe)
- `npx tsc --noEmit` passes
