# Brainstorm Report: Template Upload + Placeholder Validation

**Date:** 2026-03-08
**Status:** Agreed — Approach B selected

## Problem Statement

Current template management workflow is too manual:
- Copy-paste `[field_key]` placeholders into Word = error-prone
- Upload/download buttons exist but no server-side validation
- No feedback on whether placeholders in uploaded DOCX are correct
- Typos in placeholders → silent failures at report generation time

## User Context

- Admin/dev users, technically proficient
- 4-5 templates now, needs scalability
- Wants both upload convenience AND placeholder correctness

## Evaluated Approaches

### A: Visual Drag-and-Drop Builder
- WYSIWYG editor with drag-drop fields into template
- **Pros:** Most user-friendly, zero typos
- **Cons:** Massive effort (3-4 weeks), reinvents Word, Eigenpal/OnlyOffice already proven unreliable for complex DOCX

### B: Upload + Placeholder Validation (SELECTED)
- Upload DOCX → server scans `[placeholder]` patterns via `docxtemplater` → validates against field catalog → reports typos/missing/unknown fields
- **Pros:** Simple, effective, leverages existing `docxtemplater`, immediate feedback, ~2-3 days effort
- **Cons:** Doesn't prevent typos (only detects), still requires Word editing offline

### C: CLI/Script-based Tooling
- Python/Node script to inject fields programmatically
- **Pros:** Automatable, reproducible
- **Cons:** Non-visual, steep learning curve, doesn't fit web UI workflow

## Final Recommended Solution: Approach B

### Architecture

```
[User uploads .docx]
  → POST /api/report/template/upload-validate
    → docxtemplater scans for {placeholder} and [placeholder] patterns
    → Compare against field catalog from active field template
    → Return validation report:
      - ✅ Valid placeholders (matched in catalog)
      - ⚠️ Unknown placeholders (not in catalog — possible typos)
      - ℹ️ Missing fields (in catalog but not in template)
    → Save file to report_assets/ if user confirms
```

### Key Design Decisions

1. **Use `docxtemplater`** (already in project) for placeholder extraction
2. **Support both `{key}` and `[key]` patterns** — normalize to project convention
3. **Two-step flow**: validate first → show report → user confirms save
4. **Reuse existing `save-docx` endpoint** for actual file persistence
5. **Field catalog source**: from `useFieldInjection` hook's field templates

### UI Flow

1. User clicks "Upload & Validate" button in folder browser tab
2. File picker opens → select .docx
3. Server returns validation report in modal:
   - Green: matched fields with count
   - Yellow: unknown placeholders (suggestions via Levenshtein distance)
   - Blue: catalog fields not used in template
4. User can "Save anyway" or "Cancel & fix"
5. On save → file written to report_assets/, folder browser refreshes

### Implementation Considerations

- **Levenshtein suggestions**: For unknown placeholders, suggest closest field_key match (threshold ≤ 2 edits)
- **Pattern flexibility**: Scan for `[key]`, `{key}`, `<<key>>` — all common docxtemplater delimiters
- **File size limit**: Reuse existing 20MB limit from save-docx
- **Backup**: Auto-backup before overwrite (existing behavior)

## Risks

| Risk | Mitigation |
|------|------------|
| docxtemplater can't parse complex DOCX | Already proven in pipeline; fallback to regex scan |
| Large templates slow validation | Stream parsing, 20MB cap already enforced |
| Pattern false positives | Allow user to dismiss warnings, whitelist custom patterns |

## Success Metrics

- Zero silent placeholder typos reaching report generation
- Upload-to-validated flow < 3 seconds for typical template
- User can identify and fix all placeholder issues before saving

## Next Steps

1. Create implementation plan with phases
2. Implement POST endpoint with docxtemplater scanning
3. Add validation report modal component
4. Integrate into folder browser tab
5. Add Levenshtein suggestion logic
