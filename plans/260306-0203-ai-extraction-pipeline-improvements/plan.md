---
title: "AI Extraction Pipeline Improvements"
description: "Zod validation, structured schemas, DRY cleanup, modularization, human review UI"
status: in_progress
priority: P1
effort: 18h
branch: Disbursement-Invoice-tracking-implement
tags: [ai, extraction, validation, refactor, dx]
created: 2026-03-06
---

# AI Extraction Pipeline Improvements

## Goal
Improve extraction accuracy, code maintainability, and add human oversight to the AI document extraction pipeline.

## Current State
- 660-line monolith `extract-fields-from-docx-report.ts` (violates 200-line rule)
- Duplicated helpers between DOCX and OCR extractors (`normalizeText`, `buildHeaderValueCandidates`, `lineValueAfterLabel`, `extractByHeuristic`)
- Hardcoded confidence scores (0.65-0.95) with no content validation
- No Zod validation on extracted values (numbers, dates, tax IDs)
- AI calls use `json_object` mode but no structured field schemas
- No human review for low-confidence extractions
- No feedback loop from corrections

## Phases

| # | Phase | Priority | Effort | Status | Deps |
|---|-------|----------|--------|--------|------|
| 01 | [DRY cleanup + modularize DOCX extractor](./phase-01-dry-cleanup-modularization.md) | HIGH | 3h | completed | none |
| 02 | [Zod validation for extracted values](./phase-02-zod-validation-layer.md) | HIGH | 3h | completed | P01 |
| 03 | [Structured JSON schemas on AI calls](./phase-03-structured-ai-schemas.md) | HIGH | 3h | completed | P01 |
| 04 | [Smart branching optimization](./phase-04-smart-branching.md) | MEDIUM | 2h | pending | P01 |
| 05 | [Human review UI for low-confidence records](./phase-05-human-review-ui.md) | MEDIUM | 5h | pending | P02, P03 |
| 06 | [Feedback loop from corrections](./phase-06-feedback-loop.md) | LOW | 2h | pending | P05 |

## Key Decisions
- Keep dual AI providers (OpenAI + Gemini), no new providers
- Gemini Vision stays primary OCR, Tesseract as fallback only
- Validation is highest ROI: zero API cost, biggest accuracy win
- Human review UI is a new page under `/report/mapping/review`
- Feedback loop stored in SQLite (prompt override table), not ML retraining

## Risk Summary
- Phase 01 (refactor) touches critical extraction code -- must have test coverage before refactoring
- Phase 05 (review UI) is most complex -- scope carefully to MVP
- No existing tests for extraction use-cases -- consider adding basic tests in P01

## Progress Notes (Session 260306-0532)

**Completed in this session:**
- Phase 01: 660-line monolith split into 6 focused modules under `src/core/use-cases/extraction/`
  - Modules: extraction-text-helpers.ts, extraction-docx-xml-parser.ts, extraction-docx-table-fields.ts, extraction-docx-paragraph.ts, extraction-docx-repeater.ts
  - DRY helpers consolidated, zero behavior change verified
  - tsc --noEmit: PASS
- Phase 02: Zod validation layer implemented in extraction-value-validator.ts
  - Vietnamese number/date/percent/boolean validation added
  - Integrated into both DOCX and OCR extractors with confidence adjustment
  - Tests: 111/111 PASS
- Phase 03: Structured JSON schemas added to document-extraction.service.ts
  - OpenAI Structured Outputs + Gemini responseSchema enabled
  - Backward compatibility fallback included

**Build & Quality:** tsc clean, all tests passing, code review approved

**Next:** Phases 04, 05, 06 remain pending (out of scope for this session)
