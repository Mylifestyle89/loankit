# Frontend Quality Review — 2026-05-02

**Scope:** `src/app/report/khcn/`, `src/app/report/khdn/mapping/`, `src/components/`
**Focus:** AI paste extractor (mới), KHCN customer form, mapping hooks/stores

---

## CRITICAL

### C1 — `collateral-form.tsx` L143-148: fetch không check `res.ok`, không parse error body
**File:** `src/app/report/customers/[id]/components/collateral-form.tsx` L119-149

`handleSave()` gọi fetch rồi gọi `onSaved()` ngay kể cả khi API trả về HTTP 4xx/5xx. Lỗi lưu bị nuốt hoàn toàn — user không nhận được thông báo, UI đóng form như thể thành công.

```ts
// Hiện tại
await fetch(url, { method, ... });
onSaved(); // gọi kể cả khi fetch thất bại!

// Fix
const res = await fetch(url, { method, ... });
const data = await res.json() as { ok: boolean; error?: string };
if (!data.ok) { setError(data.error ?? "Lỗi lưu TSBĐ."); return; }
onSaved();
```

---

### C2 — `useMappingEffects.ts` L35-53: eslint-disable che giấu stale closure thực sự
**File:** `src/app/report/khdn/mapping/hooks/useMappingEffects.ts` L34-54

Ba `useEffect` với dep array rỗng `[]` dùng `eslint-disable` để bịt cảnh báo. Khi `loadData`, `loadCustomers`, `loadAllFieldTemplates` thay đổi (vd. `t` locale thay đổi) các effect không chạy lại. Effect thứ 3 (L40-54) đặc biệt nguy hiểm: `loadAllFieldTemplates` và `loadFieldTemplates` trong dep array bị suppress → khi user chuyển locale, hàm load cũ (stale closure) vẫn được dùng.

**Fix:** Dùng `useRef` để lưu hàm mới nhất thay vì suppress dep:
```ts
const loadDataRef = useRef(loadData);
useLayoutEffect(() => { loadDataRef.current = loadData; });
useEffect(() => { void loadDataRef.current(); }, []);
```
Hoặc đảm bảo các `load*` hàm stable (đã `useCallback` với dep rỗng).

---

## IMPORTANT

### I1 — `customer-detail-view.tsx` L250-251: `void loadCustomer()` sau save không cancel được nếu component unmount
**File:** `src/components/customers/customer-detail-view.tsx` L250-251

Sau `handleSubmit`, `loadCustomer()` được gọi fire-and-forget. Không có AbortController. Nếu user navigate đi trước response về, setState sẽ chạy trên unmounted component (React 18 không crash nhưng gây memory leak và stale state nếu component re-mount).

**Fix:** Dùng `AbortController` trong `loadCustomer` (pattern đã có ở L183 với `clearTimeout`) và pass signal vào fetch.

---

### I2 — `useAiOcrActions.ts` L168-281: `handleOcrFileSelected` dep array rỗng — stale closures trên tất cả store refs
**File:** `src/app/report/khdn/mapping/hooks/useAiOcrActions.ts` L168, L281

`handleOcrFileSelected` dùng `useCallback(..., [])` trong khi body đọc nhiều store state qua `.getState()`. Đây là pattern đúng (`.getState()` không stale). Tuy nhiên, nếu store được thay thế (vd. reset, HMR), ref cũ vẫn được dùng. Không phải lỗi nghiêm trọng nhưng nên document rõ lý do dep rỗng.

Tương tự `handleApplyToFieldTemplate` L117-132 có `[]` dep nhưng đọc `fieldCatalog` từ `.getState()` ổn — nhưng thiếu comment giải thích.

---

### I3 — `AiPasteExtractor`: `onExtracted` nhận `any`, không abort inflight request khi component collapse
**File:** `src/components/ui/ai-paste-extractor.tsx` L16, L28-49

- `onExtracted: (data: any) => void` — mất type safety hoàn toàn. Các caller cast về đúng type nhưng component không enforce gì.
- Không có AbortController: nếu user collapse panel trong khi đang extract, request tiếp tục chạy và `onExtracted` sẽ gọi với stale `open=false` state. Không crash nhưng gây side-effect ngầm.

