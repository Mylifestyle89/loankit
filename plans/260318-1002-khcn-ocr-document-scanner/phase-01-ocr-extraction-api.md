# Phase 1: Backend OCR Extraction API

## Priority: HIGH | Status: pending

## Overview
Tạo service extract structured data từ ảnh/PDF tài liệu bằng Gemini Vision, và API endpoint để frontend gọi.

## Key Insights
- `ocr.service.ts` đã có `extractWithVision()` nhưng chỉ trả plain text
- Cần thêm function mới trả structured JSON thay vì raw text
- Gemini 2.5 Flash hỗ trợ JSON mode qua `responseMimeType: "application/json"`

## Related Code Files
- **Modify:** `src/services/ocr.service.ts` — thêm `extractDocumentFields()`
- **Create:** `src/services/ocr-document-prompts.ts` — prompt templates per doc type
- **Create:** `src/app/api/ocr/extract-document/route.ts` — API endpoint

## Implementation Steps

### 1. Tạo prompt templates (`src/services/ocr-document-prompts.ts`)

Define prompt cho mỗi loại tài liệu, yêu cầu Gemini trả JSON schema cố định:

```typescript
export type DocumentType = "cccd" | "land_cert" | "savings_book" | "vehicle_reg";

export type DocumentExtractionResult = {
  documentType: DocumentType;
  fields: Record<string, string>;
  confidence: number; // 0-1
};

// Mỗi prompt gồm: mô tả tài liệu + expected JSON fields + instructions tiếng Việt
```

**CCCD fields:** `full_name`, `cccd_number`, `date_of_birth`, `gender`, `nationality`, `place_of_origin`, `place_of_residence`, `issued_date`, `issued_place`, `expiry_date`

**Land cert fields:** `certificate_number`, `owner_name`, `land_address`, `land_area_m2`, `land_use_purpose`, `land_use_duration`, `issued_date`

**Savings book fields:** `book_number`, `owner_name`, `bank_name`, `amount`, `currency`, `term_months`, `interest_rate`, `open_date`, `maturity_date`

**Vehicle reg fields:** `plate_number`, `owner_name`, `vehicle_type`, `brand_model`, `color`, `frame_number`, `engine_number`, `registration_date`

### 2. Thêm `extractDocumentFields()` vào `ocr.service.ts`

```typescript
async extractDocumentFields(input: ExtractInput, documentType: DocumentType): Promise<DocumentExtractionResult> {
  // 1. Validate input (reuse ensureSupportedMime)
  // 2. Get prompt template for documentType
  // 3. Call Gemini with responseMimeType: "application/json" + responseSchema
  // 4. Parse JSON response, validate fields
  // 5. Return { documentType, fields, confidence }
}
```

- Dùng `model.generateContent()` với `generationConfig: { responseMimeType: "application/json" }`
- Prompt = system instruction (tiếng Việt) + image inline data

### 3. Tạo API endpoint (`src/app/api/ocr/extract-document/route.ts`)

```typescript
// POST /api/ocr/extract-document
// Content-Type: multipart/form-data
// Body: file (image/pdf) + documentType (string)
// Response: { ok: true, result: DocumentExtractionResult } | { ok: false, error: string }
```

- Accept multipart form data
- Validate file size (max 10MB), mime type, documentType enum
- Call `ocrService.extractDocumentFields()`
- Return structured result
- Error handling via `toHttpError()`

## Todo
- [ ] Create `src/services/ocr-document-prompts.ts` with 4 prompt templates
- [ ] Add `extractDocumentFields()` to `src/services/ocr.service.ts`
- [ ] Create `src/app/api/ocr/extract-document/route.ts`
- [ ] Test with sample CCCD image

## Success Criteria
- API returns correct JSON for CCCD image
- Handles invalid file types gracefully
- Handles Gemini API errors with clear messages

## Risk
- Gemini JSON mode may not be 100% reliable → validate + fallback to text parsing
