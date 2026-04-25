# Phase 1: API Route — DOCX Upload + AI Extract

## Overview
- Priority: HIGH
- Status: ⬜ Pending
- API nhận file DOCX → extract text → Gemini AI parse → trả JSON customer data

## Related Files
- `src/services/document-extraction.service.ts` — Gemini full-doc extraction (reuse)
- `src/services/auto-tagging.service.ts` — `extractParagraphs()` (reuse)
- `src/services/bk-to-customer-relations.ts` — Customer schema reference
- `src/app/api/report/import/bk/route.ts` — BK import API pattern reference

## Implementation Steps

### Step 1: Create API route `POST /api/customers/import-docx`

File: `src/app/api/customers/import-docx/route.ts`

```ts
// Accept: multipart/form-data with 1+ .docx files
// Response: { ok, extracted: { customer, loans, collaterals } }
```

### Step 2: Extract text from DOCX

Reuse `extractParagraphs(buffer)` from auto-tagging service — đã proven, trả về plain text.

### Step 3: AI Extraction via Gemini

Prompt Gemini với extracted text + structured schema:

```
Trích xuất thông tin từ hồ sơ vay sau.
Trả về JSON theo schema:
{
  "customer_name": "", "customer_code": "", "cccd": "",
  "cccd_issued_date": "", "cccd_issued_place": "",
  "date_of_birth": "", "gender": "", "phone": "",
  "address": "", "marital_status": "",
  "spouse_name": "", "spouse_cccd": "",
  "loan": {
    "contract_number": "", "loan_amount": 0,
    "interest_rate": 0, "purpose": "",
    "start_date": "", "end_date": ""
  },
  "collateral": {
    "name": "", "type": "qsd_dat",
    "certificate_serial": "", "land_address": "",
    "total_value": 0, "obligation": 0,
    "land_area": "", "land_type_1": "", "land_unit_price_1": 0
  }
}
Chỉ trả JSON, không giải thích.
```

### Step 4: Merge multiple files

Nếu upload nhiều file → extract từng file → merge results:
- Customer info: lấy từ file nào có nhiều thông tin nhất
- Loan info: merge unique contracts
- Collateral: merge unique assets

### Step 5: Return structured response

```json
{
  "ok": true,
  "extracted": {
    "customer": { ... },
    "loans": [{ ... }],
    "collaterals": [{ ... }]
  },
  "sources": ["file1.docx", "file2.docx"]
}
```

## Todo
- [ ] Create API route
- [ ] Reuse extractParagraphs for text extraction
- [ ] Create Gemini prompt with customer schema
- [ ] Handle multi-file merge
- [ ] Build check
