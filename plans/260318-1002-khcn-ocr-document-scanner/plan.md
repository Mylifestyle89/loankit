---
status: pending
branch: KHCN-implement
created: 2026-03-18
---

# OCR/AI Document Scanner cho KHCN Module

## Overview
Thêm tính năng scan tài liệu (CCCD, giấy tờ tài sản) bằng Gemini Vision API → auto-fill form khách hàng KHCN.

## Brainstorm
- [brainstorm-260318-1002-khcn-ocr-ai-import.md](../reports/brainstorm-260318-1002-khcn-ocr-ai-import.md)

## Architecture
```
Upload ảnh/PDF → POST /api/ocr/extract-document
  → Gemini Vision (structured JSON prompt per doc type)
  → { documentType, fields: Record<string,string>, confidence }
  → Frontend auto-fills form → User review → Save via PATCH /api/customers/[id]
```

## Phases

| # | Phase | Status | Effort |
|---|-------|--------|--------|
| 1 | [Backend: OCR extraction service + API](phase-01-ocr-extraction-api.md) | pending | 3h |
| 2 | [Frontend: DocumentScanner UI + auto-fill](phase-02-document-scanner-ui.md) | pending | 4h |
| 3 | [Integration: collateral scan + polish](phase-03-collateral-scan-integration.md) | pending | 2h |

## Key Dependencies
- Existing: `src/services/ocr.service.ts`, Gemini API key
- Existing: Customer form at `/report/customers/[id]/page.tsx`
- Existing: Collateral form at `collateral-form.tsx`

## Success Criteria
- CCCD scan fills customer info fields correctly >90%
- Asset doc scan fills collateral fields correctly >85%
- User can review & edit before saving
- No regression on existing form functionality
