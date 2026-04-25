# Phase 3: Collateral Document Scan + Polish

## Priority: MEDIUM | Status: pending | Blocked by: Phase 2

## Overview
Mở rộng scan cho giấy tờ tài sản (sổ đỏ, sổ tiết kiệm, đăng ký xe) → auto-fill collateral form. Polish UX.

## Related Code Files
- **Modify:** `src/app/report/customers/[id]/components/customer-collateral-section.tsx` — thêm nút scan
- **Modify:** `src/app/report/customers/[id]/components/collateral-form.tsx` — nhận pre-fill data
- **Modify:** `document-scanner-dialog.tsx` — restrict allowedTypes per context

## Implementation Steps

### 1. Thêm nút Scan vào collateral section
- Nút "Scan giấy tờ TS" cạnh nút "Thêm TSBĐ"
- `allowedTypes={["land_cert", "savings_book", "vehicle_reg"]}`
- onConfirm → mở collateral form với pre-filled data

### 2. Map OCR fields → collateral form

**Land cert → collateral type "land":**
| OCR Field | Collateral Field |
|-----------|-----------------|
| owner_name | owner_name |
| land_address | address |
| land_area_m2 | area |
| land_use_purpose | purpose |
| certificate_number | certificate_number |

**Savings book → collateral type "savings":**
| OCR Field | Collateral Field |
|-----------|-----------------|
| book_number | reference_number |
| amount | value |
| bank_name | institution |
| maturity_date | expiry_date |

**Vehicle reg → collateral type "vehicle":**
| OCR Field | Collateral Field |
|-----------|-----------------|
| plate_number | reference_number |
| brand_model | description |
| frame_number | frame_number |
| engine_number | engine_number |

### 3. UX Polish
- Loading skeleton during OCR processing
- Error retry with different image
- Keyboard shortcuts (Enter to confirm, Esc to close)
- Mobile-friendly: file input camera capture (`capture="environment"`)

## Todo
- [ ] Add scan button to collateral section
- [ ] Implement asset doc → collateral field mapping
- [ ] Add camera capture on mobile
- [ ] End-to-end test: scan land cert → create collateral

## Success Criteria
- Asset document scan fills collateral form >85% accuracy
- Collateral type auto-detected from document type
- Smooth UX on both desktop and mobile
