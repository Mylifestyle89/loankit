# Brainstorm: OCR/AI Import cho KHCN Module

**Date:** 2026-03-18
**Status:** Agreed

## Problem Statement
Cần tính năng OCR/AI để extract thông tin khách hàng KHCN từ ảnh/PDF (CCCD, giấy tờ tài sản) → auto-fill vào form, giảm thời gian nhập liệu.

## Requirements
- **Document types:** CCCD/CMND, Sổ đỏ, Sổ tiết kiệm, Đăng ký xe
- **Flow:** Upload → AI extract → Auto-fill form → User review → Save
- **Engine:** Gemini Vision API (server-side)
- **UX:** Nút "Scan tài liệu" trong form KH `/customers/[id]`

## Existing Infrastructure
- `src/services/ocr.service.ts` — Gemini Vision + Tesseract.js + pdf-parse
- `src/services/ai-mapping.service.ts` — AI field mapping
- `/api/customers/from-draft` — save mapped data
- Gemini API key configured, model: `gemini-2.5-flash`

## Evaluated Approaches

### A. Structured Gemini Prompt ✅ RECOMMENDED
Send image + expected JSON schema → Gemini returns structured JSON → auto-fill.
- **Pros:** Simplest, 1 API call, accurate Vietnamese, cheap (~$0.001/image)
- **Cons:** Gemini API dependency
- **Effort:** ~2-3 days

### B. OCR → AI Mapping (2-step)
Tesseract/Gemini OCR → text → AI mapping service maps to fields.
- **Pros:** Reuses existing ai-mapping.service.ts
- **Cons:** 2 steps = slower, more error-prone, over-engineering
- **Effort:** ~4-5 days

### C. Template-based OCR
Fixed regions per document type → crop → OCR each region.
- **Pros:** No AI needed, free
- **Cons:** Brittle, doesn't scale, high maintenance
- **Effort:** ~5-7 days

## Recommended Solution: Approach A

### Architecture
```
Upload image → POST /api/ocr/extract
  → Gemini Vision (structured prompt per doc type)
  → JSON { fields, confidence, raw_text }
  → Frontend auto-fills form fields
  → User reviews & edits
  → Save via existing PATCH /api/customers/[id]
```

### New Components
1. **API:** `POST /api/ocr/extract` — accepts image/pdf + documentType
2. **Prompt templates** per doc type (CCCD, land_cert, savings_book, vehicle_reg)
3. **UI:** `<DocumentScanner />` dialog — upload, preview, confirm auto-fill
4. **Field mapping:** OCR JSON → Customer/Collateral model fields

### Field Mapping
| Document | Target | Fields |
|----------|--------|--------|
| CCCD | Customer | name, cccd, dob, gender, address, cccd_issued_date/place |
| Sổ đỏ | Collateral (land) | address, area, purpose, owner_name |
| Sổ tiết kiệm | Collateral (savings) | book_number, amount, term, rate |
| Đăng ký xe | Collateral (vehicle) | plate, type, frame_no, engine_no |

### Risks & Mitigation
| Risk | Mitigation |
|------|-----------|
| Blurry/skewed images | Show confidence score, warn if low |
| Gemini API down | Clear error, user can still input manually |
| Wrong extraction | User review before save |
| Cost scaling | Flash is very cheap, add rate limit if needed |

## Success Metrics
- OCR accuracy > 90% for CCCD
- Input time reduction: ~10min → ~2min per customer
- Minimal manual corrections needed

## Next Steps
- Create implementation plan with phases
- Phase 1: API endpoint + CCCD prompt
- Phase 2: Asset document prompts
- Phase 3: UI component + integration