```ts
// Fix: thêm AbortController
const abortRef = useRef<AbortController | null>(null);
async function handleExtract() {
  abortRef.current?.abort();
  abortRef.current = new AbortController();
  const res = await fetch("/api/ai/extract-text", { signal: abortRef.current.signal, ... });
  // ...
}
// Và abort khi collapse:
onClick={() => { abortRef.current?.abort(); setOpen(false); }}
```

---

### I4 — `useAutoTagging.ts` L57-109: `analyzeDocument` capture `state.file` trong closure — stale nếu file thay đổi nhanh
**File:** `src/app/report/khdn/mapping/hooks/useAutoTagging.ts` L57-109

`analyzeDocument` dùng `useCallback([state.file, t])`. Nếu user thay file trong khi request cũ đang in-flight, state mới (`state.file`) sẽ kích hoạt re-create callback nhưng request cũ vẫn chạy với FormData của file cũ. Không có cancel mechanism. Kết quả request cũ có thể overwrite kết quả mới nếu response về sau.

**Fix:** Thêm AbortController ref, abort request cũ khi `analyzeDocument` được gọi lại.

---

### I5 — `useMappingEffects.ts` L40-54: race condition khi customer thay đổi nhanh
**File:** `src/app/report/khdn/mapping/hooks/useMappingEffects.ts` L40-54

`loadAllFieldTemplates()` và `loadFieldTemplates(selectedCustomerId)` được gọi song song không cancel. Nếu user chuyển customer nhanh (A→B→C), response của A và B có thể về sau C và ghi đè đúng data của C. Không có request cancellation.

**Fix:** Dùng `AbortController` hoặc tăng `requestId` counter để discard stale responses.

---

### I6 — `customer-co-borrower-section.tsx` L83-89: `handleSave` không có error display nếu fetch throw
**File:** `src/app/report/customers/[id]/components/customer-co-borrower-section.tsx` L69-89

`catch { setError("Lỗi kết nối"); }` — catch block đúng nhưng `finally` block thiếu `setSaving(false)`. Nếu `fetch` throw (network error), `saving` state stuck ở `true` → button bị disabled vĩnh viễn cho đến khi unmount.

```ts
// Fix: thêm finally
} catch { setError("Lỗi kết nối"); } finally { setSaving(false); }
```

---

### I7 — `customer-detail-view.tsx` L188-193: useEffect gây infinite loop tiềm năng
**File:** `src/components/customers/customer-detail-view.tsx` L188-193

Effect remapping tab (`activeTab → "loans-credit"`) dùng `setActiveTab` bên trong nhưng dep array chứa `activeTab`. Nếu `isIndividual` là true và tab `"loans"` được set từ ngoài, effect chạy → `setActiveTab("loans-credit")` → `activeTab` thay đổi → effect chạy lại. Vòng lặp kết thúc vì điều kiện `activeTab === "loans"` không còn đúng, nhưng gây 2 render thừa mỗi lần.

---

## MINOR

### M1 — `AiPasteExtractor` thiếu `aria-label` trên toggle button
**File:** `src/components/ui/ai-paste-extractor.tsx` L54-62

Button chỉ có icon + text, nhưng không có `aria-expanded` để screen reader biết trạng thái panel. Thêm `aria-expanded={open}` vào button.

---

### M2 — DRY: `formatDateInput` định nghĩa lặp
**File:** `src/app/report/customers/[id]/components/customer-info-form.tsx` L18-23

Hàm `formatDateInput` được định nghĩa lại ở file này trong khi có thể đã tồn tại ở nơi khác. Nên extract vào `src/lib/format-date-input.ts`.

---

### M3 — `useMappingApi.ts`: `updateStatus` re-created mỗi render
**File:** `src/app/report/khdn/mapping/hooks/useMappingApi.ts` L18-20

```ts
const updateStatus = (...) => useUiStore.getState().setStatus(updates);
```
Không phải `useCallback`, không phải constant — recreated mỗi render. Không gây bug vì không trong dep array nhưng pattern không nhất quán. Extract ra ngoài hook hoặc `useCallback`.

