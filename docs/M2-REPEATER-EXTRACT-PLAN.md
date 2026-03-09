# M2 – Kế hoạch chỉnh sửa: Extract repeater/table từ DOCX

Mục tiêu: từ báo cáo DOCX có bảng/danh sách chi tiết, AI trích xuất thành **mảng dòng** (repeater) theo nhóm trong field template; user review và apply vào `values[groupPath]`.

---

## 1. Cấu trúc dữ liệu hiện tại (tóm tắt)

- **Scalar:** `manualValues` / `values` flat: `Record<field_key, value>`.
- **Repeater:** `values[groupPath]` = `Array<Record<field_key, value>>` (chỉ trong state React, không persist qua `/api/report/values`).
- **Field catalog:** `is_repeater: true` + cùng `group` = một nhóm lặp; nhóm có thể có field STT.

---

## 2. File và dòng cần chỉnh (theo thứ tự thực hiện)

### 2.1 Types – mở rộng response và state cho repeater suggestions

**File:** `src/app/report/mapping/types.ts`

| Khu vực | Dòng (ước lượng) | Việc cần làm |
|--------|-------------------|--------------|
| Sau `OcrProcessResponse` | ~122–130 | Thêm type `RepeaterSuggestionItem = { groupPath: string; fieldKeys: string[]; rows: Record<string, string>[]; confidenceScore?: number }`. |
| Trong `OcrProcessResponse` (hoặc type response DOCX chung) | ~109–122 | Thêm optional `repeaterSuggestions?: RepeaterSuggestionItem[]` vào response. |
| Nếu tách type response DOCX | — | Có thể tạo `DocxProcessResponse` kế thừa/extend với `repeaterSuggestions`. |

---

### 2.2 Use-case extract DOCX – sinh thêm repeater suggestions

**File:** `src/core/use-cases/extract-fields-from-docx-report.ts`

| Khu vực | Dòng (ước lượng) | Việc cần làm |
|--------|-------------------|--------------|
| Type `Output` | ~22–30 | Thêm `repeaterSuggestions: RepeaterSuggestionItem[]` (hoặc type import từ types). |
| Sau khi có `paragraphs` / `scrubbed` | ~130–135 | Lọc từ `fieldCatalog` các nhóm có ít nhất một field `is_repeater` → danh sách `repeaterGroups` (groupPath, fieldKeys). |
| Logic mới (chunk/table) | Mới, sau ~133 | Hàm `detectTableOrRepeatedBlocks(scrubbed, repeaterGroups)`: dùng heuristic hoặc AI để nhận diện bảng/khối lặp trong text; trả về `{ groupPath, rows }[]` (mỗi row = Record<fieldKey, value>). Có thể gọi AI với prompt “trích bảng theo nhóm field đã cho”. |
| Trước `return` | ~162–171 | Gọi logic repeater, gán `repeaterSuggestions`; đưa vào `return { suggestions, repeaterSuggestions, meta }`. |
| Filter catalog cho AI scalar | ~137–138 | Giữ nguyên; có thể exclude field có `is_repeater` khỏi scalar mapping để tránh trùng (tùy chọn). |

---

### 2.3 API route DOCX – trả về repeater suggestions

**File:** `src/app/api/report/mapping/docx-process/route.ts`

| Khu vực | Dòng (ước lượng) | Việc cần làm |
|--------|-------------------|--------------|
| Response JSON | ~50–54 | Thêm `repeater_suggestions: result.repeaterSuggestions ?? []` vào body trả về. |

---

### 2.4 Trang Mapping – state và handler repeater suggestions

**File:** `src/app/report/mapping/page.tsx`

| Khu vực | Dòng (ước lượng) | Việc cần làm |
|--------|-------------------|--------------|
| State | ~93–95 (gần `ocrSuggestionsByField`) | Thêm state: `repeaterSuggestionsByGroup: Record<string, { rows: Record<string, string>[]; status: 'pending' \| 'accepted' \| 'declined' }>`. |
| `handleOcrFileSelected` (DOCX nhánh) | ~1155–1175 | Sau khi set `ocrSuggestionsByField` từ `data.suggestions`, đọc `data.repeater_suggestions`; set `repeaterSuggestionsByGroup` (key = groupPath, value = { rows, status: 'pending' }). Nếu có repeater suggestions thì mở modal/tab repeater (hoặc mở OcrReviewModal với tab Repeater). |
| Handlers mới | Sau ~1230 (gần `handleDeclineAllOcr`) | `handleAcceptRepeaterSuggestion(groupPath)`: setValues(prev => ({ ...prev, [groupPath]: repeaterSuggestionsByGroup[groupPath].rows })); set status 'accepted'. `handleDeclineRepeaterSuggestion(groupPath)`: set status 'declined'. Có thể thêm Accept All / Decline All cho repeater. |
| Truyền xuống section/modal | ~1390–1410, ~1470–1480 | Truyền `repeaterSuggestionsByGroup`, `onAcceptRepeaterSuggestion`, `onDeclineRepeaterSuggestion` xuống component cần (ví dụ OcrReviewModal hoặc RepeaterReviewModal). |

