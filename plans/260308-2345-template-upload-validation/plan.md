---
title: "Template Upload + Placeholder Validation"
description: "Upload DOCX templates with server-side placeholder scanning and validation against field catalog"
status: complete
priority: P1
effort: 4h
branch: Deploy-test
tags: [feature, frontend, api, template]
created: 2026-03-08
---

# Template Upload + Placeholder Validation

## Overview

Add upload-and-validate workflow to template management. Users upload DOCX → server scans `[placeholder]` patterns → validates against field catalog → shows validation report → user confirms save.

**Key insight:** 80% of building blocks already exist:
- `parseDocxPlaceholdersFromBuffer()` in `template-parser.ts`
- `suggestAliasForPlaceholder()` in `placeholder-utils.ts`
- `save-docx` PUT endpoint with backup/validation
- Field catalog via `reportService.listFieldTemplates()`

## Phases

| # | Phase | Status | Effort | Link |
|---|-------|--------|--------|------|
| 1 | Validate-Upload API endpoint | Complete | 1.5h | [phase-01](./phase-01-validate-upload-api.md) |
| 2 | Validation Report Modal + UI Integration | Complete | 2h | [phase-02](./phase-02-validation-modal-ui.md) |
| 3 | Enhance fuzzy matching (Levenshtein) | Complete | 0.5h | [phase-03](./phase-03-levenshtein-suggestions.md) |

## Dependencies

- Existing: `parseDocxPlaceholdersFromBuffer()`, `suggestAliasForPlaceholder()`, `save-docx` endpoint
- New dep: `fastest-levenshtein` npm package (Phase 3, optional)

## Architecture

```
Client (folder browser tab)
  → User clicks "Upload & Validate" → file picker
  → POST /api/report/template/validate-upload
    Body: FormData { file: .docx, field_template_id: string, save_path?: string }
  → Server:
    1. parseDocxPlaceholdersFromBuffer(buffer)
    2. Load field catalog from field_template_id
    3. Compare: valid / unknown / missing
    4. Return ValidationReport JSON
  → Client shows ValidationReportModal
    - Green: matched placeholders
    - Yellow: unknown (with suggestions)
    - Blue: unused catalog fields
  → User clicks "Save" or "Cancel"
  → If save: PUT /api/report/template/save-docx (existing)
```

## Red Team Review

### Session — 2026-03-08
**Findings:** 12 total (6 accepted, 6 rejected)
**Severity breakdown:** 2 Critical (both rejected), 4 High (3 accepted), 6 Medium (3 accepted)

| # | Finding | Severity | Disposition | Applied To |
|---|---------|----------|-------------|------------|
| 1 | No authentication | Critical | Reject | N/A — consistent with existing app pattern |
| 2 | Zip bomb / decompression | High | Accept | Phase 1 |
| 3 | False positive placeholders `[Ghi chú]` | High | Accept | Phase 1 |
| 4 | Wrong import reportService | Critical | Reject | False positive — facade spreads templateService |
| 5 | File buffer memory leak | Medium | Accept | Phase 2 |
| 6 | Invalid field_template_id silent fail | High | Accept | Phase 1 |
| 7 | No try-catch in endpoint | High | Accept | Phase 1 |
| 8 | Race condition validate-then-save | Medium | Reject | Single-user app |
| 9 | Over-fetch all templates | Medium | Accept | Phase 1 |
| 10 | Path traversal in save-docx | Medium | Reject | Already validated |
| 11 | Levenshtein normalization asymmetry | Medium | Accept | Phase 3 |
| 12 | Supply chain risk fastest-levenshtein | Medium | Reject | Well-maintained package |

## Brainstorm Report

[brainstorm-260308-2345-template-upload-validation.md](../reports/brainstorm-260308-2345-template-upload-validation.md)