---

### M4 — `customer-new-form.tsx`: không có `AiPasteExtractor` dù `customer-info-form.tsx` (edit) có
**File:** `src/components/customers/customer-new-form.tsx`

Form tạo mới KHCN/KHDN không có AI paste extractor trong khi form edit có. DX không nhất quán — user phải tạo rồi vào edit để dùng AI fill.

---

### M5 — `useAutoTagging.ts`: `state.file` trong dep của `analyzeDocument` tạo closure mới mỗi khi file thay đổi nhưng `applyTags` không sync
**File:** `src/app/report/khdn/mapping/hooks/useAutoTagging.ts` L111-159

`applyTags` dùng `state.suggestions`, `state.accepted`, `state.docxPath` trực tiếp từ closure. Nếu state thay đổi giữa call, các giá trị stale. Pattern `useReducer` hoặc `useRef` cho state sẽ an toàn hơn.

---

## Edge Cases Found by Scout

1. **KHCN new form — `customer_type`**: Form dùng `customerType` prop để phân nhánh field. Nếu API tạo khách hàng không validate `customer_type`, KHCN user có thể POST `customer_type: "corporate"` bằng cách modify request.
2. **AI paste extractor — oversized paste**: Không có giới hạn ký tự trên textarea. Large paste (>100KB) sẽ gửi lên `/api/ai/extract-text` nguyên vẹn — có thể gây timeout/413 tùy API config.
3. **Race: `useMappingEffects` + `useAutoSaveSnapshot`**: AutoSave chạy sau 5s. Nếu loadData chưa xong mà snapshot trigger, `fieldCatalog.length=0` được snapshot → khi restore sẽ xóa catalog.

---

## Positive Observations

- `useOcrStore`: lazy import để tránh circular ref là pattern tốt, có comment rõ.
- `useAutoSaveSnapshot`: hash diff trước khi POST tránh spam request — đúng.
- `customer-detail-view.tsx` L239-247: handle non-JSON response (413, gateway error) rõ ràng — tốt.
- `AiPasteExtractor`: collapse + clear sau extract thành công — UX tốt.
- Collateral form: auto-enable "nhà gắn liền với đất" khi AI fill house fields — smart UX.

---

## Metrics

- `any` usage: 3 explicit (`handleApplyBkImport`, `runSmartAutoBatch`, `versions`) — trong mapping hooks
- eslint-disable-next-line react-hooks/exhaustive-deps: 3 instances trong `useMappingEffects.ts`
- Files >200 LOC: `customer-detail-view.tsx` (~391 LOC), `collateral-form.tsx` (~400+ LOC), `useAiOcrActions.ts` (~292 LOC)

---

## Recommended Actions (Priority Order)

1. **[C1]** Fix `collateral-form.tsx` `handleSave` — check `res.ok`, show error, không gọi `onSaved()` khi thất bại.
2. **[I6]** Thêm `finally { setSaving(false) }` vào `co-borrower handleSave`.
3. **[I3]** Thêm `AbortController` vào `AiPasteExtractor.handleExtract`; type `onExtracted` đúng thay vì `any`.
4. **[I5]** Thêm request cancellation (AbortController hoặc version counter) trong `useMappingEffects` khi customer change.
5. **[I4]** Thêm abort mechanism vào `useAutoTagging.analyzeDocument`.
6. **[C2]** Refactor `useMappingEffects` empty-dep effects — dùng ref pattern thay vì eslint-disable.
7. **[M4]** Xem xét thêm `AiPasteExtractor` vào `customer-new-form.tsx` cho nhất quán.

---

## Unresolved Questions

1. `useOcrStore.reset()` có được gọi khi user chuyển customer không? Nếu không, OCR suggestions của customer cũ còn đó khi chuyển sang customer mới.
2. `/api/ai/extract-text` có giới hạn request body size không? Textarea không có `maxLength`.
3. `eslint-disable react-hooks/exhaustive-deps` trong `useMappingEffects` — có phải cố ý để chỉ chạy once-on-mount không? Nếu vậy nên document rõ hơn.
