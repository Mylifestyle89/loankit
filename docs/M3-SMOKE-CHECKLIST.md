# M3 Smoke Checklist

Muc tieu: dam bao refactor sang unified extract khong gay regression trong Mapping page.

## 1) Scalar extract - OCR (PNG/JPEG/PDF)

- Chon template context trong Mapping.
- Upload PNG/JPEG/PDF tu toolbar.
- Ky vong:
  - Khong loi API.
  - Co suggestions scalar.
  - Badge nguon hien OCR.
  - Accept 1 field cap nhat `values[fieldKey]` va `manualValues[fieldKey]`.
  - Accept All cap nhat nhieu field.

## 2) Scalar + repeater extract - DOCX

- Upload DOCX co du lieu thong thuong va it nhat 1 bang.
- Ky vong:
  - suggestions scalar hien trong review.
  - repeater suggestions hien section rieng.
  - Accept repeater group cap nhat `values[groupPath]` thanh mang rows.
  - Decline repeater group khong cap nhat values.

## 3) Fallback behavior

- Cac che do fallback:
  - `NEXT_PUBLIC_EXTRACT_FALLBACK_ENABLED=true`: bat fallback tren moi env.
  - `NEXT_PUBLIC_EXTRACT_FALLBACK_ENABLED=false`: tat fallback (ngoai dev).
  - Mac dinh `development`: fallback duoc bat.
- Gia lap unified route loi (tam thoi doi URL sai o local branch de test).
- Upload file OCR/DOCX.
- Ky vong:
  - UI log: fallback route duoc kich hoat.
  - Flow van hoat dong qua `/ocr-process` hoac `/docx-process`.
  - User khong bi block.

## 4) Modal review actions

- Test lan luot:
  - Accept/Decline scalar mot dong.
  - Accept All/Decline All scalar.
  - Accept/Decline repeater mot nhom.
  - Accept All/Decline All repeater.
- Ky vong:
  - Status pending -> accepted/declined dung.
  - Log timeline duoc ghi dung.

## 5) Non-regression

- Save Draft sau khi apply suggestions.
- Reload page Mapping.
- Ky vong:
  - Scalar values van dung.
  - Repeater values van hien trong session dang thao tac.
  - Khong co runtime error/console error.

## 6) Build quality gates

- Lint clean cho cac file refactor.
- TypeScript khong loi.
- Route cu van tra contract tuong thich:
  - `/ocr-process`: `suggestions`, `meta`.
  - `/docx-process`: `suggestions`, `repeaterSuggestions`, `meta`.
  - `/extract-process`: `kind`, `suggestions`, `repeaterSuggestions`, `meta`.

