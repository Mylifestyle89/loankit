# Báo cáo chẩn đoán: Slow Render — Next.js App

**Ngày:** 2026-03-09
**Phạm vi:** `src/app/`, `src/components/`, `next.config.ts`, Tailwind v4, framer-motion, eigenpal CSS
**Mức độ:** Medium-High

---

## Tóm tắt điều hành

App render chậm có nguyên nhân KHÔNG phải từ Tailwind CSS hay `styles.css` của eigenpal (chỉ 22.5 KB, 279 rules — nhỏ). Root cause chính nằm ở **kiến trúc render của MappingPage** với nhiều anti-pattern gộp lại tạo ra re-render dây chuyền khi user tương tác. Sidebar layout (`report/layout.tsx`) cũng gây animation overhead liên tục.

---

## Phân tích chi tiết

### 1. CSS / Tailwind — KHÔNG phải vấn đề chính

| Thứ | Kết quả |
|-----|---------|
| `@eigenpal/docx-js-editor/dist/styles.css` | 22.5 KB, 1 dòng minified, 279 rules — nhỏ, không gây lag |
| `globals.css` | ~500 dòng, hợp lý |
| Tailwind v4 content scanning | Không có `tailwind.config.ts` riêng → v4 tự scan theo `@import "tailwindcss"`, không misconfigure |
| `@theme inline` backward-compat aliases | 20+ alias vars (coral-tree, blue-chill → indigo) — overhead negligible |

**Kết luận CSS:** Không phải nguyên nhân slow render.

---

### 2. CRITICAL — `FieldCatalogBoard.tsx` key prop huỷ cả component tree

**File:** `src/app/report/mapping/components/FieldCatalogBoard.tsx`, dòng 97

```tsx
<motion.div
  key={fieldCatalog.map((f) => f.field_key).join("|")}
  ...
>
```

**Vấn đề nghiêm trọng nhất:** Mỗi lần `fieldCatalog` thay đổi (bao gồm cả khi user nhập value vào 1 field), key `join("|")` sẽ thay đổi → React **unmount toàn bộ** `motion.div` và **mount lại từ đầu**. Điều này destroy và re-create tất cả:
- Toàn bộ `FieldRow` components (có thể hàng chục)
- DndContext + SortableContext
- `react-resizable-panels` Group/Panel
- Tất cả DOM nodes bên trong

**Độ nghiêm trọng:** CRITICAL. Đây là nguyên nhân chính gây render lag.

**Fix:** Chỉ dùng key khi thực sự cần reset animation (ví dụ khi load template mới, không phải mỗi khi value thay đổi). Có thể dùng `templateId` hoặc `fieldCatalog.length` thay vì join toàn bộ keys.

---

### 3. HIGH — `MappingPageContent` là 1 component khổng lồ không được memo hóa

**File:** `src/app/report/mapping/page.tsx`

- Component subscribe tới **7 stores** (useMappingDataStore, useOcrStore, useUiStore, useCustomerStore, useFieldTemplateStore, useGroupUiStore, useUndoStore) trực tiếp trong 1 component duy nhất.
- Mỗi store update (ví dụ OCR log append, saving status) → toàn bộ `MappingPageContent` re-render.
- Có **~50 state selectors** trong 1 component, dẫn đến re-render khi bất kỳ field nào trong bất kỳ store nào thay đổi.
- Không có `React.memo`, `useMemo` cho callback props truyền xuống `MappingVisualSection` → tất cả children nhận props mới mỗi render.

**Ví dụ anti-pattern (inline arrow functions trong JSX):**
```tsx
onOpenFinancialAnalysis={() => { ... }}  // tạo function mới mỗi render
onToggleSidebar={toggleSidebar}
saveEditedFieldTemplate={() => void saveEditedFieldTemplate()}  // wrapper không memoized
onAcceptOcrSuggestion={(fk) => void useOcrStore.getState().acceptSuggestion(fk)}
```

---

### 4. HIGH — `confidenceByField` và `sampleByField` recompute cho toàn bộ `fieldCatalog` mỗi lần `values` thay đổi

**File:** `src/app/report/mapping/hooks/useMappingComputed.ts`

```ts
const effectiveValues = useMemo(
  () => computeEffectiveValues({ values, formulas, fieldCatalog }),
  [values, formulas, fieldCatalog],
);

const sampleByField = useMemo(..., [effectiveValues, fieldCatalog]);
const confidenceByField = useMemo(..., [effectiveValues, fieldCatalog]);
```

Khi user nhập 1 ký tự vào 1 field → `values` thay đổi → `effectiveValues` recompute toàn bộ → `sampleByField` và `confidenceByField` recompute toàn bộ catalog → tất cả `FieldRow` nhận props mới → re-render. Nếu catalog có 100+ fields thì đây là tính toán O(n) mỗi keystroke.

`FieldRow` có `memo()` nhưng vô hiệu vì tất cả props object/function thay đổi.

---

### 5. HIGH — Sidebar layout dùng `framer-motion` cho mỗi mouseenter/mouseleave

**File:** `src/app/report/layout.tsx`

```tsx
<motion.aside
  onMouseEnter={() => setHovered(true)}
  onMouseLeave={() => setHovered(false)}
  animate={{ width: hovered ? SIDEBAR_EXPANDED : SIDEBAR_COLLAPSED }}
  transition={sidebarSpring}
  ...>
```

- Mỗi `setHovered(true/false)` → re-render toàn bộ `ReportLayout`.
- `ReportLayout` chứa `children` (MappingPage) → children KHÔNG bị re-render vì `children` là prop stable, nhưng toàn bộ sidebar DOM + 8 nav links + `AnimatePresence` blocks đều re-render.
- Có **9 `AnimatePresence` + `motion.span` blocks** bên trong sidebar (1 per nav link + brand + AI CTA + language + logout).
- Mỗi hover event tạo animation cho tất cả 9 blocks cùng lúc.

