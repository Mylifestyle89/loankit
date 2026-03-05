# Phase 06: Feedback Loop from Human Corrections

## Context Links
- [Phase 05](./phase-05-human-review-ui.md) (prerequisite: review data)
- [document-extraction.service.ts](../../src/services/document-extraction.service.ts)
- [ai-mapping.service.ts](../../src/services/ai-mapping.service.ts)

## Overview
- **Priority:** LOW
- **Status:** pending
- **Effort:** 2h
- **Description:** Use human review decisions (accept/edit/reject) to build a correction history that improves future prompts and extraction accuracy. Simple approach: prompt augmentation with past corrections, not ML retraining.

## Key Insights
- Phase 05 stores `ExtractionReview` records with `extractedValue`, `correctedValue`, `decision`
- "Edited" reviews are gold: they show exactly what AI got wrong and what the right answer is
- Simple approach: collect frequent corrections per field_key, inject as few-shot examples in AI prompt
- No ML retraining needed -- just better prompts based on past mistakes
- Start with aggregate stats, not per-document feedback

## Requirements

### Functional
- Aggregate correction patterns per field_key from ExtractionReview records
- For fields with >3 corrections: extract pattern (e.g., "AI returns date as DD/MM/YYYY but user always corrects to YYYY-MM-DD")
- Inject top corrections as few-shot examples in extraction prompt
- Admin view: show correction stats (which fields get corrected most often)

### Non-Functional
- Feedback injection adds <500 tokens to prompt
- No impact on extraction latency (corrections pre-computed)
- Correction cache refreshed on demand or daily

## Architecture

### Correction Aggregation
```typescript
// Query: SELECT fieldKey, extractedValue, correctedValue, COUNT(*) as count
//        FROM ExtractionReview WHERE decision = 'edited'
//        GROUP BY fieldKey, extractedValue ORDER BY count DESC

// Output per field_key:
{
  fieldKey: "A.general.tax_id",
  corrections: [
    { wrong: "MST: 0123456789", right: "0123456789", count: 5 },
    { wrong: "0123456789-001", right: "0123456789", count: 3 },
  ]
}
```

### Prompt Augmentation
```
// Injected after field list in extraction prompt:
COMMON MISTAKES TO AVOID:
- A.general.tax_id: Do NOT include "MST:" prefix. Return digits only. (5 past corrections)
- A.general.charter_capital: Return raw number without "VND" suffix. (3 past corrections)
```

### Data Model
No new model needed -- aggregate from existing `ExtractionReview` table.

Optional: cache table for pre-computed corrections if query becomes slow.

## Related Code Files
- **Create:** `src/services/extraction-feedback.service.ts` -- aggregate corrections, build prompt snippets
- **Modify:** `src/services/document-extraction.service.ts` -- inject correction hints into prompt
- **Optionally create:** `src/app/api/report/mapping/extraction-feedback/route.ts` -- admin stats endpoint
- **Optionally create:** `src/components/extraction-review/extraction-feedback-stats.tsx` -- admin view

## Implementation Steps

1. **Create `extraction-feedback.service.ts`** with:
   - `getTopCorrections(limit: number)` -- query ExtractionReview for most-corrected fields
   - `buildCorrectionPromptSnippet(corrections)` -- format as prompt text
2. **Modify `buildExtractionPrompt()`** in document-extraction.service.ts -- accept optional `correctionHints` string, append after field list
3. **Modify `documentExtractionService.extractFields()`** -- call `getTopCorrections()`, pass hints to prompt builder
4. **Cache correction hints** in memory (refresh every hour or on demand)
5. **Optionally: create admin stats endpoint** for viewing correction patterns
6. **Write tests** for correction aggregation and prompt generation
7. **Run build + tests**

## Todo List
- [ ] Create extraction-feedback.service.ts
- [ ] Implement getTopCorrections query
- [ ] Implement buildCorrectionPromptSnippet
- [ ] Modify extraction prompt to include correction hints
- [ ] Add in-memory cache with TTL
- [ ] (Optional) Create admin stats endpoint
- [ ] (Optional) Create admin stats UI component
- [ ] Write tests
- [ ] Run build + tests

## Success Criteria
- Fields with >3 past corrections get prompt hints
- Prompt hints are concise (<500 tokens total)
- Extraction accuracy improves for frequently-corrected fields (measure before/after)
- No latency increase (corrections are cached)

## Risk Assessment
- **Risk:** Too few review records initially -- feedback loop has no data to work with
- **Mitigation:** This is LOW priority for a reason. Deploy after Phase 05 has accumulated enough review data (weeks of usage).
- **Risk:** Correction hints could confuse AI for documents where the "wrong" pattern is actually correct
- **Mitigation:** Only inject hints with >3 corrections (strong signal). Include count in hint so AI weighs it appropriately.

## Security Considerations
- Correction data may contain PII from extracted fields -- same sensitivity as ExtractionReview records
- Admin stats endpoint should not expose raw field values, only aggregate patterns
- Apply same PII scrubbing to correction examples before injecting into prompts

## Next Steps
- Monitor correction patterns after Phase 05 deployment
- Evaluate if simple prompt augmentation is sufficient or if more sophisticated approaches needed
- Consider A/B testing: extraction with vs without correction hints