---

### 2.5 Modal review – UI cho repeater (tab hoặc modal riêng)

**File:** `src/app/report/mapping/components/Modals/OcrReviewModal.tsx`

| Khu vực | Dòng (ước lượng) | Việc cần làm |
|--------|-------------------|--------------|
| Props | ~9–19 | Thêm optional: `repeaterSuggestions?: Record<string, { rows: Record<string, string>[]; status: string }>`, `onAcceptRepeater?: (groupPath: string) => void`, `onDeclineRepeater?: (groupPath: string) => void`. |
| Header / tabs | ~61–100 | Thêm tab “Repeater” bên cạnh (hoặc section) “Kết quả OCR/DOCX” khi có `repeaterSuggestions` và ít nhất một nhóm pending. |
| Body – bảng repeater | Mới | Trong tab/section Repeater: với mỗi groupPath có status pending, render bảng: groupPath, số dòng, preview vài cột; nút “Accept” / “Decline” gọi `onAcceptRepeater(groupPath)` / `onDeclineRepeater(groupPath)`. |

**Hoặc tạo file mới:** `src/app/report/mapping/components/Modals/RepeaterReviewModal.tsx`  
- Nếu tách modal riêng: nhận `repeaterSuggestionsByGroup`, `fieldCatalog`, `onAccept`, `onDecline`, `onClose`; không chỉnh OcrReviewModal.

---

### 2.6 Toolbar / nút mở review repeater

**File:** `src/app/report/mapping/page.tsx` (hoặc MappingVisualToolbar)

| Khu vực | Dòng (ước lượng) | Việc cần làm |
|--------|-------------------|--------------|
| Sidebar / badge | ~1335–1348 | Khi có repeater suggestions pending, hiển thị badge “N nhóm repeater chờ review” (hoặc tích hợp vào cùng badge OCR/DOCX) và mở modal/tab Repeater khi click. |

---

### 2.7 (Tùy chọn) Values API / persistence repeater

- **Hiện tại:** `getFieldValues()` trả `values` flat; repeater chỉ ở state. M2 có thể **không** đổi persistence.
- **Nếu sau này persist repeater:** cần sửa `src/services/report.service.ts` (getFieldValues / saveFieldValues) và có thể `src/lib/report/manual-values.ts` hoặc schema lưu thêm `repeater_values: Record<groupPath, array>`. **Để ngoài phạm vi M2** trừ khi yêu cầu rõ.

---

## 3. Thứ tự triển khai đề xuất

1. **Types** (`types.ts`) – thêm RepeaterSuggestionItem và repeater_suggestions vào response.
2. **Use-case** (`extract-fields-from-docx-report.ts`) – thêm repeaterGroups từ catalog, hàm detect table/repeated blocks, merge vào output.
3. **API** (`docx-process/route.ts`) – trả thêm repeater_suggestions.
4. **Page** (`page.tsx`) – state + handlers + truyền props.
5. **Modal** (OcrReviewModal mở rộng hoặc RepeaterReviewModal mới) – UI review và Accept/Decline repeater.
6. **Badge/sidebar** – báo có repeater pending và mở đúng tab/modal.

---

## 4. Ghi chú kỹ thuật

- **Nhận diện bảng trong DOCX:** hiện `extractParagraphs` chỉ cho text theo đoạn. Để có cấu trúc bảng có thể: (a) đọc thêm XML table trong DOCX (word/document.xml, `<w:tbl>`), hoặc (b) từ full text dùng heuristic (dòng có nhiều tab/dấu cách, pattern lặp), hoặc (c) gửi full text + danh sách field repeater cho AI, yêu cầu trả JSON `{ groupPath, rows }[]`.
- **Apply repeater:** `setValues(prev => ({ ...prev, [groupPath]: rows }))` với `rows` là `Record<string, string>[]`; format giống `addRepeaterItem` (có thể cần map string → number cho field number/percent theo fieldCatalog).
- **STT:** khi apply repeater, nếu nhóm có field STT có thể điền 1, 2, 3... (useGroupManagement đã có logic tương tự trong removeRepeaterItem).
