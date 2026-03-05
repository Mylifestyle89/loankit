# Phase 05: Human Review UI for Low-Confidence Records

## Context Links
- [Phase 02](./phase-02-zod-validation-layer.md) (prerequisite: validation status)
- [Phase 03](./phase-03-structured-ai-schemas.md) (prerequisite: better AI output)
- [Mapping page](../../src/app/report/mapping/page.tsx)
- [Prisma schema](../../prisma/schema.prisma)

## Overview
- **Priority:** MEDIUM
- **Status:** pending
- **Effort:** 5h
- **Description:** Build a review UI where users can approve/correct low-confidence AI extractions before they're committed to mapping data. Integrates into existing mapping workflow.

## Key Insights
- No human review exists today -- all extractions are auto-accepted
- Confidence threshold for review: <0.75 or `validationStatus: "warning"/"invalid"` (from Phase 02)
- Review should be integrated into the mapping workflow, not a separate page
- Keep it simple: inline review panel in mapping editor, not a full queue system
- Store review decisions for feedback loop (Phase 06)

## Requirements

### Functional
- After extraction, suggestions with confidence < threshold flagged for review
- Review panel shows: field label, extracted value, confidence score, validation status, source step
- User actions per field: Accept (use value), Edit (modify value), Reject (discard)
- Bulk actions: Accept All, Reject All low-confidence
- Review state persisted in DB (survives page refresh)
- After review, accepted/edited values written to mapping data

### Non-Functional
- Review panel loads <500ms
- Responsive on desktop (mobile not required)
- Vietnamese and English labels (i18n)

## Architecture

### Data Model (new Prisma model)
```prisma
model ExtractionReview {
  id              String   @id @default(cuid())
  mappingInstanceId String
  fieldKey        String
  extractedValue  String
  correctedValue  String?
  confidenceScore Float
  validationStatus String  // "valid" | "warning" | "invalid"
  sourceStep      String   // "table" | "paragraph" | "ai_mapping" | "heuristic" | "ai_full_doc"
  decision        String?  // "accepted" | "edited" | "rejected" | null (pending)
  reviewedAt      DateTime?
  createdAt       DateTime @default(now())

  mappingInstance MappingInstance @relation(fields: [mappingInstanceId], references: [id], onDelete: Cascade)
  @@index([mappingInstanceId])
  @@index([decision])
}
```

### API Routes
```
POST /api/report/mapping/extraction-review     -- create review records after extraction
GET  /api/report/mapping/extraction-review?mappingInstanceId=X  -- get pending reviews
PUT  /api/report/mapping/extraction-review/[id] -- update decision
POST /api/report/mapping/extraction-review/bulk -- bulk accept/reject
```

### UI Components
```
src/components/extraction-review/
  extraction-review-panel.tsx     -- main panel (list of flagged fields)
  extraction-review-item.tsx      -- single field review card
  extraction-review-actions.tsx   -- accept/edit/reject buttons + bulk actions
```

### Integration
- After `extractFieldsFromReport` returns, API route creates `ExtractionReview` records for low-confidence suggestions
- High-confidence suggestions auto-accepted (written to mapping immediately)
- Review panel shown in mapping editor when pending reviews exist
- On review completion, accepted values written to mapping data store

## Related Code Files
- **Create:** `prisma/migrations/XXXX_add_extraction_review/migration.sql`
- **Modify:** `prisma/schema.prisma` (add ExtractionReview model + relation)
- **Create:** `src/services/extraction-review.service.ts`
- **Create:** `src/app/api/report/mapping/extraction-review/route.ts`
- **Create:** `src/app/api/report/mapping/extraction-review/[id]/route.ts`
- **Create:** `src/app/api/report/mapping/extraction-review/bulk/route.ts`
- **Create:** `src/components/extraction-review/extraction-review-panel.tsx`
- **Create:** `src/components/extraction-review/extraction-review-item.tsx`
- **Create:** `src/components/extraction-review/extraction-review-actions.tsx`
- **Modify:** `src/app/report/mapping/page.tsx` (integrate review panel)
- **Modify:** `src/app/api/report/mapping/_extract-helper.ts` (create review records)
- **Modify:** `src/lib/i18n/translations.ts` (add review UI strings)

## Implementation Steps

1. **Add Prisma model** `ExtractionReview` to schema
2. **Run migration** `npx prisma migrate dev --name add-extraction-review`
3. **Create `extraction-review.service.ts`** -- CRUD for review records
4. **Create API routes** -- POST (create), GET (list pending), PUT (update decision), POST bulk
5. **Create `extraction-review-panel.tsx`** -- fetches pending reviews, renders list
6. **Create `extraction-review-item.tsx`** -- shows field info + accept/edit/reject actions
7. **Create `extraction-review-actions.tsx`** -- bulk action buttons
8. **Modify `_extract-helper.ts`** -- after extraction, create review records for low-confidence suggestions, auto-accept high-confidence ones
9. **Integrate panel into mapping editor** -- show when pending reviews exist
10. **Add i18n strings** for review UI
11. **Write unit tests** for service layer
12. **Run build + tests**

## Todo List
- [ ] Add ExtractionReview model to Prisma schema
- [ ] Run migration
- [ ] Create extraction-review.service.ts
- [ ] Create API routes (4 endpoints)
- [ ] Create extraction-review-panel.tsx
- [ ] Create extraction-review-item.tsx
- [ ] Create extraction-review-actions.tsx
- [ ] Modify _extract-helper.ts for review record creation
- [ ] Integrate into mapping editor
- [ ] Add i18n strings
- [ ] Write tests
- [ ] Run build + tests

## Success Criteria
- Low-confidence extractions shown in review panel with clear visual indicators
- Users can accept/edit/reject individual fields
- Bulk accept/reject works
- Review state persists across page refreshes
- Accepted values correctly written to mapping data

## Risk Assessment
- **Risk:** Scope creep -- temptation to build full queue/workflow system
- **Mitigation:** MVP is inline panel in mapping editor. No separate page, no multi-user review queue.
- **Risk:** Review panel slows down extraction workflow for high-confidence documents
- **Mitigation:** Auto-accept high-confidence fields (threshold 0.75). Only show panel when low-confidence fields exist.

## Security Considerations
- Review records contain extracted field values -- same sensitivity as mapping data
- Access control same as mapping instance (no new auth requirements per current app design)
- Cascade delete when mapping instance deleted