---

### 6. MEDIUM — `MappingCanvas` dùng `motion.path` với `spring` animation có `delay: index * 0.06`

**File:** `src/app/report/mapping/components/MappingCanvas.tsx`

```tsx
transition={{
  pathLength: { type: "spring", stiffness: 120, damping: 20, delay: index * 0.06 },
  opacity: { duration: 0.3, delay: index * 0.06 },
}}
```

Nếu có nhiều mapping links (N links), framer-motion phải chạy N spring animations song song với delay tăng dần → layout thrashing tiềm ẩn khi có scroll events + `useLayoutEffect` recalculate đồng thời.

---

### 7. MEDIUM — `FieldCatalogBoard` KHÔNG được memo hóa

**File:** `src/app/report/mapping/components/FieldCatalogBoard.tsx`

Component này nhận hơn **30 props** nhưng không có `React.memo`. Mỗi re-render của `MappingVisualSection` (vốn không memo) → `FieldCatalogBoard` re-render → toàn bộ `FieldRow` loop chạy lại dù `FieldRow` có memo (vì inline functions).

---

### 8. LOW — `useLanguage()` trong nhiều components gây re-render khi đổi locale

`LanguageProvider` tạo `t` function mới mỗi lần locale đổi (useMemo stable, OK). Tuy nhiên, component như `FieldCatalogBoard` gọi `t(...)` 29 lần inline trong JSX → không phải bottleneck chính nhưng tạo string allocations không cần thiết.

---

### 9. LOW — `eigenpal/docx-js-editor` import styles.css ở root layout

**File:** `src/app/layout.tsx`, dòng 6

```tsx
import "../../node_modules/@eigenpal/docx-js-editor/dist/styles.css";
```

CSS này được load trên **mọi trang**, kể cả login page, customers, loans... trong khi chỉ cần thiết khi mở `DocxTemplateEditorModal`. Nên move import vào component `DocxTemplateEditorModal` hoặc dùng dynamic import.

---

## Khuyến nghị theo mức độ ưu tiên

### P0 — Fix ngay (root cause)

1. **Sửa key prop trong `FieldCatalogBoard`:**
   ```tsx
   // Thay vì:
   key={fieldCatalog.map((f) => f.field_key).join("|")}
   // Dùng:
   key={`board-${fieldCatalog.length}-${selectedTemplateId}`}
   // hoặc track templateId riêng
   ```

### P1 — Cao

2. **Tách `MappingPageContent` thành sub-components nhỏ** — mỗi sub-component chỉ subscribe đúng store cần thiết. Ví dụ: `MappingStatusSection`, `MappingBodySection`, v.v.

3. **Memoize callback props** trong `MappingPageContent` bằng `useCallback`:
   ```tsx
   const handleOpenFinancialAnalysis = useCallback(() => { ... }, [selectedCustomerId]);
   const handleSaveEditedFieldTemplate = useCallback(() => void saveEditedFieldTemplate(), [saveEditedFieldTemplate]);
   ```

4. **Wrap `FieldCatalogBoard` và `MappingVisualSection` với `React.memo`.**

5. **Debounce `onFieldLabelChange`** — hiện tại không có debounce, mỗi keystroke khi sửa label → cập nhật `fieldCatalog` state → toàn bộ computed chain chạy lại.

### P2 — Trung bình

6. **Giảm AnimatePresence trong sidebar** — dùng CSS `opacity/transform` transition thay vì framer-motion cho 8 nav label items.

7. **Move eigenpal CSS import** vào `DocxTemplateEditorModal` thay vì root layout.

8. **Dùng `React.memo` + custom `areEqual`** cho `FieldRow` để bỏ qua re-render khi chỉ `confidenceByField`/`sampleByField` của các field khác thay đổi.

### P3 — Thấp

9. Xem xét virtualization (react-virtual) cho danh sách fields nếu catalog > 200 items.

10. Lazy import framer-motion trong modals không cần mở ngay (AiMappingModal, FinancialAnalysisModal...).

---

## Tổng kết

| # | Vấn đề | Ảnh hưởng | Effort fix |
|---|--------|-----------|------------|
| 1 | `key` prop destroy/recreate toàn bộ board | CRITICAL | Thấp (1 dòng) |
| 2 | `MappingPageContent` monolith + 50 selectors | Cao | Trung bình |
| 3 | `confidenceByField`/`sampleByField` recompute mỗi keystroke | Cao | Thấp |
| 4 | Inline arrow functions vô hiệu hóa memo | Cao | Thấp |
| 5 | Sidebar hover animation 9 motion blocks | Trung bình | Thấp |
| 6 | `MappingCanvas` spring delays | Trung bình | Thấp |
| 7 | Eigenpal CSS ở root layout | Thấp | Thấp |

---

## Câu hỏi chưa giải quyết

1. `selectedTemplateId` hay identifier nào là stable nhất để dùng thay thế key join trong `FieldCatalogBoard`? Cần kiểm tra flow khi user switch template.
2. `computeEffectiveValues` trong `formula-processor.ts` có phức tạp O(n²) không? Cần đọc thêm để xác nhận độ nặng thực tế.
3. User gặp slow render ở trang nào cụ thể? Nếu là trang `/report/mapping` thì P0-P1 fix là đủ. Nếu ở trang khác (customers, loans) thì cần điều tra thêm.
4. `useCustomerData()` hook trong layout.tsx làm gì? Nếu fetch data mỗi route change thì có thể gây waterfall loading.
