---
phase: 0B
title: "extractJsonObject Deduplication"
status: pending
priority: P1 — MEDIUM impact, LOW risk
effort: 0.5h
blocks: [phase-03]
---

# Phase 0B: extractJsonObject Deduplication

## Overview

3 implementations of JSON extraction from AI responses. Consolidate into one robust version.

## Current State

| File | Lines | Variant |
|------|-------|---------|
| `src/services/ai-mapping.service.ts` | 57-77 | Private, compact (20 lines) |
| `src/services/auto-tagging-ai-helpers.ts` | 56-68 | Exported, compact (12 lines) |
| `src/services/financial-analysis.service.ts` | 157-198 | Private, robust (41 lines, 3-step fallback + type check) |

All share core logic: try direct parse → extract markdown fence → find `{...}` substring.

## Target State

Use financial-analysis version (most robust) as canonical. Place in `src/lib/ai/extract-json-from-ai-response.ts`.

## Implementation Steps

1. Create `src/lib/ai/extract-json-from-ai-response.ts` (based on financial-analysis version)
2. Update `src/lib/ai/index.ts` barrel
3. Replace in `ai-mapping.service.ts` — delete private fn, import shared
4. Replace in `auto-tagging-ai-helpers.ts` — delete exported fn, re-export from shared
5. Replace in `financial-analysis.service.ts` — delete private fn, import shared
6. Run `npx tsc --noEmit`

## File Ownership

- CREATE: `src/lib/ai/extract-json-from-ai-response.ts`
- MODIFY: `src/lib/ai/index.ts`
- MODIFY: `src/services/ai-mapping.service.ts` (remove ~20 lines)
- MODIFY: `src/services/auto-tagging-ai-helpers.ts` (remove ~12 lines, re-export for compat)
- MODIFY: `src/services/financial-analysis.service.ts` (remove ~41 lines)

## Todo

- [ ] Create extract-json-from-ai-response.ts
- [ ] Update barrel export
- [ ] Update 3 service files
- [ ] Compile check

## Success Criteria

- Single extractJsonObject implementation
- Most robust version (3-step fallback) used everywhere
- `npx tsc --noEmit` passes
